const { COLORS } = require('./Constants');

class Validator {
  /**
   * Helper: gets effective color and number for a tile (handling Sahte Okey & Jokers)
   */
  static getTileProps(tile, indicator) {
    if (!tile) return null;
    return {
      id: tile.id,
      color: tile.getColor(indicator),
      number: tile.getValue(indicator),
      isOkey: tile.isOkey(indicator),
      isFake: tile.isFake,
      originalTile: tile
    };
  }

  /**
   * Validates if a group of tiles forms a valid Seri (Run/Straight).
   * E.g. [Red 4, Red 5, Red 6], [Blue 11, Blue 12, Blue 13, Blue 1], [Black 4, OKEY, Black 6]
   * Order-independent, handles 12-13-1, and maximizes Joker placement score for player benefit.
   */
  static isValidRun(tiles, indicator) {
    if (!tiles || tiles.length < 3 || tiles.length > 13) {
      return { valid: false, reason: 'Seri 3 ile 13 taş arasında olmalıdır.' };
    }

    const tileProps = tiles.map(t => this.getTileProps(t, indicator));
    const jokers = tileProps.filter(t => t.isOkey);
    const regularTiles = tileProps.filter(t => !t.isOkey);

    if (regularTiles.length === 0) {
      return {
        valid: true,
        type: 'run',
        score: tiles.length * 10,
        substituted: tileProps.map(t => ({ id: t.id, isOkey: true, score: 10 }))
      };
    }

    // All regular tiles must have the same color
    const runColor = regularTiles[0].color;
    if (regularTiles.some(t => t.color !== runColor)) {
      return { valid: false, reason: 'Serideki tüm taşlar aynı renkte olmalıdır.' };
    }

    // Check for duplicate numbers among regular tiles
    const seenNumbers = new Set();
    for (const t of regularTiles) {
      if (seenNumbers.has(t.number)) {
        return { valid: false, reason: 'Seride aynı sayıdan birden fazla taş bulunamaz.' };
      }
      seenNumbers.add(t.number);
    }

    const len = tiles.length;
    let bestMatch = null;
    let maxScore = -1;

    const candidateSequences = [];
    // Standard linear sequential runs (1..13 strictly, no 12-13-1 wrap)
    for (let startNum = 1; startNum <= 13 - len + 1; startNum++) {
      candidateSequences.push(Array.from({ length: len }, (_, i) => ({
        expectedNum: startNum + i,
        score: startNum + i
      })));
    }

    for (const seq of candidateSequences) {
      let isMatch = true;
      let usedJokersCount = 0;
      const matchedRegularIds = new Set();
      const substituted = [];

      for (const slot of seq) {
        const reg = regularTiles.find(r => !matchedRegularIds.has(r.id) && r.number === slot.expectedNum);
        if (reg) {
          matchedRegularIds.add(reg.id);
          substituted.push({
            id: reg.id,
            isOkey: false,
            substitutedNumber: reg.number,
            score: slot.score
          });
        } else if (usedJokersCount < jokers.length) {
          const jokerTile = jokers[usedJokersCount++];
          substituted.push({
            id: jokerTile.id,
            isOkey: true,
            substitutedNumber: slot.expectedNum,
            score: slot.score
          });
        } else {
          isMatch = false;
          break;
        }
      }

      if (isMatch && matchedRegularIds.size === regularTiles.length && usedJokersCount === jokers.length) {
        const score = substituted.reduce((sum, item) => sum + item.score, 0);
        if (score > maxScore) {
          maxScore = score;
          bestMatch = { valid: true, type: 'run', score, substituted };
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }

    return { valid: false, reason: 'Taşlar geçerli ardışık bir seri oluşturmuyor.' };
  }

  /**
   * Validates if a group of tiles forms a valid Grup (Set / Same number, diff colors).
   */
  static isValidGroup(tiles, indicator) {
    if (!tiles || tiles.length < 3 || tiles.length > 4) {
      return { valid: false, reason: 'Grup 3 veya 4 taştan oluşmalıdır.' };
    }

    const tileProps = tiles.map(t => this.getTileProps(t, indicator));
    const jokers = tileProps.filter(t => t.isOkey);
    const regularTiles = tileProps.filter(t => !t.isOkey);

    if (regularTiles.length === 0) {
      return {
        valid: true,
        type: 'group',
        score: tiles.length * 10,
        substituted: tileProps.map(t => ({ id: t.id, isOkey: true, score: 10 }))
      };
    }

    // All regular tiles must have the same number
    const groupNum = regularTiles[0].number;
    if (regularTiles.some(t => t.number !== groupNum)) {
      return { valid: false, reason: 'Gruptaki tüm taşların sayıları aynı olmalıdır.' };
    }

    // All regular tiles must have different colors
    const usedColors = new Set();
    for (const t of regularTiles) {
      if (usedColors.has(t.color)) {
        return { valid: false, reason: 'Grupta aynı renkten birden fazla taş bulunamaz.' };
      }
      usedColors.add(t.color);
    }

    const allColors = [COLORS.RED, COLORS.BLUE, COLORS.BLACK, COLORS.YELLOW];
    const availableColors = allColors.filter(c => !usedColors.has(c));

    if (jokers.length > availableColors.length) {
      return { valid: false, reason: 'Grupta renk sayısı aşıldı.' };
    }

    const substituted = [];
    let jokerIdx = 0;

    for (const t of tileProps) {
      if (t.isOkey) {
        const assignedColor = availableColors[jokerIdx++] || 'unknown';
        substituted.push({
          id: t.id,
          isOkey: true,
          substitutedColor: assignedColor,
          substitutedNumber: groupNum,
          score: groupNum
        });
      } else {
        substituted.push({
          id: t.id,
          isOkey: false,
          substitutedColor: t.color,
          substitutedNumber: groupNum,
          score: groupNum
        });
      }
    }

    const score = groupNum * tiles.length;
    return { valid: true, type: 'group', score, substituted };
  }

  /**
   * Validates a single meld (which could be either a Run or a Group)
   */
  static isValidMeld(tiles, indicator) {
    const runResult = this.isValidRun(tiles, indicator);
    if (runResult.valid) {
      return runResult;
    }

    const groupResult = this.isValidGroup(tiles, indicator);
    if (groupResult.valid) {
      return groupResult;
    }

    return {
      valid: false,
      reason: runResult.reason || groupResult.reason || 'Geçersiz per.'
    };
  }

  /**
   * Validates an entire opening of melds (Seri Açma) for 101 points requirement.
   */
  static validateOpening(melds, indicator, minScore = 101) {
    if (!melds || melds.length === 0) {
      return { valid: false, score: 0, reason: 'Açılacak per bulunamadı.' };
    }

    let totalScore = 0;
    const validatedMelds = [];

    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];
      const meldResult = this.isValidMeld(meld, indicator);
      if (!meldResult.valid) {
        return {
          valid: false,
          score: 0,
          reason: `${i + 1}. per geçersiz: ${meldResult.reason}`
        };
      }
      totalScore += meldResult.score;
      validatedMelds.push({
        type: meldResult.type,
        tiles: meld,
        score: meldResult.score,
        substituted: meldResult.substituted
      });
    }

    if (totalScore < minScore) {
      return {
        valid: false,
        score: totalScore,
        reason: `Toplam per puanı ${totalScore}. El açmak için en az ${minScore} puan gereklidir.`
      };
    }

    return {
      valid: true,
      score: totalScore,
      melds: validatedMelds
    };
  }

