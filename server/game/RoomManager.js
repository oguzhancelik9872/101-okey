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

  createRoom({ hostId, hostName, isPrivate = false, mode = 'standard', targetRounds = 3, vsBots = false }) {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const game = new OkeyGame(roomId, { mode, targetRounds });
    game.addPlayer(hostId, hostName || 'Oyuncu 1', false);

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

  joinRoom(roomId, playerId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };

    const game = room.game;
    
    // Check if player is reconnecting
    const existingPlayer = game.players.find(p => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.isBot = false;
      return { success: true, room, player: existingPlayer, isRejoin: true };
    }

    if (game.players.length >= 4) {
      // Check if there's a bot slot we can replace
      const botIndex = game.players.findIndex(p => p.isBot);
      if (botIndex !== -1 && game.state === GAME_STATES.WAITING) {
        game.players[botIndex].id = playerId;
        game.players[botIndex].name = playerName || `Oyuncu ${botIndex + 1}`;
        game.players[botIndex].isBot = false;
        return { success: true, room, player: game.players[botIndex] };
      }
      return { success: false, reason: 'Oda tamamen dolu.' };
    }

    const player = game.addPlayer(playerId, playerName || `Oyuncu ${game.players.length + 1}`, false);
    return { success: true, room, player };
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

  startGame(roomId, hostId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };
    if (room.hostId !== hostId) return { success: false, reason: 'Yalnızca oda kurucusu oyunu başlatabilir.' };

    const game = room.game;
    if (game.state !== GAME_STATES.WAITING) return { success: false, reason: 'Oyun zaten başladı.' };

    // Fill remaining spots with bots if needed
    if (game.players.length < 4) {
      game.fillWithBots();
    }

    game.startRound();
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
