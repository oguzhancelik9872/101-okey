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

const roomManager = new RoomManager(io);

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Create Room
  socket.on('createRoom', (data, callback) => {
    try {
      const room = roomManager.createRoom({
        hostId: socket.id,
        hostName: data.playerName || 'Oyuncu',
        isPrivate: data.isPrivate !== false,
        mode: data.mode || 'standard',
        targetRounds: data.targetRounds || 3,
        vsBots: data.vsBots === true
      });

      socket.join(room.id);
      socket.roomId = room.id;

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
      console.error('Error creating room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Join Room
  socket.on('joinRoom', (data, callback) => {
    try {
      const { roomId, playerName } = data;
      const result = roomManager.joinRoom(roomId.toUpperCase(), socket.id, playerName);

      if (!result.success) {
        if (callback) callback({ success: false, reason: result.reason });
        return;
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
      console.error('Error joining room:', err);
      if (callback) callback({ success: false, reason: err.message });
    }
  });

  // Quick Match
  socket.on('quickMatch', (data, callback) => {
    try {
      const result = roomManager.findQuickMatch(socket.id, data.playerName);
      if (!result.success) {
        if (callback) callback({ success: false, reason: result.reason });
        return;
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
      const roomId = data.roomId || socket.roomId;
      if (roomId) {
        socket.leave(roomId);
        socket.roomId = null;
        roomManager.handleLeave(roomId, socket.id);
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
