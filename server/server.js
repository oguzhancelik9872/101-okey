const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const RoomManager = require('./game/RoomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const db = require('./db/database');

const roomManager = new RoomManager(io);

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.join('lobby');
  socket.emit('lobby:stateUpdate', roomManager.getLobbyState());
  socket.emit('auth:namesUpdate', db.getAvailableNames(socket.id));

  socket.on('lobby:join', () => {
    socket.join('lobby');
    socket.emit('lobby:stateUpdate', roomManager.getLobbyState());
    socket.emit('auth:namesUpdate', db.getAvailableNames(socket.id));
  });

  // --- Auth Handlers (Fixed 8 Friends Profile Picker) ---
  socket.on('auth:getAvailableNames', (callback) => {
    if (callback) callback(db.getAvailableNames(socket.id));
  });

  socket.on('auth:selectName', (data, callback) => {
    try {
      const res = db.selectPlayerName(data.name, socket.id);
      if (res.success) {
        socket.userId = res.user.id;
        io.emit('auth:namesUpdate', db.getAvailableNames());
        socket.emit('lobby:stateUpdate', roomManager.getLobbyState());
      }
      if (callback) callback(res);
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  socket.on('auth:autoLogin', (data, callback) => {
    try {
      const user = db.verifyToken(data.token, socket.id);
      if (user) {
        socket.userId = user.id;
        io.emit('auth:namesUpdate', db.getAvailableNames());
        socket.emit('lobby:stateUpdate', roomManager.getLobbyState());
        if (callback) callback({ success: true, user });
      } else {
        if (callback) callback({ success: false, reason: 'Oturum süresi doldu.' });
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  socket.on('auth:logout', (data, callback) => {
    try {
      db.logout(socket.userId, socket.id);
      socket.userId = null;
      io.emit('auth:namesUpdate', db.getAvailableNames());
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false });
    }
  });

  socket.on('auth:updateProfile', (data, callback) => {
    try {
      const uId = data.userId || socket.userId;
      if (!uId) return callback && callback({ success: false, reason: 'Oturum bulunamadı.' });
      const res = db.updateProfile(uId, data);
      if (res.success) {
        io.emit('auth:namesUpdate', db.getAvailableNames());
      }
      if (callback) callback(res);
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Reconnect to active room after F5 / disconnection
  socket.on('reconnectRoom', (data, callback) => {
    try {
      const { roomId, userId } = data;
      const uId = userId || socket.userId;
      const result = roomManager.reconnectPlayer(roomId, socket.id, uId);

      if (!result.success) {
        if (callback) callback({ success: false, reason: result.reason });
        return;
      }

      socket.join(result.room.id);
      socket.roomId = result.room.id;
      if (uId) db.updateActiveRoom(uId, result.room.id);

      if (callback) {
        callback({
          success: true,
          roomId: result.room.id,
          seatIndex: result.seatIndex,
          isHost: result.isHost,
          gameState: result.gameState
        });
      }
    } catch (err) {
      console.error('Error reconnecting to room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Create Room
  socket.on('createRoom', (data, callback) => {
    try {
      const userId = data.userId || socket.userId;
      const room = roomManager.createRoom({
        hostId: socket.id,
        hostName: data.playerName || 'Oyuncu',
        userId: userId,
        targetSeatIndex: data.seatIndex,
        gender: data.gender,
        avatarIndex: data.avatarIndex,
        isPrivate: data.isPrivate !== false,
        mode: data.mode || 'standard',
        targetRounds: data.targetRounds || 3,
        vsBots: data.vsBots === true
      });

      socket.leave('lobby');
      socket.join(room.id);
      socket.roomId = room.id;
      if (userId) db.updateActiveRoom(userId, room.id);

      if (callback) {
        callback({
          success: true,
          roomId: room.id,
          seatIndex: data.seatIndex !== undefined ? data.seatIndex : 0,
          isHost: true
        });
      }

      roomManager.broadcastGameState(room.id);
    } catch (err) {
      console.error('Error creating room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Create Single-player Bot Room
  socket.on('createBotRoom', (data, callback) => {
    try {
      const userId = data.userId || socket.userId;
      const room = roomManager.createBotRoom({
        hostId: socket.id,
        hostName: data.playerName || 'Oyuncu',
        userId,
        gender: data.gender,
        avatarIndex: data.avatarIndex
      });

      socket.leave('lobby');
      socket.join(room.id);
      socket.roomId = room.id;
      if (userId) db.updateActiveRoom(userId, room.id);

      if (callback) {
        callback({
          success: true,
          roomId: room.id,
          seatIndex: 0,
          isHost: true
        });
      }

      roomManager.broadcastGameState(room.id);
    } catch (err) {
      console.error('Error creating bot room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Join Room
  socket.on('joinRoom', (data, callback) => {
    try {
      const { roomId, playerName, userId, seatIndex, gender, avatarIndex } = data;
      const uId = userId || socket.userId;
      const result = roomManager.joinRoom(
        roomId.toUpperCase(),
        socket.id,
        playerName,
        uId,
        seatIndex,
        gender,
        avatarIndex
      );

      if (!result.success) {
        if (callback) callback({ success: false, reason: result.reason });
        return;
      }

      socket.join(result.room.id);
      socket.roomId = result.room.id;
      if (uId && result.room.game.state === 'PLAYING') {
        db.updateActiveRoom(uId, result.room.id);
      } else if (uId) {
        db.updateActiveRoom(uId, null);
      }

      if (callback) {
        callback({
          success: true,
          roomId: result.room.id,
          seatIndex: result.player.seatIndex,
          isHost: result.room.hostId === socket.id
        });
      }

      roomManager.broadcastGameState(result.room.id);
    } catch (err) {
      console.error('Error joining room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Logout
  socket.on('auth:logout', (data) => {
    const uId = (data && data.userId) || socket.userId;
    if (uId) db.updateActiveRoom(uId, null);
    if (socket.roomId) {
      roomManager.handleLeave(socket.roomId, socket.id, uId);
      socket.leave(socket.roomId);
      socket.roomId = null;
    }
    roomManager.leaveSeat(socket.id, uId);
  });

  // Switch Seat in Lobby
  socket.on('lobby:switchSeat', (data, callback) => {
    try {
      const uId = (data && data.userId) || socket.userId;
      const res = roomManager.switchSeat(socket.id, data.targetSeatIndex, uId);
      if (callback) callback(res);
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Leave Seat in Lobby
  socket.on('lobby:leaveSeat', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const uId = (data && data.userId) || socket.userId;
    try {
      const res = roomManager.leaveSeat(socket.id, uId);
      if (uId) db.updateActiveRoom(uId, null);
      if (cb) cb(res);
    } catch (err) {
      if (cb) cb({ success: false, reason: err.message });
    }
  });

  // Add Bot to Seat in Lobby
  socket.on('lobby:addBot', (data, callback) => {
    try {
      const uId = (data && data.userId) || socket.userId;
      const res = roomManager.addBotToSeat(socket.id, data.seatIndex, uId);
      if (callback) callback(res);
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Remove Bot from Seat in Lobby
  socket.on('lobby:removeBot', (data, callback) => {
    try {
      const uId = (data && data.userId) || socket.userId;
      const res = roomManager.removeBotFromSeat(socket.id, data.seatIndex, uId);
      if (callback) callback(res);
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Quick Match
  socket.on('quickMatch', (data, callback) => {
    try {
      const userId = data.userId || socket.userId;
      const result = roomManager.findQuickMatch(socket.id, data.playerName);
      if (!result.success) {
        if (callback) callback({ success: false, reason: result.reason });
        return;
      }

      if (userId) {
        result.player.userId = userId;
        db.updateActiveRoom(userId, result.room.id);
      }

      socket.join(result.room.id);
      socket.roomId = result.room.id;

      if (callback) {
        callback({
          success: true,
          roomId: result.room.id,
          seatIndex: result.player.seatIndex,
          isHost: result.room.hostId === socket.id
        });
      }

      roomManager.broadcastGameState(result.room.id);
    } catch (err) {
      console.error('Error quick matching:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Start Game
  socket.on('startGame', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const res = roomManager.startGame(roomId, socket.id);
      if (callback) callback(res);
      if (res.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Draw Tile
  socket.on('drawTile', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.drawTile(playerIdx, data.source || 'deck');
      if (callback) callback(result);
      this.addLog && this.addLog('');
      if (result.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Return Discard Tile (Taşı Geri Bırak)
  socket.on('returnDiscardTile', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.returnDiscardTile(playerIdx);
      if (callback) callback(result);
      if (result.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Open Hand (Seri)
  socket.on('openHand', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.openHand(playerIdx, data.melds);
      if (callback) callback(result);
      if (result.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Open Pairs (Çift)
  socket.on('openPairs', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.openPairs(playerIdx, data.pairs);
      if (callback) callback(result);
      if (result.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Process Tile onto Table Meld (İşleme)
  socket.on('processTile', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.processTile(playerIdx, data.tileId, data.targetMeldId);
      if (callback) callback(result);
      if (result.success) {
        roomManager.broadcastGameState(roomId);
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Discard Tile
  socket.on('discardTile', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const playerIdx = room.game.players.findIndex(p => p.id === socket.id);
      if (playerIdx === -1) return callback && callback({ success: false, reason: 'Oyuncu bulunamadı.' });

      const result = room.game.discardTile(playerIdx, data.tileId);
      if (callback) callback(result);
      if (result.success) {
        roomManager.broadcastGameState(roomId);
        if (room.triggerBotStep) room.triggerBotStep();
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Next Round
  socket.on('nextRound', (data, callback) => {
    try {
      const roomId = data.roomId || socket.roomId;
      const room = roomManager.rooms.get(roomId);
      if (!room) return callback && callback({ success: false, reason: 'Oda bulunamadı.' });

      const success = room.game.nextRound();
      if (callback) callback({ success });
      if (success) {
        roomManager.broadcastGameState(roomId);
        if (room.triggerBotStep) room.triggerBotStep();
      }
    } catch (err) {
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Chat message
  socket.on('sendChat', (data) => {
    const roomId = data.roomId || socket.roomId;
    if (roomId) {
      io.to(roomId).emit('chatMessage', {
        sender: data.sender || 'Oyuncu',
        text: data.text,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Emoji / Quick Voice reaction
  socket.on('sendReaction', (data) => {
    const roomId = data.roomId || socket.roomId;
    if (roomId) {
      io.to(roomId).emit('playerReaction', {
        seatIndex: data.seatIndex,
        reaction: data.reaction,
        label: data.label
      });
    }
  });

  // Leave Room
  socket.on('leaveRoom', (data, callback) => {
    try {
      const roomId = (data && data.roomId) || socket.roomId;
      const uId = (data && data.userId) || socket.userId;
      if (uId) db.updateActiveRoom(uId, null);
      if (roomId) {
        socket.leave(roomId);
        socket.roomId = null;
        roomManager.handleLeave(roomId, socket.id, uId);
      }
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false });
    }
  });

  // Get public rooms list
  socket.on('getPublicRooms', (callback) => {
    if (callback) {
      callback(roomManager.getPublicRooms());
    }
  });

  // Disconnection
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    db.releaseSocket(socket.id);
    io.emit('auth:namesUpdate', db.getAvailableNames());
    roomManager.handleDisconnect(socket.id);
  });
});

// Health Check endpoint (for Render / pingers)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Wildcard SPA route fallback (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

server.listen(PORT, () => {
  console.log(` 101 Okey Server running on http://localhost:${PORT}`);
});