  /**
   * Checks if two tiles form a valid pair (identical color & number, or with Okey)
   */
  static isPair(tile1, tile2, indicator) {
    if (!tile1 || !tile2) return false;
    const t1 = this.getTileProps(tile1, indicator);
    const t2 = this.getTileProps(tile2, indicator);
    if (t1.isOkey || t2.isOkey) return true;
    return t1.color === t2.color && t1.number === t2.number;
  }

  /**
   * Validates Çift Açma (Pairs opening) - requires at least 5 pairs.
   */
  static validatePairsOpening(pairs, indicator, minPairs = 5) {
    if (!pairs || pairs.length < minPairs) {
      return {
        valid: false,
        count: pairs ? pairs.length : 0,
        reason: `En az ${minPairs} çift açmalısınız. (Seçilen: ${pairs ? pairs.length : 0})`
      };
    }

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (!pair || pair.length !== 2) {
        return { valid: false, reason: `${i + 1}. çift 2 taştan oluşmalıdır.` };
      }

      const t1 = this.getTileProps(pair[0], indicator);
      const t2 = this.getTileProps(pair[1], indicator);

      // Real Okey pairs with anything
      if (t1.isOkey || t2.isOkey) {
        continue;
      }

      // Both must have same color and same number
      if (t1.color !== t2.color || t1.number !== t2.number) {
        return {
          valid: false,
          reason: `${i + 1}. çiftteki taşlar aynı renk ve sayıda değil (${t1.color} ${t1.number} != ${t2.color} ${t2.number}).`
        };
      }
    }

