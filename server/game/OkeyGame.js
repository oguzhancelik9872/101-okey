const Deck = require('./Deck');
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
  }

  addPlayer(id, name, isBot = false, gender = null, userId = null, preferredSeat = null, avatarIndex = null) {
    let seatIndex = null;

    if (preferredSeat !== null && preferredSeat !== undefined && preferredSeat >= 0 && preferredSeat < 4) {
      if (!this.players[preferredSeat]) {
        seatIndex = preferredSeat;
      }
    }

    if (seatIndex === null) {
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
      hand: [],
      opened: false,
      openType: null, // 'seri' | 'pairs'
      openedMelds: [],
      score: 0,       // Total penalty score (lower is better)
      roundScore: 0,  // Score in current round
      penalties: []
    };
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

    const existingNames = this.players.filter(Boolean).map(p => p.name);
    const available = femaleNames.filter(n => !existingNames.includes(n + ' (Bot)'));
    const baseName = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const fullName = `${baseName} (Bot)`;
    const gender = 'female';
    const avatarIndex = Math.floor(Math.random() * 8);

    const botId = `bot_${Date.now()}_${preferredSeat || 0}_${Math.random().toString(36).substring(7)}`;
    return this.addPlayer(botId, fullName, true, gender, null, preferredSeat, avatarIndex);
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

    const shuffledFemales = [...femaleNames].sort(() => Math.random() - 0.5);
    let fIdx = 0;

    for (let i = 0; i < 4; i++) {
      if (!this.players[i]) {
        const name = shuffledFemales[fIdx++ % shuffledFemales.length] + ' (Bot)';
        const gender = 'female';
        const avatarIndex = Math.floor(Math.random() * 8);
        this.addPlayer(`bot_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`, name, true, gender, null, i, avatarIndex);
      }
    }
  }

  startRound() {
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

    // First player rotates each round
    this.firstPlayerIndex = (this.currentRound - 1) % 4;
    this.currentTurn = this.firstPlayerIndex;
    
    // Deal tiles: first player gets 22, others get 21
    const hands = this.deck.deal(this.firstPlayerIndex);
    for (let i = 0; i < 4; i++) {
      this.players[i].hand = hands[i];
      this.players[i].opened = false;
      this.players[i].openType = null;
      this.players[i].openedMelds = [];
      this.players[i].roundScore = 0;
      this.players[i].penalties = [];
    }

    // First player starts directly in DISCARD state because they hold 22 tiles
    this.turnState = 'DISCARD';
    this.turnStartTime = Date.now();
    this.turnDuration = 30000;
    this.addLog(`El ${this.currentRound} başladı! Gösterge: ${this.indicator.color.toUpperCase()} ${this.indicator.number}. Başlayan: ${this.players[this.firstPlayerIndex].name}`);

    // Check Gösterge bonus for players holding it
    this._checkGostergeBonus();
  }

  _checkGostergeBonus() {
    // In 101 Okey, player who has the indicator tile before drawing can claim indicator point (-101 or bonus)
    // We can auto-award -101 to anyone who holds indicator on deal
    for (const p of this.players) {
      const hasIndicator = p.hand.some(t => !t.isFake && t.color === this.indicator.color && t.number === this.indicator.number);
      if (hasIndicator) {
        p.score -= 101;
        p.penalties.push({ type: 'GOSTERGE', points: -101, desc: 'Gösterge taşı puanı (-101)' });
        this.addLog(`${p.name} elinde gösterge taşını gösterdi (-101 puan kazandı).`);
      }
    }
  }

  addLog(msg) {
    this.logs.push({
      time: new Date().toLocaleTimeString('tr-TR'),
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
      this.drawnFromDiscard = { playerIndex, tile };
      this.turnState = 'DISCARD';

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
      this.drawnFromDiscard = null;
      this.turnState = 'DISCARD';

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

    this.addLog(`${player.name} yandan aldığı taşı geri bıraktı.`);
    return { success: true };
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

    const minRequired = player.opened ? 0 : this.minOpenScore;
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
    player.opened = true;
    player.openType = 'seri';

    if (firstTime && this.mode === GAME_MODES.FOLDED) {
      this.minOpenScore = Math.max(this.minOpenScore, validation.score + 1);
    }

    this.drawnFromDiscard = null; // Successfully used

    this.addLog(`${player.name} ${validation.score} puan ile el açtı!`);
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
      const hasPairsOnTable = this.tableMelds.some(m => m.type === 'pairs') || this.players.some(p => p.opened && p.openType === 'pairs');
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

    const minRequired = player.opened ? 0 : this.minOpenPairs;
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
    if (firstTime) {
      player.opened = true;
      player.openType = 'pairs';
    }

    if (firstTime && this.mode === GAME_MODES.FOLDED) {
      this.minOpenPairs = Math.max(this.minOpenPairs, pairs.length + 1);
    }

    this.drawnFromDiscard = null;

    this.addLog(`${player.name} ${pairs.length} çift açtı!`);
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

    // If an Okey was replaced and retrieved from the table meld!
    if (processCheck.isOkeySteal && processCheck.stolenOkeyTile) {
      player.hand.push(processCheck.stolenOkeyTile);
      this.addLog(`✨ ${player.name} perdeki Okey'in yerine taş işleyerek OKEY'i eline aldı!`);
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
    this.addLog(`${player.name} ${tile.getColor(this.indicator).toUpperCase()} ${tile.getValue(this.indicator)} attı.`);

    // Check if player is finishing (El Bitişi - elinde taş kalmadı)
    if (player.hand.length === 0) {
      const isOkeyDiscard = tile.isOkey(this.indicator);
      this.endRound(playerIndex, isOkeyDiscard);
      return { success: true, finished: true, isOkeyDiscard };
    }

    // Check "İşlek Taş Atma" penalty
    const isPlayable = Validator.isPlayableToTable(tile, this.tableMelds, this.indicator);
    if (isPlayable) {
      player.score += PENALTIES.DISCARDED_PLAYABLE;
      player.penalties.push({ type: 'DISCARDED_PLAYABLE', points: PENALTIES.DISCARDED_PLAYABLE, desc: 'İşlek taş atma cezası (+101)' });
      this.addLog(`⚠️ ${player.name} masaya işlenebilecek işlek bir taş attığı için 101 ceza puanı aldı!`);
    }

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
    this.state = GAME_STATES.ROUND_OVER;
    const finisher = this.players[finishingPlayerIndex];
    if (!finisher) return;

    const isPairsFinish = finisher.openType === 'pairs';
    const okeyMultiplier = isOkeyDiscard ? 2 : 1;
    const pairsMultiplier = isPairsFinish ? 2 : 1;
    const totalMultiplier = okeyMultiplier * pairsMultiplier;

    // Finisher gets -101 (or -202 / -404 if okey/pairs)
    const finisherPoints = -101 * totalMultiplier;
    finisher.score += finisherPoints;
    finisher.roundScore = finisherPoints;

    const partnerIndex = (finishingPlayerIndex + 2) % 4;
    const roundScores = {};

    for (let i = 0; i < 4; i++) {
      const p = this.players[i];
      if (!p) continue;

      if (i === finishingPlayerIndex) {
        roundScores[p.id] = { name: p.name, points: finisherPoints, opened: true, openType: p.openType, handSum: 0, isFinisher: true };
        continue;
      }

      if (i === partnerIndex) {
        // Partner of finisher gets 0 penalty (Hand score zeroed out because partner finished)
        p.roundScore = 0;
        roundScores[p.id] = { name: p.name, points: 0, opened: p.opened, openType: p.openType, handSum: 0, isPartner: true };
        continue;
      }

      let pPoints = 0;
      let handSum = 0;

      if (!p.opened) {
        // Player never opened: 202 penalty points
        pPoints = 202 * totalMultiplier;
      } else {
        // Player opened: sum of leftover tiles. If opened as pairs, 2x leftover tiles
        handSum = p.hand ? p.hand.reduce((sum, t) => sum + (t ? t.getValue(this.indicator) : 0), 0) : 0;
        const playerPairsMultiplier = (p.openType === 'pairs') ? 2 : 1;
        pPoints = handSum * playerPairsMultiplier * totalMultiplier;
      }

      p.score += pPoints;
      p.roundScore = pPoints;
      roundScores[p.id] = { name: p.name, points: pPoints, opened: p.opened, openType: p.openType, handSum };
    }

    const p0Name = this.players[0] ? this.players[0].name : 'Oyuncu 1';
    const p1Name = this.players[1] ? this.players[1].name : 'Oyuncu 2';
    const p2Name = this.players[2] ? this.players[2].name : 'Oyuncu 3';
    const p3Name = this.players[3] ? this.players[3].name : 'Oyuncu 4';

    const team1Score = (this.players[0] ? this.players[0].roundScore : 0) + (this.players[2] ? this.players[2].roundScore : 0);
    const team2Score = (this.players[1] ? this.players[1].roundScore : 0) + (this.players[3] ? this.players[3].roundScore : 0);
    const isTeam1Winner = team1Score <= team2Score;

    this.roundResults = {
      finisher: finisher.name,
      isOkeyDiscard,
      isPairsFinish,
      multiplier: totalMultiplier,
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
          isWinner: !isTeam1Winner
        }
      },
      totalScores: this.players.filter(Boolean).map(p => ({ id: p.id, name: p.name, score: p.score }))
    };

    let finishMsg = `🎉 ${finisher.name} eli bitirdi (${finisherPoints} puan).`;
    if (isOkeyDiscard) finishMsg += ' 🔥 OKEY ATTI (Cezalar 2 katı)!';
    if (isPairsFinish) finishMsg += ' ✨ ÇİFT BİTTİ (Cezalar 2 katı)!';
    finishMsg += isTeam1Winner ? ` 🏆 Kazanan: ${p0Name} & ${p2Name} (${team1Score} Puan)` : ` 🏆 Kazanan: ${p1Name} & ${p3Name} (${team2Score} Puan)`;
    this.addLog(finishMsg);

    this.state = GAME_STATES.GAME_OVER;
    this.addLog('🏆 Oyun tamamlandı!');
  }

  endRoundNoWinner() {
    this.state = GAME_STATES.ROUND_OVER;
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
      p.score += pPoints;
      p.roundScore = pPoints;
      roundScores[p.id] = { name: p.name, points: pPoints, opened: p.opened, openType: p.openType, handSum };
    }

    const p0Name = this.players[0] ? this.players[0].name : 'Oyuncu 1';
    const p1Name = this.players[1] ? this.players[1].name : 'Oyuncu 2';
    const p2Name = this.players[2] ? this.players[2].name : 'Oyuncu 3';
    const p3Name = this.players[3] ? this.players[3].name : 'Oyuncu 4';

    const team1Score = (this.players[0] ? this.players[0].roundScore : 0) + (this.players[2] ? this.players[2].roundScore : 0);
    const team2Score = (this.players[1] ? this.players[1].roundScore : 0) + (this.players[3] ? this.players[3].roundScore : 0);
    const isTeam1Winner = team1Score <= team2Score;

    this.roundResults = {
      finisher: null,
      reason: 'Deste bitti',
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
          isWinner: !isTeam1Winner
        }
      },
      totalScores: this.players.filter(Boolean).map(p => ({ id: p.id, name: p.name, score: p.score }))
    };

    this.addLog('Deste bitti! Kalan eller sayıldı.');
    this.state = GAME_STATES.GAME_OVER;
    this.addLog('🏆 Oyun tamamlandı!');
  }

  nextRound() {
    if (this.currentRound < this.targetRounds) {
      this.currentRound++;
      this.startRound();
      return true;
    }
    return false;
  }

  /**
   * Executes AI logic for bot whose turn it is
   */
  /**
   * Executes AI logic for bot whose turn it is (Foolproof & Fail-safe)
   */
  executeBotTurn() {
    if (this.state !== GAME_STATES.PLAYING) return null;
    const botIndex = this.currentTurn;
    const bot = this.players[botIndex];
    if (!bot || !bot.isBot) return null;

    try {
      // Step 1: Draw tile if in DRAW state
      if (this.turnState === 'DRAW') {
        let drawnFromDiscard = false;
        const leftSeat = (botIndex + 3) % 4;
        const leftDiscard = this.discards[leftSeat];

        if (leftDiscard && leftDiscard.length > 0) {
          const topDiscard = leftDiscard[leftDiscard.length - 1];
          const testHand = [...bot.hand, topDiscard];

          if (!bot.opened) {
            const best = BotAI.findBestMelds(testHand, this.indicator);
            const usesDiscard = best.melds.some(m => m.some(t => t.id === topDiscard.id));
            if (best.score >= this.minOpenScore && usesDiscard) {
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
      }

      // If game ended during draw (e.g. deck finished), exit
      if (this.state !== GAME_STATES.PLAYING) return { finished: true };

      // Step 2: Open hand if possible
      if (!bot.opened && this.turnState === 'DISCARD') {
        try {
          const best = BotAI.findBestMelds(bot.hand, this.indicator);
          if (best.score >= this.minOpenScore) {
            const meldIds = best.melds.map(m => m.map(t => t.id));
            this.openHand(botIndex, meldIds);
          } else {
            // Try pairs
            const pairs = BotAI.findAllPairs(bot.hand, this.indicator);
            if (pairs.length >= this.minOpenPairs) {
              const pairIds = pairs.map(p => [p[0].id, p[1].id]);
              this.openPairs(botIndex, pairIds);
            }
          }
        } catch (openErr) {
          console.warn('[BotAI] Error opening hand:', openErr);
        }
      }

      // Step 3: Process tiles onto table if bot is opened
      if (bot.opened && this.turnState === 'DISCARD') {
        try {
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
        } catch (procErr) {
          console.warn('[BotAI] Error processing tiles:', procErr);
        }
      }

      // Safety check: If bot drew from discard but could not use it, return it and draw from deck
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === botIndex) {
        this.returnDiscardTile(botIndex);
        if (this.turnState === 'DRAW') {
          this.drawTile(botIndex, 'deck');
        }
      }

      // Step 4: Pick discard tile and discard
      if (this.turnState === 'DISCARD' && this.state === GAME_STATES.PLAYING && bot.hand.length > 0) {
        let chosenTile = null;
        try {
          chosenTile = BotAI.pickDiscardTile(bot.hand, this.indicator, this.tableMelds);
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

      // GUARANTEED FAIL-SAFE: If turnState is still not finished, force advance turn
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
      console.error(`[BotAI] Fatal error during bot ${botIndex} turn:`, err);
      // Emergency turn progression
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
   * Emergency Turn Executor for inactive/stuck players (handles timeout exploit prevention)
   */
  executeEmergencyTurn(playerIndex) {
    if (this.state !== GAME_STATES.PLAYING) return;
    if (this.currentTurn !== playerIndex) return;

    const player = this.players[playerIndex];
    if (!player) return;

    try {
      // 1. If player took a tile from discard and didn't use it, RETURN it back immediately!
      if (this.drawnFromDiscard && this.drawnFromDiscard.playerIndex === playerIndex) {
        this.returnDiscardTile(playerIndex);
        this.addLog(`⏳ ${player.name} süresi dolduğu için yandan aldığı taş masaya geri bırakıldı.`);
      }

      // 2. If turnState is still DRAW, draw from deck
      if (this.turnState === 'DRAW') {
        this.drawTile(playerIndex, 'deck');
      }

      // 3. Auto-discard a non-Okey tile to conclude turn
      if (this.turnState === 'DISCARD' && player.hand.length > 0) {
        const discardTile = player.hand.find(t => !t.isOkey(this.indicator)) || player.hand[player.hand.length - 1];
        this.discardTile(playerIndex, discardTile.id);
      }
    } catch (e) {
      console.error(`[EmergencyTurn] Error for player ${playerIndex}:`, e);
      if (this.currentTurn === playerIndex) {
        this.currentTurn = (this.currentTurn + 1) % 4;
        this.turnState = 'DRAW';
        this.drawnFromDiscard = null;
      }
    }
  }

  /**
   * Sanitizes state for a specific client
   */
  getClientState(viewerSeatIndex) {
    const okeyInfo = this.deck ? this.deck.getOkeyInfo() : null;

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
      minOpenScore: this.minOpenScore,
      minOpenPairs: this.minOpenPairs,
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
        tileCount: p.hand ? p.hand.length : 0,
        opened: p.opened || false,
        openType: p.openType || null,
        openedScore: p.openedMelds ? p.openedMelds.reduce((sum, m) => sum + (m.score || 0), 0) : 0,
        openedMeldsCount: p.openedMelds ? p.openedMelds.length : 0,
        score: p.score || 0,
        roundScore: p.roundScore || 0,
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
      drawnFromDiscard: this.drawnFromDiscard ? {
        playerIndex: this.drawnFromDiscard.playerIndex,
        tileId: this.drawnFromDiscard.tile.id
      } : null,
      logs: this.logs.slice(-15)
    };
  }
}

module.exports = OkeyGame;
