const Deck = require('./Deck');
const Tile = require('./Tile');
const Validator = require('./Validator');
const BotAI = require('./BotAI');
const { GAME_STATES, GAME_MODES, PENALTIES } = require('./Constants');

class OkeyGame {
  constructor(id, options = {}) {
    this.id = id;
    this.mode = options.mode || GAME_MODES.STANDARD; // standard | folded
    this.targetRounds = options.targetRounds || 1;
    this.currentRound = 1;
    this.state = GAME_STATES.WAITING;

    this.players = [null, null, null, null];
    this.deck = null;
    this.indicator = null;
    this.currentTurn = 0;
    this.turnState = 'DRAW'; // 'DRAW' | 'DISCARD'
    this.firstPlayerIndex = 0;
    
    // Discard piles for each seat (to their right)
    this.discards = [[], [], [], []];
    
    // Opened melds on table: [ { id, playerIndex, type: 'run'|'group'|'pairs', tiles: [Tile, ...], score } ]
    this.tableMelds = [];
    this.tableMeldCounter = 1;

    // Minimum requirement for opening (updated dynamically in folded mode)
    this.minOpenScore = 101;
    this.minOpenPairs = 5;

    // Track drawn tile from discard for mandatory open/process validation
    this.drawnFromDiscard = null; // { playerIndex, tile }

    this.logs = [];
    this.roundResults = null;
    this.matchHistory = [];
    this.onSystemMessage = null;
  }

  _emitSystemMessage(msg) {
    if (typeof this.onSystemMessage === 'function') {
      try {
        this.onSystemMessage(msg);
      } catch (e) {
        console.error('[OkeyGame] Error in onSystemMessage:', e);
      }
    }
  }

  addPlayer(id, name, isBot = false, gender = null, userId = null, preferredSeat = null, avatarIndex = null, avatarFile = null) {
    if (this.players.filter(Boolean).length >= 4) return null;

    let seatIndex = preferredSeat;
    if (seatIndex === null || seatIndex === undefined || this.players[seatIndex]) {
      // Find first empty seat
      for (let i = 0; i < 4; i++) {
        if (!this.players[i]) {
          seatIndex = i;
          break;
        }
      }
    }

    if (seatIndex === null) return null;
    
    const FEMALE_NAMES = new Set([
      'zeynep', 'ayşe', 'fatma', 'elif', 'merve', 'ece', 'selin', 'gizem', 'büşra',
      'derya', 'seda', 'ceren', 'irem', 'ebru', 'gamze', 'melis', 'pınar',
      'tuğba', 'hande', 'aslı', 'burcu', 'damla', 'sinem', 'yasemin',
      'berna', 'kübra', 'hilal', 'melike', 'filiz', 'hülya', 'sevgi', 'songül'
    ]);
    const firstWord = (name || '').trim().toLowerCase().split(' ')[0];
    const detectedGender = gender || (FEMALE_NAMES.has(firstWord) ? 'female' : 'male');

    const player = {
      id,
      userId: userId || id,
      name,
      seatIndex,
      isBot,
      gender: detectedGender,
      avatarIndex: (avatarIndex !== undefined && avatarIndex !== null) ? avatarIndex : null,
      avatarFile: avatarFile || null,
      hand: [],
      opened: false,
      openType: null, // 'seri' | 'pairs'
      openedMelds: [],
      initialOpenScore: 0,
      initialOpenPairs: 0,
      score: 0,           // Total penalty score across rounds (lower is better)
      roundScore: 0,      // Score in current round
      penaltyPoints: 0,   // Accumulated penalty points in current round (+101, +202 etc)
      penalties: []
    };
    if (isBot) {
      const personalitySeed = String(id || name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      player.riskTolerance = 0.25 + ((personalitySeed % 51) / 100);
    }
    this.players[seatIndex] = player;
    return player;
  }

  addSingleBot(preferredSeat = null) {
    const femaleNames = [
      'Zeynep', 'Ayşe', 'Fatma', 'Elif', 'Merve', 'Ece', 'Selin', 'Gizem',
      'Büşra', 'Derya', 'Seda', 'Ceren', 'İrem', 'Ebru', 'Gamze', 'Melis',
      'Pınar', 'Tuğba', 'Hande', 'Aslı', 'Burcu', 'Damla', 'Sinem', 'Yasemin',
      'Berna', 'Kübra', 'Hilal', 'Melike', 'Filiz', 'Hülya', 'Sevgi', 'Songül',
      'Defne', 'Nehir', 'Deniz', 'Duru', 'Yağmur', 'Ada', 'Azra', 'Derin',
      'Gökçe', 'Bade', 'Lara', 'Ela', 'Nisan', 'Irmak', 'Ceyda', 'Simge'
    ];

    const BOT_AVATAR_FILES = ['1.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png'];

    const existingNames = this.players.filter(Boolean).map(p => p.name);
    const available = femaleNames.filter(n => !existingNames.includes(n + ' (Bot)'));
    const baseName = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const fullName = `${baseName} (Bot)`;
    const gender = 'female';

    // Unique avatar photo per game/table
    const usedAvatars = this.players.filter(p => p && p.isBot && p.avatarFile).map(p => p.avatarFile);
    const availableAvatars = BOT_AVATAR_FILES.filter(f => !usedAvatars.includes(f));
    const chosenAvatarFile = (availableAvatars.length > 0)
      ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
      : BOT_AVATAR_FILES[Math.floor(Math.random() * BOT_AVATAR_FILES.length)];

    const avatarIndex = BOT_AVATAR_FILES.indexOf(chosenAvatarFile);
    const botId = `bot_${Date.now()}_${preferredSeat || 0}_${Math.random().toString(36).substring(7)}`;
    return this.addPlayer(botId, fullName, true, gender, null, preferredSeat, avatarIndex, chosenAvatarFile);
  }

  fillWithBots() {
    const femaleNames = [
      'Zeynep', 'Ayşe', 'Fatma', 'Elif', 'Merve', 'Ece', 'Selin', 'Gizem',
      'Büşra', 'Derya', 'Seda', 'Ceren', 'İrem', 'Ebru', 'Gamze', 'Melis',
      'Pınar', 'Tuğba', 'Hande', 'Aslı', 'Burcu', 'Damla', 'Sinem', 'Yasemin',
      'Berna', 'Kübra', 'Hilal', 'Melike', 'Filiz', 'Hülya', 'Sevgi', 'Songül',
      'Defne', 'Nehir', 'Deniz', 'Duru', 'Yağmur', 'Ada', 'Azra', 'Derin',
      'Gökçe', 'Bade', 'Lara', 'Ela', 'Nisan', 'Irmak', 'Ceyda', 'Simge'
    ];

    const BOT_AVATAR_FILES = ['1.png', '5.png', '6.png', '7.png', '8.png', '9.png', '10.png'];
    const usedAvatars = new Set(this.players.filter(p => p && p.isBot && p.avatarFile).map(p => p.avatarFile));

    const existingNames = new Set(this.players.filter(Boolean).map(p => p.name));
    const availableNames = femaleNames.filter(n => !existingNames.has(n + ' (Bot)')).sort(() => Math.random() - 0.5);
    let nIdx = 0;

    for (let i = 0; i < 4; i++) {
      if (!this.players[i]) {
        const baseName = (nIdx < availableNames.length) ? availableNames[nIdx++] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
        const name = `${baseName} (Bot)`;
        const gender = 'female';

        const availableAvatars = BOT_AVATAR_FILES.filter(f => !usedAvatars.has(f));
        const chosenAvatar = (availableAvatars.length > 0)
          ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
          : BOT_AVATAR_FILES[Math.floor(Math.random() * BOT_AVATAR_FILES.length)];
        usedAvatars.add(chosenAvatar);

        const avatarIndex = BOT_AVATAR_FILES.indexOf(chosenAvatar);
        this.addPlayer(`bot_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`, name, true, gender, null, i, avatarIndex, chosenAvatar);
      }
    }
  }

  startRound(starterIndex = null) {
    this.state = GAME_STATES.PLAYING;
    this.deck = new Deck();
    this.deck.shuffle();
    this.indicator = this.deck.pickIndicator();

    this.discards = [[], [], [], []];
    this.tableMelds = [];
    this.tableMeldCounter = 1;
    this.minOpenScore = 101;
    this.minOpenPairs = 5;
    this.drawnFromDiscard = null;
    this.roundResults = null;
    this.otherPlayersEverOpened = false;

    if (starterIndex !== null && starterIndex !== undefined) {
      this.firstPlayerIndex = starterIndex % 4;
    } else if (this.firstPlayerIndex === undefined || this.firstPlayerIndex === null) {
      this.firstPlayerIndex = 0;
    }
    this.currentTurn = this.firstPlayerIndex;
    
    // Deal tiles: first player gets 22, others get 21
    const hands = this.deck.deal(this.firstPlayerIndex);
    for (let i = 0; i < 4; i++) {
      this.players[i].hand = hands[i];
      this.players[i].opened = false;
      this.players[i].openType = null;
      this.players[i].openedMelds = [];
      this.players[i].openedInThisTurn = false;
      this.players[i].hasResetTurnTimerInThisTurn = false;
      this.players[i].initialOpenScore = 0;
      this.players[i].initialOpenPairs = 0;
      this.players[i].roundScore = 0;
      this.players[i].penaltyPoints = 0;
      this.players[i].penalties = [];
    }

    // First player starts directly in DISCARD state because they hold 22 tiles
    this.turnState = 'DISCARD';
    this.turnStartTime = Date.now();
    this.turnDuration = 30000;
    this._saveTurnSnapshot(this.firstPlayerIndex);
    this.addLog(`El ${this.currentRound} başladı! Gösterge: ${this.indicator.getTurkishName(this.indicator)}. Başlayan: ${this.players[this.firstPlayerIndex].name}`);
  }

  addLog(msg) {
    this.logs.push({
      time: new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: msg
    });
    if (this.logs.length > 50) this.logs.shift();
  }

  /**
   * Draw a tile from deck or discard
   */
  drawTile(playerIndex, source = 'deck') {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DRAW') return { success: false, reason: 'Zaten taş çektiniz, taş atmalısınız.' };

    const player = this.players[playerIndex];

    if (source === 'discard') {
      const leftPlayerSeat = (playerIndex + 3) % 4;
      const leftDiscardPile = this.discards[leftPlayerSeat];
      if (!leftDiscardPile || leftDiscardPile.length === 0) {
        return { success: false, reason: 'Yandan alınacak taş yok.' };
      }

      const tile = leftDiscardPile.pop();
      player.hand.push(tile);
      player.hasResetTurnTimerInThisTurn = false;
      this.drawnFromDiscard = { playerIndex, tile };
      this.turnState = 'DISCARD';
      this._saveTurnSnapshot(playerIndex);

      this.addLog(`${player.name} solundaki ${this.players[leftPlayerSeat].name}'in attığı taşı aldı.`);
      return { success: true, tile, source: 'discard' };
    } else {
      // Draw from middle deck
      if (this.deck.remainingCount() === 0) {
        this.endRoundNoWinner();
        return { success: false, reason: 'Deste bitti, el sona erdi.' };
      }

      const tile = this.deck.draw();
      if (!tile) {
        this.endRoundNoWinner();
        return { success: false, reason: 'Deste bitti, el sona erdi.' };
      }

      player.hand.push(tile);
      player.hasResetTurnTimerInThisTurn = false;
      this.drawnFromDiscard = null;
      this.turnState = 'DISCARD';
      this._saveTurnSnapshot(playerIndex);

      this.addLog(`${player.name} desteden taş çekti.`);
      return { success: true, tile, source: 'deck' };
    }
  }

  /**
   * Return a tile drawn from discard back to the discard pile if player cannot open
   */
  returnDiscardTile(playerIndex) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Geri bırakılacak taş yok.' };
    if (!this.drawnFromDiscard || this.drawnFromDiscard.playerIndex !== playerIndex) {
      return { success: false, reason: 'Yandan taş çekmediniz.' };
    }

    const player = this.players[playerIndex];
    const tile = this.drawnFromDiscard.tile;
    const tileIndex = player.hand.findIndex(t => t.id === tile.id);

    if (tileIndex === -1) {
      return { success: false, reason: 'Yandan alınan taş elinizde bulunamadı.' };
    }

    // Remove from player's hand
    player.hand.splice(tileIndex, 1);

    // Return to left player's discard pile
    const leftPlayerSeat = (playerIndex + 3) % 4;
    this.discards[leftPlayerSeat].push(tile);

    // Revert turn state back to DRAW so player can draw from deck
    this.drawnFromDiscard = null;
    this.turnState = 'DRAW';
    this.turnSnapshot = null;

    this.addLog(`${player.name} yandan aldığı taşı geri bıraktı.`);
    return { success: true };
  }

