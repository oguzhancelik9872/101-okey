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

  getOrCreatePublicRoom() {
    let publicRoom = this.rooms.get('MASA-101');
    const hasActiveHuman = publicRoom && publicRoom.game && publicRoom.game.players.some(p => p && !p.isBot);

    if (!publicRoom || publicRoom.game.state === GAME_STATES.GAME_OVER || (publicRoom.game.state === GAME_STATES.PLAYING && !hasActiveHuman)) {
      if (publicRoom && publicRoom.botInterval) {
        clearInterval(publicRoom.botInterval);
      }
      if (publicRoom && publicRoom.countdownInterval) {
        clearInterval(publicRoom.countdownInterval);
      }
      const roomId = 'MASA-101';
      const game = new OkeyGame(roomId, { mode: 'standard', targetRounds: 1 });
      publicRoom = {
        id: roomId,
        hostId: null,
        game,
        isPrivate: false,
        mode: 'standard',
        targetRounds: 1,
        vsBots: false,
        createdAt: Date.now(),
        botLoopActive: false
      };
      this.rooms.set(roomId, publicRoom);
    }
    return publicRoom;
  }

  getLobbyState() {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    const seats = [0, 1, 2, 3].map(idx => {
      const p = game.players[idx];
      if (!p) return null;
      return {
        id: p.id,
        userId: p.userId,
        name: p.name,
        gender: p.gender || 'male',
        avatarIndex: p.avatarIndex,
        avatarFile: p.avatarFile || null,
        seatIndex: idx,
        isHost: publicRoom.hostId === p.id,
        isBot: p.isBot
      };
    });

    return {
      publicTable: {
        id: publicRoom.id,
        state: game.state,
        playerCount: game.players.filter(Boolean).length,
        countdown: (publicRoom.countdownSeconds !== undefined && publicRoom.countdownSeconds !== null) ? publicRoom.countdownSeconds : null,
        seats,
        hostId: publicRoom.hostId
      }
    };
  }

  startLobbyCountdown(room) {
    if (room.countdownInterval) return;
    room.countdownSeconds = 3;
    this.broadcastLobbyState();

    room.countdownInterval = setInterval(() => {
      const occupied = room.game.players.filter(Boolean).length;
      if (occupied < 4 || room.game.state !== GAME_STATES.WAITING) {
        this.cancelLobbyCountdown(room);
        return;
      }

      room.countdownSeconds--;
      if (room.countdownSeconds > 0) {
        this.broadcastLobbyState();
      } else {
        clearInterval(room.countdownInterval);
        room.countdownInterval = null;
        room.countdownSeconds = null;

        // Start Round automatically after 3 seconds!
        room.game.startRound();
        room.lastBotActionTime = Date.now() - 400;
        this.startBotAutomation(room);
        this.broadcastGameState(room.id);
        this.broadcastLobbyState();
      }
    }, 1000);
  }

  cancelLobbyCountdown(room) {
    if (room && room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
      room.countdownSeconds = null;
      this.broadcastLobbyState();
    }
  }

  broadcastLobbyState() {
    if (this.io) {
      this.io.emit('lobby:stateUpdate', this.getLobbyState());
    }
  }

  createRoom({ hostId, hostName, userId = null, targetSeatIndex = null, gender = null, avatarIndex = null, isPrivate = false, mode = 'standard', targetRounds = 3, vsBots = false }) {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const game = new OkeyGame(roomId, { mode, targetRounds });
    game.addPlayer(hostId, hostName || 'Oyuncu 1', false, gender, userId, targetSeatIndex, avatarIndex);

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

    this.broadcastLobbyState();
    return room;
  }

  createBotRoom({ hostId, hostName, userId = null, gender = null, avatarIndex = null }) {
    return this.createRoom({
      hostId,
      hostName: hostName || 'Oyuncu',
      userId,
      gender,
      avatarIndex,
      isPrivate: true,
      mode: 'standard',
      targetRounds: 1,
      vsBots: true
    });
  }

  joinRoom(roomId, playerId, playerName, userId = null, targetSeatIndex = null, gender = null, avatarIndex = null) {
    let room = this.rooms.get(roomId);
    if (!room && (roomId === 'MASA-101' || !roomId)) {
      room = this.getOrCreatePublicRoom();
    }
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };

    const game = room.game;
    
    // Check if player is reconnecting (by userId or socketId)
    const existingPlayer = game.players.find(p => p && ((userId && p.userId === userId) || p.id === playerId));
    if (existingPlayer) {
      existingPlayer.id = playerId;
      existingPlayer.isBot = false;
      if (gender) existingPlayer.gender = gender;
      if (avatarIndex !== undefined && avatarIndex !== null) existingPlayer.avatarIndex = avatarIndex;
      if (!room.hostId || room.hostId === existingPlayer.userId || existingPlayer.seatIndex === 0) {
        room.hostId = playerId;
      }
      this.broadcastLobbyState();
      return { success: true, room, player: existingPlayer, isRejoin: true };
    }

    // If game has already started and player was not in it, do not allow joining
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun şu an devam ediyor. Lütfen bitmesini bekleyin.' };
    }

    const occupiedCount = game.players.filter(Boolean).length;
    if (occupiedCount >= 4) {
      return { success: false, reason: 'Masa tamamen dolu.' };
    }

    const player = game.addPlayer(playerId, playerName || `Oyuncu`, false, gender, userId, targetSeatIndex, avatarIndex);
    if (!player) {
      return { success: false, reason: 'Seçilen koltuk dolu.' };
    }

    if (!room.hostId) {
      room.hostId = playerId;
    }

    // If all 4 seats are now filled, start 3-second countdown!
    if (game.players.filter(Boolean).length === 4 && game.state === GAME_STATES.WAITING) {
      this.startLobbyCountdown(room);
    }

    this.broadcastLobbyState();
    return { success: true, room, player };
  }

  switchSeat(socketId, newSeatIndex, userId = null) {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun başladıktan sonra koltuk değiştirilemez.' };
    }

    this.cancelLobbyCountdown(publicRoom);

    if (newSeatIndex < 0 || newSeatIndex > 3 || game.players[newSeatIndex]) {
      return { success: false, reason: 'Seçtiğiniz koltuk dolu veya geçersiz.' };
    }

    const currentSeatIdx = game.players.findIndex(p => p && ((userId && p.userId === userId) || p.id === socketId));
    if (currentSeatIdx === -1) {
      return { success: false, reason: 'Masada oturmuyorsunuz.' };
    }

    const player = game.players[currentSeatIdx];
    player.id = socketId;
    player.seatIndex = newSeatIndex;
    game.players[currentSeatIdx] = null;
    game.players[newSeatIndex] = player;

    this.broadcastLobbyState();
    return { success: true, seatIndex: newSeatIndex };
  }

  leaveSeat(socketId, userId = null) {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun başladıktan sonra ayrılamazsınız.' };
    }

    this.cancelLobbyCountdown(publicRoom);

    const currentSeatIdx = game.players.findIndex(p => p && ((userId && p.userId === userId) || p.id === socketId));
    if (currentSeatIdx !== -1) {
      game.players[currentSeatIdx] = null;
      if (publicRoom.hostId === socketId || (userId && publicRoom.hostId === userId)) {
        const next = game.players.find(p => p && !p.isBot);
        publicRoom.hostId = next ? next.id : null;
      }
      // If no human players remain at the table, remove all bots and completely reset!
      const remainingHumans = game.players.filter(p => p && !p.isBot);
      if (remainingHumans.length === 0) {
        game.players = [null, null, null, null];
        publicRoom.hostId = null;
      }
      this.broadcastLobbyState();
      return { success: true };
    }
    return { success: false, reason: 'Masada oturmuyorsunuz.' };
  }

  addBotToSeat(socketId, seatIndex, userId = null) {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun başladıktan sonra bot eklenemez.' };
    }

    const isMember = game.players.some(p => p && ((userId && p.userId === userId) || p.id === socketId));
    if (!isMember) {
      return { success: false, reason: 'Yalnızca masadaki oyuncular bot ekleyebilir.' };
    }

    if (seatIndex < 0 || seatIndex > 3 || game.players[seatIndex]) {
      return { success: false, reason: 'Seçilen koltuk dolu veya geçersiz.' };
    }

    const bot = game.addSingleBot(seatIndex);
    if (!bot) {
      return { success: false, reason: 'Bot eklenemedi.' };
    }

    // If 4 players are now present, start 3-second countdown!
    if (game.players.filter(Boolean).length === 4 && game.state === GAME_STATES.WAITING) {
      this.startLobbyCountdown(publicRoom);
    }

    this.broadcastLobbyState();
    return { success: true, bot };
  }

  fillAllBots(socketId, userId = null) {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun başladıktan sonra bot eklenemez.' };
    }

    const isMember = game.players.some(p => p && ((userId && p.userId === userId) || p.id === socketId));
    if (!isMember) {
      return { success: false, reason: 'Yalnızca masadaki oyuncular bot ekleyebilir.' };
    }

    for (let i = 0; i < 4; i++) {
      if (!game.players[i]) {
        game.addSingleBot(i);
      }
    }

    // If 4 players are now present, start 3-second countdown!
    if (game.players.filter(Boolean).length === 4 && game.state === GAME_STATES.WAITING) {
      this.startLobbyCountdown(publicRoom);
    }

    this.broadcastLobbyState();
    return { success: true };
  }

  removeBotFromSeat(socketId, seatIndex, userId = null) {
    const publicRoom = this.getOrCreatePublicRoom();
    const game = publicRoom.game;
    if (game.state !== GAME_STATES.WAITING) {
      return { success: false, reason: 'Oyun başladıktan sonra bot kaldırılamaz.' };
    }

    this.cancelLobbyCountdown(publicRoom);

    const isMember = game.players.some(p => p && ((userId && p.userId === userId) || p.id === socketId));
    if (!isMember) {
      return { success: false, reason: 'Yalnızca masadaki oyuncular bot kaldırabilir.' };
    }

    if (seatIndex < 0 || seatIndex > 3 || !game.players[seatIndex] || !game.players[seatIndex].isBot) {
      return { success: false, reason: 'Seçilen koltukta bot bulunmuyor.' };
    }

    game.players[seatIndex] = null;
    this.broadcastLobbyState();
    return { success: true };
  }

  reconnectPlayer(roomId, newSocketId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı veya oyun sona erdi.' };

    const game = room.game;
    if (game.state !== GAME_STATES.PLAYING) {
      return { success: false, reason: 'Oyun henüz başlamamış veya sona ermiş.' };
    }

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
    room.lastBotActionTime = Date.now() - 1000;
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
          room.botPhase = 0;
        }

        const now = Date.now();

        if (player && player.isBot) {
          const elapsed = now - room.lastBotActionTime;
          if (room.botPhase === undefined) room.botPhase = 0;

          // Phase 1: Draw tile at ~1.0s
          if (room.botPhase === 0 && elapsed >= 1000) {
            room.botPhase = 1;
            try {
              game.executeBotDraw(currentIdx);
            } catch (drawErr) {
              console.error('[RoomManager] Bot draw error:', drawErr);
            }
            this.broadcastGameState(room.id);
          }
          // Phase 2: Open melds / process tiles at ~2.8s
          else if (room.botPhase === 1 && elapsed >= 2800) {
            room.botPhase = 2;
            const hadMelds = game.tableMelds ? game.tableMelds.length : 0;
            try {
              game.executeBotPlay(currentIdx);
            } catch (playErr) {
              console.error('[RoomManager] Bot play error:', playErr);
            }
            if ((game.tableMelds && game.tableMelds.length > hadMelds) || game.state !== GAME_STATES.PLAYING) {
              this.broadcastGameState(room.id);
            }
          }
          // Phase 3: Discard tile at ~4.8s (completing 5s human-paced turn)
          else if (room.botPhase === 2 && elapsed >= 4800) {
            room.botPhase = 0;
            room.lastBotActionTime = now;
            try {
              game.executeBotDiscard(currentIdx);
            } catch (discardErr) {
              console.error('[RoomManager] Bot discard error:', discardErr);
            }
            this.broadcastGameState(room.id);
          }
        } else {
          // Inactive human player watchdog (30 seconds based on game.turnStartTime)
          const turnStart = game.turnStartTime || room.turnStartTime || now;
          const turnDur = game.turnDuration || 30000;
          if (now - turnStart >= turnDur) {
            game.turnStartTime = now;
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

  handleVoteRematch(roomId, socketId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, reason: 'Oda bulunamadı.' };

    const game = room.game;
    if (game.state !== GAME_STATES.GAME_OVER) {
      return { success: false, reason: 'Oyun henüz bitmedi.' };
    }

    if (!room.rematchVotes) room.rematchVotes = new Set();
    room.rematchVotes.add(socketId);

    const humanPlayers = game.players.filter(p => p && !p.isBot);
    const totalHumans = Math.max(1, humanPlayers.length);
    const votedCount = room.rematchVotes.size;

    if (votedCount >= totalHumans) {
      // All human players voted rematch! Restart match with same players & bots
      room.rematchVotes.clear();
      game.resetForNewMatch();
      this.broadcastGameState(roomId);
      if (room.triggerBotStep) room.triggerBotStep();
      this.io.to(roomId).emit('rematchStarted');
      return { success: true, restarted: true };
    } else {
      // Broadcast vote status to all players in the room
      this.io.to(roomId).emit('rematchVoteUpdate', {
        votedCount,
        totalHumans,
        voters: Array.from(room.rematchVotes)
      });
      return { success: true, restarted: false, votedCount, totalHumans };
    }
  }

  handleLeave(roomId, playerId, userId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.cancelLobbyCountdown(room);

    if (room.vsBots || room.isPrivate || (room.hostId === playerId && room.isPrivate)) {
      if (room.botInterval) clearInterval(room.botInterval);
      this.rooms.delete(roomId);
      this.broadcastLobbyState();
      return;
    }

    const playerIndex = room.game.players.findIndex(p => p && ((userId && p.userId === userId) || p.id === playerId));
    if (playerIndex !== -1) {
      if (room.game.state === GAME_STATES.WAITING) {
        room.game.players[playerIndex] = null;
        if (room.hostId === playerId || (userId && room.hostId === userId)) {
          const nextPlayer = room.game.players.find(p => p && !p.isBot);
          room.hostId = nextPlayer ? nextPlayer.id : null;
        }
        // If no human players left, clean up all bots and reset
        const remainingHumans = room.game.players.filter(p => p && !p.isBot);
        if (remainingHumans.length === 0) {
          room.game.players = [null, null, null, null];
          room.hostId = null;
        }
      } else {
        const leavingPlayer = room.game.players[playerIndex];
        if (leavingPlayer) {
          const rawName = leavingPlayer.name.replace(/\s*\(Bot\)/gi, '').trim();
          leavingPlayer.name = `${rawName} (Bot)`;
          leavingPlayer.isBot = true;
        }
        // If all humans left the active game, destroy room
        const remainingHumans = room.game.players.filter(p => p && !p.isBot);
        if (remainingHumans.length === 0) {
          if (room.botInterval) clearInterval(room.botInterval);
          this.rooms.delete(roomId);
          this.broadcastLobbyState();
          return;
        }
      }
      room.game.addLog(`Oyuncu masadan ayrıldı.`);
      this.broadcastGameState(roomId);
      if (room.triggerBotStep) room.triggerBotStep();
    }

    this.broadcastLobbyState();
  }

  handleDisconnect(playerId) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.vsBots && room.hostId === playerId) {
        if (room.botInterval) clearInterval(room.botInterval);
        this.rooms.delete(roomId);
        continue;
      }
      const game = room.game;
      const playerIndex = game.players.findIndex(p => p && p.id === playerId);
      if (playerIndex !== -1) {
        if (game.state === GAME_STATES.WAITING) {
          game.players[playerIndex] = null;
          if (room.hostId === playerId) {
            const nextPlayer = game.players.find(p => p && !p.isBot);
            room.hostId = nextPlayer ? nextPlayer.id : null;
          }
          const remainingHumans = game.players.filter(p => p && !p.isBot);
          if (remainingHumans.length === 0) {
            this.cancelLobbyCountdown(room);
            game.players = [null, null, null, null];
            room.hostId = null;
          }
        } else {
          const leavingPlayer = game.players[playerIndex];
          if (leavingPlayer) {
            const rawName = leavingPlayer.name.replace(/\s*\(Bot\)/gi, '').trim();
            leavingPlayer.name = `${rawName} (Bot)`;
            leavingPlayer.isBot = true;
          }
          const remainingHumans = game.players.filter(p => p && !p.isBot);
          if (remainingHumans.length === 0) {
            if (room.botInterval) clearInterval(room.botInterval);
            this.rooms.delete(roomId);
            this.broadcastLobbyState();
            continue;
          }
          game.addLog(`${game.players[playerIndex].name} bağlantısı koptu (Yapay Zeka devraldı).`);
          if (room.triggerBotStep) room.triggerBotStep();
        }
        this.broadcastGameState(roomId);
      }
    }
    this.broadcastLobbyState();
  }

  broadcastGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || !this.io) return;

    const game = room.game;
    for (let i = 0; i < game.players.length; i++) {
      const p = game.players[i];
      if (p && !p.isBot) {
        const clientState = game.getClientState(i);
        this.io.to(p.id).emit('gameStateUpdate', clientState);
      }
    }
  }

  getPublicRooms() {
    const list = [];
    for (const [roomId, room] of this.rooms.entries()) {
      if (room && !room.isPrivate && !room.vsBots && room.game) {
        const host = room.game.players.find(p => p && p.id === room.hostId) || room.game.players.find(Boolean);
        list.push({
          id: roomId,
          hostName: host ? host.name : 'Host',
          playerCount: room.game.players.filter(Boolean).length,
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
