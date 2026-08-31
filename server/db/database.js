const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname);
const DB_FILE = path.join(DB_DIR, 'users.json');

const ALLOWED_PLAYERS = [
  'Akın',
  'Alperen',
  'Efe',
  'Furkan',
  'Memiş',
  'Oğuzhan',
  'Özkan',
  'Yekta'
];

class Database {
  constructor() {
    this.users = new Map(); // id -> user object
    this.usernameIndex = new Map(); // username (lowercase) -> id
    this.tokens = new Map(); // token -> userId
    this.activeSockets = new Map(); // socketId -> username (lowercase)
    this.activeUsers = new Map(); // username (lowercase) -> socketId
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(raw || '[]');
        data.forEach(user => {
          this.users.set(user.id, user);
          this.usernameIndex.set(user.username.toLowerCase(), user.id);
        });
      } catch (err) {
        console.error('Error reading users database:', err);
      }
    }

    // Ensure all 8 predefined players exist in the database
    ALLOWED_PLAYERS.forEach((name, idx) => {
      const uname = name.toLowerCase();
      if (!this.usernameIndex.has(uname)) {
        const id = `usr_${uname}`;
        const user = {
          id,
          username: uname,
          displayName: name,
          gender: 'male',
          avatarIndex: idx % 8,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          stats: {
            gamesPlayed: 0,
            wins: 0,
            totalScore: 0
          },
          currentRoomId: null
        };
        this.users.set(id, user);
        this.usernameIndex.set(uname, id);
      }
    });

    this.save();
    console.log(`📦 Database ready with ${this.users.size} profiles.`);
  }

  save() {
    try {
      const data = Array.from(this.users.values());
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving users database:', err);
    }
  }

  generateToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, userId);
    return token;
  }

  getAvailableNames(currentSocketId = null) {
    return ALLOWED_PLAYERS.map(name => {
      const uname = name.toLowerCase();
      const activeSocketId = this.activeUsers.get(uname);
      const user = this.users.get(this.usernameIndex.get(uname));
      const isSelf = Boolean(activeSocketId && currentSocketId && activeSocketId === currentSocketId);
      const isOnline = Boolean(activeSocketId && !isSelf);

      return {
        name,
        displayName: user ? user.displayName : name,
        gender: user ? user.gender : 'male',
        avatarIndex: user ? user.avatarIndex : 0,
        isOnline,
        isSelf
      };
    });
  }

  selectPlayerName(name, socketId) {
    const clean = (name || '').trim().toLowerCase();
    const matched = ALLOWED_PLAYERS.find(p => p.toLowerCase() === clean);

    if (!matched) {
      return { success: false, reason: 'Geçersiz isim seçildi.' };
    }

    const uname = matched.toLowerCase();
    const existingSocket = this.activeUsers.get(uname);

    // If another socket is actively using this name
    if (existingSocket && existingSocket !== socketId) {
      return { success: false, reason: `${matched} şu anda aktif olarak bağlı.` };
    }

    // Release any previous name this socket held
    this.releaseSocket(socketId);

    // Bind this socket to the chosen name
    this.activeUsers.set(uname, socketId);
    this.activeSockets.set(socketId, uname);

    const userId = this.usernameIndex.get(uname);
    const user = this.users.get(userId);
    user.lastLogin = Date.now();
    this.save();

    const token = this.generateToken(user.id);
    return {
      success: true,
      token,
      user: this.sanitizeUser(user)
    };
  }

  verifyToken(token, socketId = null) {
    if (!token) return null;
    const userId = this.tokens.get(token);
    if (!userId) return null;
    const user = this.users.get(userId);
    if (!user) return null;

    if (socketId) {
      const uname = user.username.toLowerCase();
      this.activeUsers.set(uname, socketId);
      this.activeSockets.set(socketId, uname);
    }

    return this.sanitizeUser(user);
  }

  releaseSocket(socketId) {
    if (!socketId) return;
    if (this.activeSockets.has(socketId)) {
      const uname = this.activeSockets.get(socketId);
      this.activeSockets.delete(socketId);
      if (this.activeUsers.get(uname) === socketId) {
        this.activeUsers.delete(uname);
      }
    }
  }

  logout(userId, socketId = null) {
    if (userId) {
      const user = this.users.get(userId);
      if (user) {
        const uname = user.username.toLowerCase();
        this.activeUsers.delete(uname);
      }
      // Invalidate token
      for (const [token, uid] of this.tokens.entries()) {
        if (uid === userId) {
          this.tokens.delete(token);
        }
      }
    }
    if (socketId) {
      this.releaseSocket(socketId);
    }
  }

  getUser(userId) {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  updateProfile(userId, { displayName, gender, avatarIndex }) {
    const user = this.users.get(userId);
    if (!user) return { success: false, reason: 'Kullanıcı bulunamadı.' };

    if (displayName) {
      user.displayName = displayName.trim().substring(0, 14);
    }
    if (gender) {
      user.gender = gender === 'female' ? 'female' : 'male';
    }
    if (avatarIndex !== undefined && avatarIndex !== null) {
      user.avatarIndex = parseInt(avatarIndex, 10);
    }
    this.save();
    return { success: true, user: this.sanitizeUser(user) };
  }

  updateActiveRoom(userId, roomId) {
    if (!userId) return;
    const user = this.users.get(userId);
    if (user) {
      user.currentRoomId = roomId || null;
      this.save();
    }
  }

  sanitizeUser(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      gender: user.gender || 'male',
      avatarIndex: (user.avatarIndex !== undefined) ? user.avatarIndex : null,
      stats: user.stats || { gamesPlayed: 0, wins: 0 },
      currentRoomId: user.currentRoomId || null
    };
  }
}

module.exports = new Database();