  /**
   * Save a snapshot of the current player's turn state before any modifications (open melds / process tiles)
   */
  _saveTurnSnapshot(playerIndex) {
    const player = this.players[playerIndex];
    if (!player) return;

    this.turnSnapshot = {
      playerIndex,
      hand: player.hand.map(t => new Tile(t.id, t.color, t.number, t.isFake)),
      opened: player.opened,
      openType: player.openType,
      openedMelds: player.openedMelds ? [...player.openedMelds] : [],
      openedInThisTurn: player.openedInThisTurn || false,
      hasResetTurnTimerInThisTurn: player.hasResetTurnTimerInThisTurn || false,
      initialOpenScore: player.initialOpenScore || 0,
      initialOpenPairs: player.initialOpenPairs || 0,
      minOpenScore: this.minOpenScore,
      minOpenPairs: this.minOpenPairs,
      tableMelds: this.tableMelds.map(m => ({
        id: m.id,
        playerIndex: m.playerIndex,
        type: m.type,
        tiles: m.tiles.map(t => new Tile(t.id, t.color, t.number, t.isFake)),
        score: m.score
      })),
      tableMeldCounter: this.tableMeldCounter,
      penalties: this.players.map(p => ({
        penaltyPoints: p.penaltyPoints || 0,
        penalties: p.penalties ? [...p.penalties] : []
      })),
      drawnFromDiscard: this.drawnFromDiscard ? { ...this.drawnFromDiscard } : null,
      modified: false
    };
  }

  /**
   * Undo all open and processing actions done in the current turn before discarding
   */
  undoTurn(playerIndex) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Geri alınacak bir hamle yok.' };
    if (!this.turnSnapshot || !this.turnSnapshot.modified || this.turnSnapshot.playerIndex !== playerIndex) {
      return { success: false, reason: 'Geri alınacak bir hamle bulunamadı.' };
    }

    const player = this.players[playerIndex];
    const snap = this.turnSnapshot;

    // Restore player hand & opened state
    player.hand = snap.hand.map(t => new Tile(t.id, t.color, t.number, t.isFake));
    player.opened = snap.opened;
    player.openType = snap.openType;
    player.openedMelds = snap.openedMelds ? [...snap.openedMelds] : [];
    player.openedInThisTurn = snap.openedInThisTurn;
    player.hasResetTurnTimerInThisTurn = true; // Prevent timer reset abuse within the same turn
    player.initialOpenScore = snap.initialOpenScore;
    player.initialOpenPairs = snap.initialOpenPairs;