    return {
      valid: true,
      count: pairs.length
    };
  }

  /**
   * Checks if a tile can be processed (işleme) into an existing open meld,
   * including stealing/retrieving Okey when filling the exact spot of the Joker!
   */
  static canProcessTile(tile, targetMeld, indicator) {
    if (!tile || !targetMeld || !targetMeld.tiles) {
      return { canProcess: false };
    }

    const { type, tiles } = targetMeld;

    const isJoker = (t) => {
      if (!t) return false;
      if (typeof t.isOkey === 'boolean') return t.isOkey;
      if (typeof t.isOkey === 'function') return t.isOkey(indicator);
      if (t.isOkey !== undefined && typeof t.isOkey !== 'function') return Boolean(t.isOkey);
      if (!indicator) return false;
      const okeyNumber = indicator.number === 13 ? 1 : indicator.number + 1;
      return !t.isFake && t.color === indicator.color && t.number === okeyNumber;
    };

    // ============================================
    // 1. RUN (SERİ)
    // ============================================
    if (type === 'run') {
      const pTile = this.getTileProps(tile, indicator);
      const regularIndices = [];
      tiles.forEach((t, i) => { if (!isJoker(t)) regularIndices.push(i); });
      if (regularIndices.length === 0) return { canProcess: false };

      const firstRegIdx = regularIndices[0];
      const firstRegTile = this.getTileProps(tiles[firstRegIdx], indicator);
      const startNum = firstRegTile.number - firstRegIdx;
      const runColor = firstRegTile.color;

      if (pTile.color !== runColor) return { canProcess: false };

      // 1. Check if played tile replaces any Joker in its exact physical position (Okey Steal)
      for (let i = 0; i < tiles.length; i++) {
        if (isJoker(tiles[i])) {
          const jokerExpectedNum = startNum + i;
          if (pTile.number === jokerExpectedNum) {
            const newTiles = [...tiles];
            newTiles[i] = tile;
            return {
              canProcess: true,
              isOkeySteal: true,
              stolenOkeyTile: tiles[i],
              position: 'replace_joker',
              newTiles
            };
          }
        }
      }

      // 2. Check if played tile extends the run on the left (startNum - 1)
      if (pTile.number === startNum - 1 && startNum - 1 >= 1) {
        return {
          canProcess: true,
          isOkeySteal: false,
          position: 'prepend',
          newTiles: [tile, ...tiles]
        };
      }

      // 3. Check if played tile extends the run on the right (startNum + tiles.length)
      if (pTile.number === startNum + tiles.length && startNum + tiles.length <= 13) {
        return {
          canProcess: true,
          isOkeySteal: false,
          position: 'append',
          newTiles: [...tiles, tile]
        };
      }

      return { canProcess: false };
    }

    // ============================================
    // 2. GROUP (GRUP / SET)
    // ============================================
    else if (type === 'group') {
      const jokerIndices = [];
      tiles.forEach((t, idx) => {
        if (isJoker(t)) jokerIndices.push(idx);
      });

      // If group has 4 tiles including 1 Okey (3 colors + 1 Okey):
      // Processing the 4th missing color completes all 4 colors, freeing the Okey to the player's hand!
      if (tiles.length === 4 && jokerIndices.length === 1) {
        const jIdx = jokerIndices[0];
        const candidateTiles = [...tiles];
        candidateTiles[jIdx] = tile;

        const checkReplaced = this.isValidGroup(candidateTiles, indicator);
        if (checkReplaced.valid) {
          return {
            canProcess: true,
            isOkeySteal: true,
            stolenOkeyTile: tiles[jIdx],
            position: 'replace_joker',
            newTiles: candidateTiles
          };
        }
      }

      // If group has 3 tiles:
      // Adding a 4th tile to make a 4-tile group (Okey stays in group if present because another color is still missing)
      if (tiles.length === 3) {
        const testGroup = [...tiles, tile];
        const groupResult = this.isValidGroup(testGroup, indicator);
        if (groupResult.valid) {
          return {
            canProcess: true,
            isOkeySteal: false,
            position: 'add_to_group',
            newTiles: testGroup
          };
        }
      }
    }

    // ============================================
    // 3. PAIRS (ÇİFT)
    // ============================================
    else if (type === 'pairs') {
      // If the pair contains a Joker/Okey, replacing it with the identical natural tile steals the Okey!
      const jokerIndices = [];
      tiles.forEach((t, idx) => {
        if (isJoker(t)) jokerIndices.push(idx);
      });

      if (jokerIndices.length === 1 && tiles.length === 2) {
        const jIdx = jokerIndices[0];
        const regularTile = tiles[1 - jIdx];
        const targetColor = regularTile.getColor ? regularTile.getColor(indicator) : (regularTile.effectiveColor || regularTile.color);
        const targetValue = regularTile.getValue ? regularTile.getValue(indicator) : (regularTile.effectiveValue !== undefined ? regularTile.effectiveValue : regularTile.number);

        const tileColor = tile.getColor ? tile.getColor(indicator) : (tile.effectiveColor || tile.color);
        const tileValue = tile.getValue ? tile.getValue(indicator) : (tile.effectiveValue !== undefined ? tile.effectiveValue : tile.number);
        const tileIsJoker = isJoker(tile);

        if (!tileIsJoker && tileColor === targetColor && tileValue === targetValue) {
          const newTiles = [regularTile, tile];
          return {
            canProcess: true,
            isOkeySteal: true,
            stolenOkeyTile: tiles[jIdx],
            position: 'replace_joker',
            newTiles
          };
        }
      }
    }

    return { canProcess: false };
  }

  /**
   * Checks if a discarded tile is "işlek"
   */
  static isPlayableToTable(tile, allOpenedMelds, indicator) {
    if (!tile || !allOpenedMelds || allOpenedMelds.length === 0) {
      return false;
    }

    for (const meld of allOpenedMelds) {
      const processResult = this.canProcessTile(tile, meld, indicator);
      if (processResult.canProcess) {
        return true;
      }
    }

    return false;
  }
}

module.exports = Validator;
