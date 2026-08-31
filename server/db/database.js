const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname);
const DB_FILE = path.join(DB_DIR, 'users.json');

class Database {
  constructor() {
    this.users = new Map(); // id -> user object
    this.usernameIndex = new Map(); // username -> id
    this.tokens = new Map(); // token -> userId
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
        console.log(`📦 Loaded ${this.users.size} users from database.`);
      } catch (err) {
        console.error('Error reading users database:', err);
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      const data = Array.from(this.users.values());
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving users database:', err);
    }
  }

  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  generateToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, userId);
    return token;
  }

  register({ username, password, displayName, gender = 'male' }) {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, reason: 'Kullanıcı adı en az 3 karakter olmalıdır.' };
    }
    if (!password || password.length < 4) {
      return { success: false, reason: 'Şifre en az 4 karakter olmalıdır.' };
    }
    if (this.usernameIndex.has(cleanUsername)) {
      return { success: false, reason: 'Bu kullanıcı adı zaten kullanılıyor.' };
    }

    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user = {
      id,
      username: cleanUsername,
      displayName: (displayName || username).trim(),
      gender: gender === 'female' ? 'female' : 'male',
      salt,
      passwordHash,
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
    this.usernameIndex.set(cleanUsername, id);
    this.save();

    const token = this.generateToken(id);
    return {
      success: true,
      token,
      user: this.sanitizeUser(user)
    };
  }

  login({ username, password }) {
    const cleanUsername = (username || '').trim().toLowerCase();
    const userId = this.usernameIndex.get(cleanUsername);
    if (!userId) {
      return { success: false, reason: 'Kullanıcı adı veya şifre hatalı.' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, reason: 'Kullanıcı bulunamadı.' };
    }

    const hash = this.hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return { success: false, reason: 'Kullanıcı adı veya şifre hatalı.' };
    }

    user.lastLogin = Date.now();
    this.save();

    const token = this.generateToken(user.id);
    return {
      success: true,
      token,
      user: this.sanitizeUser(user)
    };
  }

  verifyToken(token) {
    if (!token) return null;
    const userId = this.tokens.get(token);
    if (!userId) return null;
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : null;
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