    // Restore table minimum open requirements
    this.minOpenScore = snap.minOpenScore || 101;
    this.minOpenPairs = snap.minOpenPairs || 5;

    // Restore table melds
    this.tableMelds = snap.tableMelds.map(m => ({
      id: m.id,
      playerIndex: m.playerIndex,
      type: m.type,
      tiles: m.tiles.map(t => new Tile(t.id, t.color, t.number, t.isFake)),
      score: m.score
    }));
    this.tableMeldCounter = snap.tableMeldCounter;

    // Restore penalties
    for (let i = 0; i < 4; i++) {
      if (this.players[i] && snap.penalties[i]) {
        this.players[i].penaltyPoints = snap.penalties[i].penaltyPoints;
        this.players[i].penalties = [...snap.penalties[i].penalties];
      }
    }

    // Restore drawnFromDiscard
    this.drawnFromDiscard = snap.drawnFromDiscard ? { ...snap.drawnFromDiscard } : null;

    snap.modified = false;
    this.addLog(`↩️ ${player.name} yaptığı açma/işleme hamlelerinden vazgeçti ve elini geri aldı.`);
    return { success: true };
  }

  /**
   * Calculates minimum open requirements for a player based on opponent team openings (Katlamalı Sistem)
   */
  getMinOpenRequirements(playerIndex) {
    const player = this.players[playerIndex];
    if (!player) return { minScore: 101, minPairs: 5 };

    const opponentIndices = playerIndex % 2 === 0 ? [1, 3] : [0, 2];
    let maxOpponentScore = 0;
    let maxOpponentPairs = 0;
    for (const opponentIndex of opponentIndices) {
      const opponent = this.players[opponentIndex];
      if (!opponent || !opponent.opened) continue;
      if (opponent.openType === 'seri') {
        const openingScore = Number(opponent.initialOpenScore) ||
          (opponent.openedMelds || []).reduce((sum, meld) => sum + (Number(meld.score) || 0), 0);
        maxOpponentScore = Math.max(maxOpponentScore, openingScore);
      } else if (opponent.openType === 'pairs') {
        const openingPairs = Number(opponent.initialOpenPairs) ||
          (opponent.openedMelds || []).filter(meld => meld.type === 'pairs').length;
        maxOpponentPairs = Math.max(maxOpponentPairs, openingPairs);
      }
    }
    return {
      minScore: maxOpponentScore > 0 ? maxOpponentScore + 1 : 101,
      minPairs: maxOpponentPairs > 0 ? maxOpponentPairs + 1 : 5
    };
  }

  /**
   * Open Hand with Runs/Groups (Seri Açma)
   * melds: array of tile ID arrays e.g. [['red_1', 'red_2', 'red_3'], ...]
   */
  openHand(playerIndex, meldIdArrays) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Önce taş çekmelisiniz.' };

    const player = this.players[playerIndex];
    if (player.opened && player.openType === 'pairs') {
      return { success: false, reason: 'Çift açtığınız için seri açamazsınız.' };
    }

    // Convert tile IDs to tile instances from player's hand
    const melds = [];
    const usedTileIds = new Set();

    for (const ids of meldIdArrays) {
      const meld = [];
      for (const id of ids) {
        if (usedTileIds.has(id)) {
          return { success: false, reason: 'Bir taş birden fazla perde kullanılamaz.' };
        }
        const tile = player.hand.find(t => t.id === id);
        if (!tile) {
          return { success: false, reason: 'Elinizde olmayan bir taş seçildi.' };
        }
        usedTileIds.add(id);
        meld.push(tile);
      }
      melds.push(meld);
    }

    // If drawn from discard and player wasn't opened, verify the drawn tile is used in the opening melds
    if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex && !player.opened) {
      if (!usedTileIds.has(this.drawnFromDiscard.tile.id)) {
        return { success: false, reason: 'Yandan aldığınız taşı açtığınız perlerde kullanmak zorundasınız.' };
      }
    }

    const reqs = this.getMinOpenRequirements(playerIndex);
    const minRequired = player.opened ? 0 : reqs.minScore;
    const validation = Validator.validateOpening(melds, this.indicator, minRequired);

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Remove tiles from player's hand
    player.hand = player.hand.filter(t => !usedTileIds.has(t.id));

    // Add to table melds
    for (const vMeld of validation.melds) {
      const tableMeld = {
        id: `meld_${this.tableMeldCounter++}`,
        playerIndex,
        type: vMeld.type,
        tiles: vMeld.tiles,
        score: vMeld.score
      };
      this.tableMelds.push(tableMeld);
      player.openedMelds.push(tableMeld);
    }

    const firstTime = !player.opened;
    if (this.players.some((p, idx) => idx !== playerIndex && p.opened)) {
      this.otherPlayersEverOpened = true;
    }

    if (firstTime) {
      player.initialOpenScore = validation.score;
      player.initialOpenPairs = 0;
      player.openedInThisTurn = true;

      // Penalty Rule: If opened using drawn discard tile for the first time AND tile is 5+ -> Discarder gets 10x tile value
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex) {
        const discardTile = this.drawnFromDiscard.tile;
        const leftPlayerSeat = (playerIndex + 3) % 4;
        const discarder = this.players[leftPlayerSeat];
        if (discarder && discardTile) {
          const tileVal = discardTile.getValue(this.indicator);
          if (tileVal >= 5) {
            const penalty = tileVal * 10;
            discarder.penaltyPoints = (discarder.penaltyPoints || 0) + penalty;
            discarder.penalties.push({
              type: 'DISCARDED_TILE_OPENED_SERI',
              points: penalty,
              desc: `Yandan 5+ taş vererek seri açtırma cezası (+${penalty})`
            });
            const pMsg = `⚠️ ${discarder.name} attığı ${discardTile.toString(this.indicator)} taşıyla ${player.name} seri açtığı için +${penalty} ceza puanı aldı!`;
            this.addLog(pMsg);
            this._emitSystemMessage(pMsg);
          }
        }
      }
    }

    if (validation.score >= (this.minOpenScore || 101)) {
      this.minOpenScore = validation.score + 1;
    }

    player.opened = true;
    player.openType = 'seri';

    if (firstTime && validation.score >= 153) {
      const nextOppSeat = (playerIndex + 1) % 4;
      const oppP = this.players[nextOppSeat];
      if (oppP) {
        oppP.penaltyPoints = (oppP.penaltyPoints || 0) + 101;
        oppP.penalties.push({ type: 'OPPONENT_HIGH_OPEN', points: 101, desc: '153+ açılış cezası (+101)' });
        const pMsg = `🔥 ${player.name} ${validation.score} (153+) puanla açtı! Rakip (${oppP.name}) +101 ceza aldı!`;
        this.addLog(pMsg);
        this._emitSystemMessage(pMsg);
      }
    }

    this.drawnFromDiscard = null; // Successfully used

    // Reset turn timer from beginning on open ONLY ONCE per turn
    if (!player.hasResetTurnTimerInThisTurn) {
      player.hasResetTurnTimerInThisTurn = true;
      this.turnStartTime = Date.now();
    }
    if (this.turnSnapshot) this.turnSnapshot.modified = true;

    const openingMessage = `${player.name} ${Math.floor(validation.score / 3)}/${validation.score % 3} ile seri açtı!`;
    this.addLog(openingMessage);
    if (firstTime) this._emitSystemMessage(openingMessage);
    return { success: true, score: validation.score, remainingTilesCount: player.hand.length };
  }

  /**
   * Open Hand with Pairs (Çift Açma)
   * pairIdArrays: array of 2-tile ID arrays e.g. [['r1', 'r2'], ['b1', 'b2'], ...]
   */
  openPairs(playerIndex, pairIdArrays) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Önce taş çekmelisiniz.' };

    const player = this.players[playerIndex];

    // Seri açan oyuncu, masada çift açan başka bir oyuncu yoksa çift açamaz
    if (player.opened && player.openType === 'seri') {
      const hasPairsOnTable = this.tableMelds.some(m => m.type === 'pairs') || this.players.some(p => p && p.opened && p.openType === 'pairs');
      if (!hasPairsOnTable) {
        return { success: false, reason: 'Masada çift açmış bir oyuncu olmadığı sürece seri açan oyuncular çift açamaz.' };
      }
    }

    const pairs = [];
    const usedTileIds = new Set();

    for (const ids of pairIdArrays) {
      const pair = [];
      for (const id of ids) {
        if (usedTileIds.has(id)) {
          return { success: false, reason: 'Bir taş birden fazla çiftte kullanılamaz.' };
        }
        const tile = player.hand.find(t => t.id === id);
        if (!tile) {
          return { success: false, reason: 'Elinizde olmayan bir taş seçildi.' };
        }
        usedTileIds.add(id);
        pair.push(tile);
      }
      pairs.push(pair);
    }

    if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex && !player.opened) {
      if (!usedTileIds.has(this.drawnFromDiscard.tile.id)) {
        return { success: false, reason: 'Yandan aldığınız taşı açtığınız çiftlerde kullanmak zorundasınız.' };
      }
    }

    const reqs = this.getMinOpenRequirements(playerIndex);
    const minRequired = player.opened ? 0 : reqs.minPairs;
    const validation = Validator.validatePairsOpening(pairs, this.indicator, minRequired);

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    player.hand = player.hand.filter(t => !usedTileIds.has(t.id));

    for (const pair of pairs) {
      const tableMeld = {
        id: `meld_${this.tableMeldCounter++}`,
        playerIndex,
        type: 'pairs',
        tiles: pair,
        score: pair[0].getValue(this.indicator) * 2
      };
      this.tableMelds.push(tableMeld);
      player.openedMelds.push(tableMeld);
    }

    const firstTime = !player.opened;
    if (this.players.some((p, idx) => idx !== playerIndex && p.opened)) {
      this.otherPlayersEverOpened = true;
    }

    if (firstTime) {
      player.initialOpenScore = 0;
      player.initialOpenPairs = pairs.length;
      player.openedInThisTurn = true;
      player.opened = true;
      player.openType = 'pairs';

      if (pairs.length >= (this.minOpenPairs || 5)) {
        this.minOpenPairs = pairs.length + 1;
      }

      // Penalty Rule: If opened pairs using drawn discard tile for the first time AND tile is 5+ -> Discarder gets 20x tile value
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex) {
        const discardTile = this.drawnFromDiscard.tile;
        const leftPlayerSeat = (playerIndex + 3) % 4;
        const discarder = this.players[leftPlayerSeat];
        if (discarder && discardTile) {
          const tileVal = discardTile.getValue(this.indicator);
          if (tileVal >= 5) {
            const penalty = tileVal * 20;
            discarder.penaltyPoints = (discarder.penaltyPoints || 0) + penalty;
            discarder.penalties.push({
              type: 'DISCARDED_TILE_OPENED_PAIRS',
              points: penalty,
              desc: `Yandan 5+ taş vererek çift açtırma cezası (+${penalty})`
            });
            const pMsg = `⚠️ ${discarder.name} attığı ${discardTile.toString(this.indicator)} taşıyla ${player.name} çift açtığı için +${penalty} ceza puanı aldı!`;
            this.addLog(pMsg);
            this._emitSystemMessage(pMsg);
          }
        }
      }

      if (pairs.length >= 7) {
        const nextOppSeat = (playerIndex + 1) % 4;
        const oppP = this.players[nextOppSeat];
        if (oppP) {
          oppP.penaltyPoints = (oppP.penaltyPoints || 0) + 101;
          oppP.penalties.push({ type: 'OPPONENT_SEVEN_PAIRS', points: 101, desc: '7+ çift açılış cezası (+101)' });
          const pMsg = `💎 ${player.name} ${pairs.length} (7+) çift açtı! Rakip (${oppP.name}) +101 ceza aldı!`;
          this.addLog(pMsg);
          this._emitSystemMessage(pMsg);
        }
      }
    }

    if (firstTime) {
      this.minOpenPairs = Math.max(this.minOpenPairs, pairs.length + 1);
    }

    this.drawnFromDiscard = null;

    // Reset turn timer from beginning on open ONLY ONCE per turn
    if (!player.hasResetTurnTimerInThisTurn) {
      player.hasResetTurnTimerInThisTurn = true;
      this.turnStartTime = Date.now();
    }
    if (this.turnSnapshot) this.turnSnapshot.modified = true;

    const openingMessage = `${player.name} ${pairs.length} çift açtı!`;
    this.addLog(openingMessage);
    if (firstTime) this._emitSystemMessage(openingMessage);
    return { success: true, count: pairs.length, remainingTilesCount: player.hand.length };
  }

  /**
   * Process a tile into an existing meld on table (İşleme)
   */
  processTile(playerIndex, tileId, targetMeldId) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Önce taş çekmelisiniz.' };

    const player = this.players[playerIndex];
    if (!player.opened) {
      return { success: false, reason: 'Taş işlemek için önce elinizi açmış olmalısınız.' };
    }

    const tile = player.hand.find(t => t.id === tileId);
    if (!tile) return { success: false, reason: 'İşlenecek taş elinizde bulunamadı.' };

    const targetMeld = this.tableMelds.find(m => m.id === targetMeldId);
    if (!targetMeld) return { success: false, reason: 'Hedef per bulunamadı.' };

    const processCheck = Validator.canProcessTile(tile, targetMeld, this.indicator);
    if (!processCheck.canProcess) {
      return { success: false, reason: 'Bu taş seçilen pere işlenemez.' };
    }

    // Remove tile from hand
    player.hand = player.hand.filter(t => t.id !== tileId);
    targetMeld.tiles = processCheck.newTiles;

    if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex && this.drawnFromDiscard.tile.id === tileId) {
      this.drawnFromDiscard = null;
    }

    if (this.turnSnapshot) this.turnSnapshot.modified = true;

    // If an Okey was replaced and retrieved from the table meld!
    if (processCheck.isOkeySteal && processCheck.stolenOkeyTile) {
      player.hand.push(processCheck.stolenOkeyTile);

      // If stolen from an OPPONENT's meld (different team), only that specific meld owner gets +101 penalty!
      // If taken from own team (self or partner), NO penalty!
      const isOpponentMeld = (targetMeld && targetMeld.playerIndex !== undefined && (playerIndex % 2 !== targetMeld.playerIndex % 2));
      if (isOpponentMeld) {
        const meldOwner = this.players[targetMeld.playerIndex];
        if (meldOwner) {
          meldOwner.penaltyPoints = (meldOwner.penaltyPoints || 0) + 101;
          meldOwner.penalties.push({ type: 'OKEY_STOLEN', points: 101, desc: 'Okey kaptırma cezası (+101)' });
          const pMsg = `✨ ${player.name} rakibin perindeki Okey'i aldı! ${meldOwner.name} +101 ceza aldı!`;
          this.addLog(pMsg);
          this._emitSystemMessage(pMsg);
        }
      } else {
        this.addLog(`✨ ${player.name} perdeki Okey'in yerine taş işleyerek OKEY'i eline aldı!`);
      }
    } else {
      this.addLog(`${player.name} masadaki pere taş işledi.`);
    }

    // Check if player has finished all tiles
    if (player.hand.length === 0) {
      this.endRound(playerIndex, false);
      return { success: true, finished: true, okeyStolen: processCheck.isOkeySteal };
    }

    return {
      success: true,
      finished: false,
      okeyStolen: processCheck.isOkeySteal,
      remainingTilesCount: player.hand.length
    };
  }

  /**
   * Discard a tile to end turn
   */
  discardTile(playerIndex, tileId) {
    if (this.state !== GAME_STATES.PLAYING) return { success: false, reason: 'Oyun devam etmiyor.' };
    if (this.currentTurn !== playerIndex) return { success: false, reason: 'Sıra sizde değil.' };
    if (this.turnState !== 'DISCARD') return { success: false, reason: 'Henüz taş çekmediniz.' };

    const player = this.players[playerIndex];
    const tileIndex = player.hand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return { success: false, reason: 'Atılacak taş elinizde yok.' };

    // If player took discard but has not used it (must open, process, or return it)
    if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex) {
      return {
        success: false,
        reason: 'Yandan aldığınız taşı el açarak veya masaya işleyerek kullanmak zorundasınız. Kullanmayacaksanız "Taşı Geri Bırak" butonuna tıklamalısınız.'
      };
    }

    const tile = player.hand.splice(tileIndex, 1)[0];

    // Place into player's discard pile
    this.discards[playerIndex].push(tile);
    this.addLog(`${player.name} ${tile.getTurkishName(this.indicator)} attı.`);

    // Check if player is finishing (El Bitişi - elinde taş kalmadı)
    if (player.hand.length === 0) {
      const isOkeyDiscard = tile.isOkey(this.indicator);
      this.endRound(playerIndex, isOkeyDiscard);
      return { success: true, finished: true, isOkeyDiscard };
    }

    // Turn is ending without finish: reset openedInThisTurn for all players
    for (let i = 0; i < 4; i++) {
      if (this.players[i]) this.players[i].openedInThisTurn = false;
    }

    // Check "Okey Atma" penalty (player discarded an Okey without finishing the hand)
    if (tile.isOkey(this.indicator)) {
      player.penaltyPoints = (player.penaltyPoints || 0) + 101;
      player.penalties.push({ type: 'DISCARDED_OKEY', points: 101, desc: 'Okey atma cezası (+101)' });
      const pMsg = `⚠️ ${player.name} elinde taş varken OKEY attığı için +101 ceza puanı aldı!`;
      this.addLog(pMsg);
      this._emitSystemMessage(pMsg);
    }

    // Check "İşlek Taş Atma" penalty
    const isPlayable = Validator.isPlayableToTable(tile, this.tableMelds, this.indicator);
    // A single discarded tile can trigger only one discard penalty. An Okey can
    // also validate as playable; charging both rules doubled penalties and made
    // long games snowball into implausible multi-thousand totals.
    if (!tile.isOkey(this.indicator) && isPlayable) {
      player.penaltyPoints = (player.penaltyPoints || 0) + 101;
      player.penalties.push({ type: 'DISCARDED_PLAYABLE', points: 101, desc: 'İşlek taş atma cezası (+101)' });
      const pMsg = `⚠️ ${player.name} masaya işlenebilecek işlek bir taş attığı için +101 ceza puanı aldı!`;
      this.addLog(pMsg);
      this._emitSystemMessage(pMsg);
    }

    // Conclude turn and clear snapshot
    player.hasResetTurnTimerInThisTurn = false;
    this.turnSnapshot = null;

    // Check if the deck was exhausted (Son taş çekilmişti ve o son taşı çeken oyuncu artık taşını attı -> Oyun Bitti!)
    if (this.deck && this.deck.remainingCount() === 0) {
      this.endRoundNoWinner();
      return {
        success: true,
        finished: true,
        deckExhausted: true
      };
    }

    // Next turn
    this.currentTurn = (this.currentTurn + 1) % 4;
    this.turnState = 'DRAW';
    this.drawnFromDiscard = null;
    this.turnStartTime = Date.now();
    this.turnDuration = 30000;

    return {
      success: true,
      finished: false,
      nextPlayerIndex: this.currentTurn
    };
  }

  /**
   * Handles hand finish
   */
  endRound(finishingPlayerIndex, isOkeyDiscard = false) {
    if (this.state === GAME_STATES.GAME_OVER) return;
    this.state = GAME_STATES.GAME_OVER;

    const finisher = this.players[finishingPlayerIndex];
    if (!finisher) return;

    // Elden Bitme: No other player has ever opened at the table and finisher opened & finished in this single turn!
    const isEldenBitme = Boolean(finisher.openedInThisTurn && !this.otherPlayersEverOpened);
    const isPairsFinish = finisher.openType === 'pairs';
    
    let finisherPoints = -101;
    if (isEldenBitme) {
      finisherPoints = isOkeyDiscard ? -1212 : -606;
    } else if (isOkeyDiscard) {
      finisherPoints = -202;
    }

    finisher.roundScore = finisherPoints + (finisher.penaltyPoints || 0);
    finisher.score = (finisher.score || 0) + finisher.roundScore;

    const partnerIndex = (finishingPlayerIndex + 2) % 4;
    const roundScores = {};

    for (let i = 0; i < 4; i++) {
      const p = this.players[i];
      if (!p) continue;

      if (i === finishingPlayerIndex) {
        roundScores[p.id] = {
          name: p.name,
          points: p.roundScore,
          basePoints: finisherPoints,
          penaltyPoints: p.penaltyPoints || 0,
          opened: true,
          openType: p.openType,
          handSum: 0,
          isFinisher: true,
          isEldenBitme
        };
        continue;
      }

      if (i === partnerIndex) {
        // Partner of finisher gets 0 penalty from hand + any in-game penalties
        p.roundScore = 0 + (p.penaltyPoints || 0);
        p.score = (p.score || 0) + p.roundScore;
        roundScores[p.id] = {
          name: p.name,
          points: p.roundScore,
          basePoints: 0,
          penaltyPoints: p.penaltyPoints || 0,
          opened: p.opened,
          openType: p.openType,
          handSum: 0,
          isPartner: true
        };
        continue;
      }

      let pPoints = 0;
      let handSum = 0;

      if (!p.opened) {
        // Player never opened:
        // Elden bitme: 404 (with Okey: 808)
        // Standard: 202
        if (isEldenBitme) {
          pPoints = isOkeyDiscard ? 808 : 404;
        } else {
          pPoints = 202;
        }
      } else {
        // Player opened: sum of leftover tiles. If opened as pairs, only their own penalty is 2x
        handSum = p.hand ? p.hand.reduce((sum, t) => sum + (t ? t.getValue(this.indicator) : 0), 0) : 0;
        pPoints = (p.openType === 'pairs') ? (handSum * 2) : handSum;
      }

      p.roundScore = pPoints + (p.penaltyPoints || 0);
      p.score = (p.score || 0) + p.roundScore;
      roundScores[p.id] = {
        name: p.name,
        points: p.roundScore,
        basePoints: pPoints,
        penaltyPoints: p.penaltyPoints || 0,
        opened: p.opened,
        openType: p.openType,
        handSum
      };
    }

    const p0Name = this.players[0] ? this.players[0].name : 'Oyuncu 1';
    const p1Name = this.players[1] ? this.players[1].name : 'Oyuncu 2';
    const p2Name = this.players[2] ? this.players[2].name : 'Oyuncu 3';
    const p3Name = this.players[3] ? this.players[3].name : 'Oyuncu 4';

    const team1Score = (this.players[0] ? this.players[0].roundScore : 0) + (this.players[2] ? this.players[2].roundScore : 0);
    const team2Score = (this.players[1] ? this.players[1].roundScore : 0) + (this.players[3] ? this.players[3].roundScore : 0);
    const isDraw = (team1Score === team2Score);
    const isTeam1Winner = !isDraw && (team1Score < team2Score);
    const isTeam2Winner = !isDraw && (team2Score < team1Score);

    this.roundResults = {
      currentRound: this.currentRound,
      targetRounds: this.targetRounds,
      hasNextRound: false,
      finisher: finisher.name,
      isOkeyDiscard,
      isPairsFinish,
      isEldenBitme,
      isDraw,
      multiplier: isOkeyDiscard ? 2 : 1,
      roundScores,
      teamResults: {
        team1: {
          name: `${p0Name} & ${p2Name}`,
          players: [p0Name, p2Name],
          score: team1Score,
          isWinner: isTeam1Winner
        },
        team2: {
          name: `${p1Name} & ${p3Name}`,
          players: [p1Name, p3Name],
          score: team2Score,
          isWinner: isTeam2Winner
        },
        isDraw
      },
      totalScores: this.players.filter(Boolean).map(p => ({ id: p.id, name: p.name, score: p.score }))
    };

    this.matchHistory = this.matchHistory || [];
    this.matchHistory.push({
      roundNumber: this.currentRound,
      team1Score,
      team2Score,
      finisher: finisher ? finisher.name : null,
      isOkeyDiscard,
      isPairsFinish,
      isEldenBitme,
      isDraw,
      roundScores: { ...roundScores }
    });

    let finishMsg = isEldenBitme
      ? `🚀 ${finisher.name} ELDEN BİTTİ (${finisherPoints} puan)!`
      : `🎉 ${finisher.name} oyunu bitirdi (${finisherPoints} puan).`;
    if (isOkeyDiscard) finishMsg += ' 🔥 OKEY ATTI (2x CEZA)!';
    if (isPairsFinish) finishMsg += ' ✨ ÇİFT BİTTİ!';
    this.addLog(finishMsg);
    if (isDraw) {
      this.addLog(`🤝 Maç Berabere Bitti! (Takım 1: ${team1Score} — Takım 2: ${team2Score})`);
    } else {
      this.addLog(`🏆 Maçın Kazananı: ${isTeam1Winner ? `${p0Name} & ${p2Name}` : `${p1Name} & ${p3Name}`}`);
    }
  }

  endRoundNoWinner() {
    if (this.state === GAME_STATES.GAME_OVER) return;
    this.state = GAME_STATES.GAME_OVER;

    const roundScores = {};

    for (const p of this.players.filter(Boolean)) {
      let pPoints = 0;
      let handSum = 0;
      if (!p.opened) {
        pPoints = 202;
      } else {
        handSum = p.hand ? p.hand.reduce((sum, t) => sum + (t ? t.getValue(this.indicator) : 0), 0) : 0;
        const playerPairsMultiplier = (p.openType === 'pairs') ? 2 : 1;
        pPoints = handSum * playerPairsMultiplier;
      }
      p.roundScore = pPoints + (p.penaltyPoints || 0);
      p.score = (p.score || 0) + p.roundScore;
      roundScores[p.id] = {
        name: p.name,
        points: p.roundScore,
        basePoints: pPoints,
        penaltyPoints: p.penaltyPoints || 0,
        opened: p.opened,
        openType: p.openType,
        handSum
      };
    }

    const p0Name = this.players[0] ? this.players[0].name : 'Oyuncu 1';
    const p1Name = this.players[1] ? this.players[1].name : 'Oyuncu 2';
    const p2Name = this.players[2] ? this.players[2].name : 'Oyuncu 3';
    const p3Name = this.players[3] ? this.players[3].name : 'Oyuncu 4';

    const team1Score = (this.players[0] ? this.players[0].roundScore : 0) + (this.players[2] ? this.players[2].roundScore : 0);
    const team2Score = (this.players[1] ? this.players[1].roundScore : 0) + (this.players[3] ? this.players[3].roundScore : 0);
    const isDraw = (team1Score === team2Score);
    const isTeam1Winner = !isDraw && (team1Score < team2Score);
    const isTeam2Winner = !isDraw && (team2Score < team1Score);

    this.roundResults = {
      currentRound: this.currentRound,
      targetRounds: this.targetRounds,
      hasNextRound: false,
      finisher: null,
      reason: 'Deste bitti',
      isDraw,
      roundScores,
      teamResults: {
        team1: {
          name: `${p0Name} & ${p2Name}`,
          players: [p0Name, p2Name],
          score: team1Score,
          isWinner: isTeam1Winner
        },
        team2: {
          name: `${p1Name} & ${p3Name}`,
          players: [p1Name, p3Name],
          score: team2Score,
          isWinner: isTeam2Winner
        },
        isDraw
      },
      totalScores: this.players.filter(Boolean).map(p => ({ id: p.id, name: p.name, score: p.score }))
    };

    this.matchHistory = this.matchHistory || [];
    this.matchHistory.push({
      roundNumber: this.currentRound,
      team1Score,
      team2Score,
      finisher: null,
      reason: 'Deste bitti',
      isDraw,
      roundScores: { ...roundScores }
    });

    this.addLog(`Deste bitti! Kalan eller sayıldı.`);
    if (isDraw) {
      this.addLog(`🤝 Maç Berabere Bitti! (Takım 1: ${team1Score} — Takım 2: ${team2Score})`);
    } else {
      this.addLog(`🏆 Maçın Kazananı: ${isTeam1Winner ? `${p0Name} & ${p2Name}` : `${p1Name} & ${p3Name}`}`);
    }
  }

  nextRound() {
    return false;
  }

  /**
   * Reset game state and start fresh match with same players & bots
   */
  resetForNewMatch() {
    this.tableMelds = [];
    this.tableMeldCounter = 1;
    this.discards = [[], [], [], []];
    this.drawnFromDiscard = null;
    this.minOpenScore = 101;
    this.minOpenPairs = 5;
    this.roundResults = null;
    // A rematch at the same table is the next hand of the running scorecard.
    // Keep completed hands and cumulative player scores so the centre
    // scoreboard can display and total the previous hand(s).
    this.matchHistory = this.matchHistory || [];
    this.currentRound = this.matchHistory.length + 1;
    this.logs = [];

    // Next match rotates first player counter-clockwise
    this.firstPlayerIndex = (this.firstPlayerIndex + 1) % 4;

    for (const player of this.players) {
      if (player) {
        player.hand = [];
        player.opened = false;
        player.openType = null;
        player.openedMelds = [];
        player.roundScore = 0;
        player.penaltyPoints = 0;
        player.penalties = [];
      }
    }

    this.startRound(this.firstPlayerIndex);
  }

  /**
   * Executes AI logic for bot whose turn it is
   */
  /**
   * Phase 1 of Bot Turn: Draw from discard or deck
   */
  executeBotDraw(botIndex) {
    if (this.state !== GAME_STATES.PLAYING || this.currentTurn !== botIndex || this.turnState !== 'DRAW') {
      return null;
    }
    const bot = this.players[botIndex];
    if (!bot || !bot.isBot) return null;

    try {
      let drawnFromDiscard = false;
      const leftSeat = (botIndex + 3) % 4;
      const leftDiscard = this.discards[leftSeat];

      if (leftDiscard && leftDiscard.length > 0) {
        const topDiscard = leftDiscard[leftDiscard.length - 1];
        const testHand = [...bot.hand, topDiscard];
        const botReqs = this.getMinOpenRequirements(botIndex);

        if (!bot.opened) {
          const best = BotAI.findBestMelds(testHand, this.indicator);
          const usesDiscard = best.melds.some(m => m.some(t => t.id === topDiscard.id));
          if (best.score >= botReqs.minScore && usesDiscard) {
            const drawRes = this.drawTile(botIndex, 'discard');
            if (drawRes && drawRes.success) drawnFromDiscard = true;
          }
        } else {
          const isPlayable = Validator.isPlayableToTable(topDiscard, this.tableMelds, this.indicator);
          if (isPlayable) {
            const drawRes = this.drawTile(botIndex, 'discard');
            if (drawRes && drawRes.success) drawnFromDiscard = true;
          }
        }
      }

      if (!drawnFromDiscard) {
        this.drawTile(botIndex, 'deck');
      }

      return { action: 'draw', source: drawnFromDiscard ? 'discard' : 'deck' };
    } catch (err) {
      console.error(`[BotAI] Error in bot ${botIndex} draw phase:`, err);
      if (this.turnState === 'DRAW') {
        this.drawTile(botIndex, 'deck');
      }
      return null;
    }
  }

  /**
   * Phase 2 of Bot Turn: Open melds or process tiles onto table
   */
  executeBotPlay(botIndex) {
    if (this.state !== GAME_STATES.PLAYING || this.currentTurn !== botIndex || this.turnState !== 'DISCARD') {
      return null;
    }
    const bot = this.players[botIndex];
    if (!bot || !bot.isBot) return null;

    try {
      // Step 2: Open hand if possible
      if (!bot.opened && this.turnState === 'DISCARD') {
        const botReqs = this.getMinOpenRequirements(botIndex);
        const best = BotAI.findBestMelds(bot.hand, this.indicator);
        if (best.score >= botReqs.minScore) {
          const opponentsOpened = this.players.some((p, index) => p && index % 2 !== botIndex % 2 && p.opened);
          const opponentHands = this.players.filter((p, index) => p && index % 2 !== botIndex % 2).map(p => p.hand.length);
          const shouldOpen = BotAI.shouldOpenMelds({
            hand: bot.hand,
            melds: best.melds,
            score: best.score,
            minScore: botReqs.minScore,
            indicator: this.indicator,
            opponentsOpened,
            deckRemaining: this.deck ? this.deck.remainingCount() : 0,
            opponentSmallestHand: opponentHands.length ? Math.min(...opponentHands) : 21,
            riskTolerance: bot.riskTolerance,
            mustUseSideTile: Boolean(this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex)
          });

          if (shouldOpen) {
            const meldIds = best.melds.map(m => m.map(t => t.id));
            this.openHand(botIndex, meldIds);
          }
        } else {
          const pairs = BotAI.findAllPairs(bot.hand, this.indicator);
          if (pairs.length >= botReqs.minPairs) {
            const opponentsOpened = this.players.some((p, index) => p && index % 2 !== botIndex % 2 && p.opened);
            const opponentHands = this.players.filter((p, index) => p && index % 2 !== botIndex % 2).map(p => p.hand.length);
            const shouldOpen = BotAI.shouldOpenPairs({
              hand: bot.hand,
              pairs,
              minPairs: botReqs.minPairs,
              indicator: this.indicator,
              opponentsOpened,
              deckRemaining: this.deck ? this.deck.remainingCount() : 0,
              opponentSmallestHand: opponentHands.length ? Math.min(...opponentHands) : 21,
              riskTolerance: bot.riskTolerance,
              mustUseSideTile: Boolean(this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex)
            });
            if (shouldOpen) {
              const pairIds = pairs.map(p => [p[0].id, p[1].id]);
              this.openPairs(botIndex, pairIds);
            }
          }
        }
      }

      // Step 3: Process tiles onto table if bot is opened
      if (bot.opened && this.turnState === 'DISCARD') {
        let processedAny = true;
        let loopCount = 0;
        while (processedAny && bot.hand.length > 1 && loopCount < 30) {
          loopCount++;
          processedAny = false;
          for (const tile of [...bot.hand]) {
            for (const tableMeld of this.tableMelds) {
              const check = Validator.canProcessTile(tile, tableMeld, this.indicator);
              if (check.canProcess) {
                const res = this.processTile(botIndex, tile.id, tableMeld.id);
                if (res && res.success) {
                  processedAny = true;
                  if (res.finished || this.state !== GAME_STATES.PLAYING) return { finished: true };
                  break;
                }
              }
            }
            if (processedAny) break;
          }
        }
      }
      return { action: 'play' };
    } catch (err) {
      console.warn(`[BotAI] Error in bot ${botIndex} play phase:`, err);
      return null;
    }
  }

  /**
   * Phase 3 of Bot Turn: Discard tile to conclude turn
   */
  executeBotDiscard(botIndex) {
    if (this.state !== GAME_STATES.PLAYING || this.currentTurn !== botIndex) {
      return null;
    }
    const bot = this.players[botIndex];
    if (!bot || !bot.isBot) return null;

    try {
      // Safety check: If bot drew from discard but could not use it, return it and draw from deck
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex) {
        this.returnDiscardTile(botIndex);
        if (this.turnState === 'DRAW') {
          this.drawTile(botIndex, 'deck');
        }
      }

      // Pick discard tile and discard
      if (this.turnState === 'DISCARD' && this.state === GAME_STATES.PLAYING && bot.hand.length > 0) {
        let chosenTile = null;
        try {
          const nextPlayer = this.players[(botIndex + 1) % 4];
          chosenTile = BotAI.pickDiscardTile(bot.hand, this.indicator, this.tableMelds, {
            nextPlayerOpened: Boolean(nextPlayer && nextPlayer.opened),
            riskTolerance: bot.riskTolerance
          });
        } catch (pickErr) {
          console.warn('[BotAI] Error picking discard tile:', pickErr);
        }

        if (!chosenTile || !bot.hand.some(t => t.id === chosenTile.id)) {
          chosenTile = bot.hand.find(t => !t.isOkey(this.indicator)) || bot.hand[bot.hand.length - 1];
        }

        if (chosenTile) {
          const discardRes = this.discardTile(botIndex, chosenTile.id);
          if (discardRes && discardRes.success) {
            return discardRes;
          }
        }

        // Fallback: try discarding any tile in hand
        for (const t of [...bot.hand]) {
          const fallbackRes = this.discardTile(botIndex, t.id);
          if (fallbackRes && fallbackRes.success) {
            return fallbackRes;
          }
        }
      }

      // GUARANTEED FAIL-SAFE
      if (this.currentTurn === botIndex && this.state === GAME_STATES.PLAYING) {
        if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex) {
          this.returnDiscardTile(botIndex);
        }
        if (this.turnState === 'DRAW') {
          this.drawTile(botIndex, 'deck');
        }
        if (bot.hand.length > 0) {
          const emergencyTile = bot.hand.find(t => !t.isOkey(this.indicator)) || bot.hand[bot.hand.length - 1];
          this.discardTile(botIndex, emergencyTile.id);
        }
        if (this.currentTurn === botIndex) {
          this.currentTurn = (this.currentTurn + 1) % 4;
          this.turnState = 'DRAW';
        }
      }
    } catch (err) {
      console.error(`[BotAI] Fatal error during bot ${botIndex} discard:`, err);
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex) {
        this.returnDiscardTile(botIndex);
      }
      if (this.turnState === 'DRAW') {
        this.drawTile(botIndex, 'deck');
      }
      if (bot.hand.length > 0) {
        const emergencyTile = bot.hand.find(t => !t.isOkey(this.indicator)) || bot.hand[bot.hand.length - 1];
        this.discardTile(botIndex, emergencyTile.id);
      }
      if (this.currentTurn === botIndex) {
        this.currentTurn = (this.currentTurn + 1) % 4;
        this.turnState = 'DRAW';
      }
    }
    return null;
  }

  /**
   * Executes full bot turn synchronously (Used for simulation tests & fallback)
   */
  executeBotTurn() {
    if (this.state !== GAME_STATES.PLAYING) return null;
    const botIndex = this.currentTurn;
    const bot = this.players[botIndex];
    if (!bot || !bot.isBot) return null;

    this.executeBotDraw(botIndex);
    if (this.state !== GAME_STATES.PLAYING) return { finished: true };
    this.executeBotPlay(botIndex);
    if (this.state !== GAME_STATES.PLAYING) return { finished: true };
    return this.executeBotDiscard(botIndex);
  }

  /**
   * Emergency Turn Executor for inactive/stuck players (handles timeout exploit prevention)
   */
  executeEmergencyTurn(playerIndex) {
    if (this.state !== GAME_STATES.PLAYING) return null;
    if (this.currentTurn !== playerIndex) return null;

    const player = this.players[playerIndex];
    if (!player) return null;

    const actions = [];

    try {
      // 1. If player took a tile from discard and didn't use it, RETURN it back immediately!
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex) {
        const returnedTile = this.drawnFromDiscard.tile;
        const toSeat = (playerIndex + 3) % 4;
        const returnResult = this.returnDiscardTile(playerIndex);
        if (returnResult && returnResult.success) {
          actions.push({ type: 'returnDiscard', tile: returnedTile, fromSeat: playerIndex, toSeat });
        }
        this.addLog(`⏳ ${player.name} süresi dolduğu için yandan aldığı taş masaya geri bırakıldı.`);
      }

      // 2. If turnState is still DRAW, draw from deck
      if (this.turnState === 'DRAW') {
        const drawResult = this.drawTile(playerIndex, 'deck');
        if (drawResult && drawResult.success) {
          actions.push({ type: 'drawDeck', tile: drawResult.tile, playerIndex });
        }
      }

      // 3. Auto-discard a safe non-Okey, non-işlek tile with lowest number (1, 2, 3...) to conclude turn
      if (this.turnState === 'DISCARD' && player.hand.length > 0) {
        // Exclude real Okeys and Sahte Okeys acting as Okey
        const nonOkeyTiles = player.hand.filter(t => !t.isOkey(this.indicator));
        const basePool = nonOkeyTiles.length > 0 ? nonOkeyTiles : player.hand;

        // Exclude işlek (playable to table melds) tiles
        const safeNonIslek = basePool.filter(t => !Validator.isPlayableToTable(t, this.tableMelds, this.indicator));
        const candidatePool = safeNonIslek.length > 0 ? safeNonIslek : basePool;

        // Sort by lowest effective number (1 first, then 2, then 3...)
        candidatePool.sort((a, b) => a.getValue(this.indicator) - b.getValue(this.indicator));

        const discardTile = candidatePool[0];
        const discardResult = this.discardTile(playerIndex, discardTile.id);
        if (discardResult && discardResult.success) {
          actions.push({ type: 'discard', tile: discardTile, playerIndex });
        }
      }
      return { playerIndex, actions };
    } catch (e) {
      console.error(`[EmergencyTurn] Error for player ${playerIndex}:`, e);
      if (this.currentTurn === playerIndex) {
        this.currentTurn = (this.currentTurn + 1) % 4;
        this.turnState = 'DRAW';
        this.drawnFromDiscard = null;
      }
      return { playerIndex, actions, error: true };
    }
  }

  /**
   * Sanitizes state for a specific client
   */
  getClientState(viewerSeatIndex) {
    const okeyInfo = this.deck ? this.deck.getOkeyInfo() : null;
    const viewerReqs = (viewerSeatIndex !== undefined && viewerSeatIndex !== null)
      ? this.getMinOpenRequirements(viewerSeatIndex)
      : { minScore: 101, minPairs: 5 };

    return {
      id: this.id,
      gameId: this.id,
      state: this.state,
      mode: this.mode,
      currentRound: this.currentRound,
      targetRounds: this.targetRounds,
      currentTurn: this.currentTurn,
      turnState: this.turnState,
      turnStartTime: this.turnStartTime || Date.now(),
      turnDuration: this.turnDuration || 30000,
      firstPlayerIndex: this.firstPlayerIndex,
      remainingDeckCount: this.deck ? this.deck.remainingCount() : 0,
      indicator: this.indicator ? this.indicator.toJSON() : null,
      okeyInfo: okeyInfo ? {
        color: okeyInfo.okeyColor,
        number: okeyInfo.okeyNumber
      } : null,
      minOpenScore: viewerReqs.minScore,
      minOpenPairs: viewerReqs.minPairs,
      tableMinOpenScore: this.minOpenScore || 101,
      tableMinOpenPairs: this.minOpenPairs || 5,
      partnerOpened: Boolean(this.players[(viewerSeatIndex + 2) % 4] && this.players[(viewerSeatIndex + 2) % 4].opened),
      tableMelds: this.tableMelds.map(m => ({
        id: m.id,
        playerIndex: m.playerIndex,
        type: m.type,
        score: m.score,
        tiles: m.tiles.map(t => ({
          ...t.toJSON(),
          effectiveColor: t.getColor(this.indicator),
          effectiveValue: t.getValue(this.indicator),
          isOkey: t.isOkey(this.indicator)
        }))
      })),
      discards: this.discards.map(pile => pile.map(t => ({
        ...t.toJSON(),
        effectiveColor: t.getColor(this.indicator),
        effectiveValue: t.getValue(this.indicator),
        isOkey: t.isOkey(this.indicator)
      }))),
      players: this.players.map((p, idx) => p ? ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        isBot: p.isBot,
        gender: p.gender || 'male',
        avatarIndex: (p.avatarIndex !== undefined && p.avatarIndex !== null) ? p.avatarIndex : null,
        avatarFile: p.avatarFile || null,
        tileCount: p.hand ? p.hand.length : 0,
        opened: p.opened || false,
        openType: p.openType || null,
        openedScore: p.initialOpenScore || (p.openedMelds ? p.openedMelds.reduce((sum, m) => sum + (m.score || 0), 0) : 0),
        openedMeldsCount: p.initialOpenPairs || (p.openedMelds ? p.openedMelds.length : 0),
        score: p.score || 0,
        roundScore: p.roundScore || 0,
        penaltyPoints: p.penaltyPoints || 0,
        penalties: p.penalties || [],
        // Only provide full hand details to the viewer
        hand: (idx === viewerSeatIndex && p.hand) ? p.hand.map(t => ({
          ...t.toJSON(),
          effectiveColor: t.getColor(this.indicator),
          effectiveValue: t.getValue(this.indicator),
          isOkey: t.isOkey(this.indicator)
        })) : null
      }) : null),
      roundResults: this.roundResults,
      matchHistory: this.matchHistory || [],
      canUndo: Boolean(this.turnSnapshot && this.turnSnapshot.modified && this.turnSnapshot.playerIndex === viewerSeatIndex && this.currentTurn === viewerSeatIndex && this.turnState === 'DISCARD'),
      drawnFromDiscard: this.drawnFromDiscard ? {
        playerIndex: this.drawnFromDiscard.playerIndex,
        tileId: this.drawnFromDiscard.tile.id,
        tile: {
          ...this.drawnFromDiscard.tile.toJSON(),
          effectiveColor: this.drawnFromDiscard.tile.getColor(this.indicator),
          effectiveValue: this.drawnFromDiscard.tile.getValue(this.indicator),
          isOkey: this.drawnFromDiscard.tile.isOkey(this.indicator)
        }
      } : null,
      logs: this.logs.slice(-15)
    };
  }
}

module.exports = OkeyGame;
