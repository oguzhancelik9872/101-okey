const OkeyGame = require('./OkeyGame');
const { GAME_STATES } = require('./Constants');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> { id, hostId, game, isPrivate, targetRounds, mode, timer, botInterval }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom({ hostId, hostName, userId = null, isPrivate = false, mode = 'standard', targetRounds = 3, vsBots = false }) {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const game = new OkeyGame(roomId, { mode, targetRounds });
    game.addPlayer(hostId, hostName || 'Oyuncu 1', false, null, userId);

    if (vsBots) {
      game.fillWithBots();
    }

    const room = {
      id: roomId,
      hostId,
      game,
      isPrivate,
      mode,
      targetRounds,
      vsBots,
      createdAt: Date.now(),
      botLoopActive: false
    };

    this.rooms.set(roomId, room);

    if (vsBots) {
      game.startRound();
      this.startBotAutomation(room);
    }

    return room;
  }

  joinRoom(roomId, playerId, playerName, userId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };

    const game = room.game;
    
    // Check if player is reconnecting (by userId or socketId)
    const existingPlayer = game.players.find(p => (userId && p.userId === userId) || p.id === playerId);
    if (existingPlayer) {
      existingPlayer.id = playerId;
      existingPlayer.isBot = false;
      if (room.hostId === existingPlayer.userId || existingPlayer.seatIndex === 0) {
        room.hostId = playerId;
      }
      return { success: true, room, player: existingPlayer, isRejoin: true };
    }

    if (game.players.length >= 4) {
      // Check if there's a bot slot we can replace
      const botIndex = game.players.findIndex(p => p.isBot);
      if (botIndex !== -1) {
        game.players[botIndex].id = playerId;
        game.players[botIndex].userId = userId || playerId;
        game.players[botIndex].name = playerName || `Oyuncu ${botIndex + 1}`;
        game.players[botIndex].isBot = false;
        game.addLog(`${game.players[botIndex].name} oyuna katıldı.`);
        return { success: true, room, player: game.players[botIndex] };
      }
      return { success: false, reason: 'Oda tamamen dolu.' };
    }

    const player = game.addPlayer(playerId, playerName || `Oyuncu ${game.players.length + 1}`, false, null, userId);

    // If all 4 seats are now filled with human players, automatically start the game!
    if (game.players.length === 4 && game.state === GAME_STATES.WAITING) {
      game.startRound();
      this.startBotAutomation(room);
    }

    return { success: true, room, player };
  }

  reconnectPlayer(roomId, newSocketId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı veya oyun sona erdi.' };

    const game = room.game;
    const player = game.players.find(p => (userId && p.userId === userId) || p.id === userId || p.id === newSocketId);
    if (!player) {
      return { success: false, reason: 'Bu masada size ait bir koltuk bulunamadı.' };
    }

    player.id = newSocketId;
    player.isBot = false;
    if (player.seatIndex === 0) {
      room.hostId = newSocketId;
    }

    game.addLog(`${player.name} masaya geri bağlandı.`);
    this.broadcastGameState(roomId);

    return {
      success: true,
      room,
      seatIndex: player.seatIndex,
      isHost: room.hostId === newSocketId,
      gameState: game.getClientState(player.seatIndex)
    };
  }

  findQuickMatch(playerId, playerName) {
    // Find open public waiting room
    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.isPrivate && !room.vsBots && room.game.state === GAME_STATES.WAITING && room.game.players.length < 4) {
        const joinRes = this.joinRoom(roomId, playerId, playerName);
        if (joinRes.success) return joinRes;
      }
    }

    // Create new public room
    const newRoom = this.createRoom({
      hostId: playerId,
      hostName: playerName,
      isPrivate: false,
      mode: 'standard',
      targetRounds: 3,
      vsBots: false
    });

    return { success: true, room: newRoom, player: newRoom.game.players[0] };
  }

  startGame(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };

    const game = room.game;
    if (game.state !== GAME_STATES.WAITING) return { success: false, reason: 'Oyun zaten başladı.' };

    // Fill remaining spots with bots if needed
    if (game.players.length < 4) {
      game.fillWithBots();
    }

    game.startRound();
    room.lastBotActionTime = Date.now() - 400;
    this.startBotAutomation(room);
    return { success: true, room };
  }

  startBotAutomation(room) {
    if (room.botLoopActive) return;
    room.botLoopActive = true;
    room.lastBotActionTime = Date.now();
    room.turnStartTime = Date.now();
    room.lastObservedTurn = null;

    const executeStep = () => {
      if (!this.rooms.has(room.id)) {
        if (room.botInterval) clearInterval(room.botInterval);
        return;
      }
      const game = room.game;
      if (game.state === GAME_STATES.PLAYING) {
        const currentIdx = game.currentTurn;
        const player = game.players[currentIdx];

        if (room.lastObservedTurn !== currentIdx) {
          room.lastObservedTurn = currentIdx;
          room.turnStartTime = Date.now();
          room.lastBotActionTime = Date.now();
        }

        const now = Date.now();

        if (player && player.isBot) {
          // Bot action delay (~650ms)
          if (now - room.lastBotActionTime >= 650) {
            room.lastBotActionTime = now;
            try {
              game.executeBotTurn();
            } catch (e) {
              console.error('[RoomManager] Bot execution error:', e);
            }
            this.broadcastGameState(room.id);
          }
        } else {
          // Inactive human player watchdog (30 seconds)
          if (now - room.turnStartTime >= 30000) {
            room.turnStartTime = now;
            try {
              game.executeEmergencyTurn(currentIdx);
            } catch (autoErr) {
              console.error('[RoomManager] Inactive player auto-discard error:', autoErr);
            }
            this.broadcastGameState(room.id);
          }
        }
      }
    };

    room.botInterval = setInterval(executeStep, 200);
    room.triggerBotStep = () => {
      executeStep();
    };
    executeStep();
  }

  handleLeave(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.vsBots || room.hostId === playerId) {
      if (room.botInterval) clearInterval(room.botInterval);
      this.rooms.delete(roomId);
      return;
    }

    const player = room.game.players.find(p => p.id === playerId);
    if (player) {
      player.isBot = true;
      room.game.addLog(`${player.name} masadan ayrıldı.`);
      this.broadcastGameState(roomId);
      if (room.triggerBotStep) room.triggerBotStep();
    }
  }

  handleDisconnect(playerId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.vsBots && room.hostId === playerId) {
        this.rooms.delete(roomId);
        continue;
      }
      const game = room.game;
      const player = game.players.find(p => p.id === playerId);
      if (player) {
        // Convert to bot to keep room running smoothly
        player.isBot = true;
        game.addLog(`${player.name} bağlantısı koptu (Yapay Zeka devraldı).`);
        this.broadcastGameState(roomId);
        if (room.triggerBotStep) room.triggerBotStep();
      }
    }
  }

  broadcastGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || !this.io) return;

    const game = room.game;
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[i];
      if (!p.isBot) {
        const clientState = game.getClientState(i);
        this.io.to(p.id).emit('gameStateUpdate', clientState);
      }
    }
  }

  getPublicRooms() {
    const list = [];
    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.isPrivate && !room.vsBots) {
        list.push({
          id: roomId,
          hostName: room.game.players[0] ? room.game.players[0].name : 'Host',
          playerCount: room.game.players.length,
          state: room.game.state,
          mode: room.mode,
          targetRounds: room.targetRounds
        });
      }
    }
    return list;
  }
}

module.exports = RoomManager;
