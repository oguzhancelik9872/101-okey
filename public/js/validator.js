/**
 * Client-side 101 Okey Validator & Meld Finder
 * Mirrors server rules for instant, reactive UI feedback and smart auto-sorting.
 */
class ClientValidator {
  static getTileProps(tile, indicator) {
    if (!tile) return null;
    const isFake = tile.isFake;
    let color = tile.color;
    let number = tile.number;
    let isOkey = false;

    if (indicator) {
      const okeyNumber = indicator.number === 13 ? 1 : indicator.number + 1;
      isOkey = (!isFake && tile.color === indicator.color && tile.number === okeyNumber);

      if (isFake) {
        color = indicator.color;
        number = okeyNumber;
      }
    }

    if (tile.effectiveColor) color = tile.effectiveColor;
    if (tile.effectiveValue !== undefined) number = tile.effectiveValue;
    if (tile.isOkey !== undefined) isOkey = tile.isOkey;

    return {
      id: tile.id,
      color,
      number,
      isOkey,
      isFake,
      originalTile: tile
    };
  }

  /**
   * Order-independent run validation with wrapOne and Joker score maximization
   */
  static isValidRun(tiles, indicator) {
    if (!tiles || tiles.length < 3 || tiles.length > 13) {
      return { valid: false, reason: 'Seri 3 ile 13 taş arasında olmalıdır.' };
    }

    const tileProps = tiles.map(t => this.getTileProps(t, indicator));
    const jokers = tileProps.filter(t => t.isOkey);
    const regularTiles = tileProps.filter(t => !t.isOkey);

    if (regularTiles.length === 0) {
      return { valid: true, type: 'run', score: tiles.length * 10, substituted: [] };
    }

    const runColor = regularTiles[0].color;
    if (regularTiles.some(t => t.color !== runColor)) {
      return { valid: false, reason: 'Serideki tüm taşlar aynı renkte olmalıdır.' };
    }

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

    return { valid: false, reason: 'Taşlar ardışık bir seri oluşturmuyor.' };
  }

  /**
   * Order-independent group validation
   */
  static isValidGroup(tiles, indicator) {
    if (!tiles || tiles.length < 3 || tiles.length > 4) {
      return { valid: false, reason: 'Grup 3 veya 4 taştan oluşmalıdır.' };
    }

    const tileProps = tiles.map(t => this.getTileProps(t, indicator));
    const jokers = tileProps.filter(t => t.isOkey);
    const regularTiles = tileProps.filter(t => !t.isOkey);

    if (regularTiles.length === 0) {
      return { valid: true, type: 'group', score: tiles.length * 10, substituted: [] };
    }

    const groupNum = regularTiles[0].number;
    if (regularTiles.some(t => t.number !== groupNum)) {
      return { valid: false, reason: 'Gruptaki tüm taşların sayıları aynı olmalıdır.' };
    }

    const usedColors = new Set();
    for (const t of regularTiles) {
      if (usedColors.has(t.color)) {
        return { valid: false, reason: 'Grupta aynı renkten birden fazla taş bulunamaz.' };
      }
      usedColors.add(t.color);
    }

    const allColors = ['red', 'blue', 'black', 'yellow'];
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

  static isValidMeld(tiles, indicator) {
    const runRes = this.isValidRun(tiles, indicator);
    if (runRes.valid) return runRes;

    const groupRes = this.isValidGroup(tiles, indicator);
    if (groupRes.valid) return groupRes;

    return { valid: false, reason: runRes.reason || groupRes.reason || 'Geçersiz per.' };
  }

  /**
   * Finds all possible runs from a list of tiles (including Okey Jokers and wrap-1)
   */
  static findAllRuns(tiles, indicator) {
    const runs = [];
    const colorGroups = { red: [], blue: [], black: [], yellow: [] };
    const jokers = [];

    for (const tile of tiles) {
      const p = this.getTileProps(tile, indicator);
      if (p.isOkey) {
        jokers.push(tile);
      } else if (colorGroups[p.color]) {
        colorGroups[p.color].push(tile);
      }
    }

    for (const color in colorGroups) {
      const cTiles = colorGroups[color];
      if (cTiles.length + jokers.length < 3) continue;

      const byVal = {};
      for (const t of cTiles) {
        const val = this.getTileProps(t, indicator).number;
        if (!byVal[val]) byVal[val] = [];
        byVal[val].push(t);
      }

      // Linear runs from len 3 up to 13
      for (let startVal = 1; startVal <= 11; startVal++) {
        for (let len = 3; len <= 13; len++) {
          if (startVal + len - 1 > 13) continue;

          const stepOptions = [];
          for (let step = 0; step < len; step++) {
            const targetVal = startVal + step;
            stepOptions.push({ targetVal, options: byVal[targetVal] || [] });
          }

          this._generateRunCombinations(stepOptions, jokers, indicator, runs);
        }
      }
    }

    return runs;
  }

  static _generateRunCombinations(stepOptions, jokers, indicator, runs) {
    const len = stepOptions.length;

    function build(stepIdx, currentTiles, usedTileIds, usedJokersCount) {
      if (stepIdx === len) {
        const check = ClientValidator.isValidRun(currentTiles, indicator);
        if (check.valid) {
          runs.push({ type: 'run', tiles: [...currentTiles], score: check.score });
        }
        return;
      }

      const { options } = stepOptions[stepIdx];
      const availableRegs = options.filter(t => !usedTileIds.has(t.id));

      if (availableRegs.length > 0) {
        for (const reg of availableRegs) {
          usedTileIds.add(reg.id);
          currentTiles.push(reg);
          build(stepIdx + 1, currentTiles, usedTileIds, usedJokersCount);
          currentTiles.pop();
          usedTileIds.delete(reg.id);
        }
      }

      if (usedJokersCount < jokers.length) {
        const j = jokers[usedJokersCount];
        if (!usedTileIds.has(j.id)) {
          usedTileIds.add(j.id);
          currentTiles.push(j);
          build(stepIdx + 1, currentTiles, usedTileIds, usedJokersCount + 1);
          currentTiles.pop();
          usedTileIds.delete(j.id);
        }
      }
    }

    build(0, [], new Set(), 0);
  }

  /**
   * Finds all possible groups from a list of tiles (including Okey Jokers)
   */
  static findAllGroups(tiles, indicator) {
    const groups = [];
    const numBuckets = {};
    const jokers = [];

    for (const tile of tiles) {
      const p = this.getTileProps(tile, indicator);
      if (p.isOkey) {
        jokers.push(tile);
      } else {
        if (!numBuckets[p.number]) numBuckets[p.number] = [];
        numBuckets[p.number].push(tile);
      }
    }

    const allColors = ['red', 'blue', 'black', 'yellow'];

    for (let num = 1; num <= 13; num++) {
      const bTiles = numBuckets[num] || [];
      if (bTiles.length + jokers.length < 3) continue;

      const byColor = {};
      for (const c of allColors) byColor[c] = [];
      for (const t of bTiles) {
        const c = this.getTileProps(t, indicator).color;
        if (byColor[c]) byColor[c].push(t);
      }

      const availableColors = allColors.filter(c => byColor[c].length > 0);

      // 4-tile group combinations (all 4 colors)
      if (availableColors.length === 4) {
        for (const r of byColor['red']) {
          for (const bl of byColor['blue']) {
            for (const bk of byColor['black']) {
              for (const y of byColor['yellow']) {
                const g = [r, bl, bk, y];
                const c = this.isValidGroup(g, indicator);
                if (c.valid) groups.push({ type: 'group', tiles: g, score: c.score });
              }
            }
          }
        }
      } else if (availableColors.length === 3 && jokers.length >= 1) {
        const c1 = availableColors[0], c2 = availableColors[1], c3 = availableColors[2];
        for (const t1 of byColor[c1]) {
          for (const t2 of byColor[c2]) {
            for (const t3 of byColor[c3]) {
              const g = [t1, t2, t3, jokers[0]];
              const c = this.isValidGroup(g, indicator);
              if (c.valid) groups.push({ type: 'group', tiles: g, score: c.score });
            }
          }
        }
      }

      // 3-tile group combinations (pick any 3 colors)
      for (let i = 0; i < availableColors.length; i++) {
        for (let j = i + 1; j < availableColors.length; j++) {
          for (let k = j + 1; k < availableColors.length; k++) {
            const c1 = availableColors[i], c2 = availableColors[j], c3 = availableColors[k];
            for (const t1 of byColor[c1]) {
              for (const t2 of byColor[c2]) {
                for (const t3 of byColor[c3]) {
                  const g = [t1, t2, t3];
                  const c = this.isValidGroup(g, indicator);
                  if (c.valid) groups.push({ type: 'group', tiles: g, score: c.score });
                }
              }
            }
          }
        }
      }

      // 2 colors + 1 joker
      if (jokers.length >= 1) {
        for (let i = 0; i < availableColors.length; i++) {
          for (let j = i + 1; j < availableColors.length; j++) {
            const c1 = availableColors[i], c2 = availableColors[j];
            for (const t1 of byColor[c1]) {
              for (const t2 of byColor[c2]) {
                const g = [t1, t2, jokers[0]];
                const c = this.isValidGroup(g, indicator);
                if (c.valid) groups.push({ type: 'group', tiles: g, score: c.score });
              }
            }
          }
        }
      }
    }

    return groups;
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
   * Finds all pairs in hand (with optional requiredTileId prioritization)
   */
  static findAllPairs(tiles, indicator, requiredTileId = null) {
    const pairs = [];
    const used = new Set();

    if (requiredTileId) {
      const reqIdx = tiles.findIndex(t => t.id === requiredTileId);
      if (reqIdx !== -1) {
        for (let j = 0; j < tiles.length; j++) {
          if (j === reqIdx) continue;
          const t1 = this.getTileProps(tiles[reqIdx], indicator);
          const t2 = this.getTileProps(tiles[j], indicator);
          if ((t1.color === t2.color && t1.number === t2.number) || t1.isOkey || t2.isOkey) {
            pairs.push([tiles[reqIdx], tiles[j]]);
            used.add(tiles[reqIdx].id);
            used.add(tiles[j].id);
            break;
          }
        }
      }
    }

    for (let i = 0; i < tiles.length; i++) {
      if (used.has(tiles[i].id)) continue;
      for (let j = i + 1; j < tiles.length; j++) {
        if (used.has(tiles[j].id)) continue;

        const t1 = this.getTileProps(tiles[i], indicator);
        const t2 = this.getTileProps(tiles[j], indicator);

        if ((t1.color === t2.color && t1.number === t2.number) || t1.isOkey || t2.isOkey) {
          pairs.push([tiles[i], tiles[j]]);
          used.add(tiles[i].id);
          used.add(tiles[j].id);
          break;
        }
      }
    }

    return pairs;
  }

  /**
   * Finds best non-overlapping valid melds maximizing score and tile count
   */
  static findBestMelds(tiles, indicator, requiredTileId = null) {
    const allRuns = this.findAllRuns(tiles, indicator);
    const allGroups = this.findAllGroups(tiles, indicator);

    // Deduplicate candidate melds by sorted tile IDs
    const seenCombos = new Set();
    const candidates = [];
    for (const c of [...allRuns, ...allGroups]) {
      const key = c.tiles.map(t => t.id).sort().join('-');
      if (!seenCombos.has(key)) {
        seenCombos.add(key);
        candidates.push(c);
      }
    }

    // Sort candidates by score descending, then length descending
    candidates.sort((a, b) => (b.score - a.score) || (b.tiles.length - a.tiles.length));

    if (candidates.length === 0) return { melds: [], score: 0 };

    let bestScore = 0;
    let bestTileCount = 0;
    let bestMelds = [];

    function search(index, curMelds, usedIds, curScore, curTileCount) {
      const containsRequired = !requiredTileId || usedIds.has(requiredTileId);
      if (containsRequired) {
        if (curScore > bestScore || (curScore === bestScore && curTileCount > bestTileCount)) {
          bestScore = curScore;
          bestTileCount = curTileCount;
          bestMelds = [...curMelds];
        }
      }

      for (let i = index; i < candidates.length; i++) {
        const c = candidates[i];
        const cIds = c.tiles.map(t => t.id);
        const hasOverlap = cIds.some(id => usedIds.has(id));

        if (!hasOverlap) {
          for (const id of cIds) usedIds.add(id);
          curMelds.push(c.tiles);

          search(i + 1, curMelds, usedIds, curScore + c.score, curTileCount + c.tiles.length);

          curMelds.pop();
          for (const id of cIds) usedIds.delete(id);
        }
      }
    }

    search(0, [], new Set(), 0, 0);

    if (bestScore > 0 && (!requiredTileId || bestMelds.some(m => m.some(t => t.id === requiredTileId)))) {
      return { melds: bestMelds, score: bestScore };
    }

    if (requiredTileId) {
      return { melds: [], score: 0, cannotUseRequired: true };
    }

    return { melds: bestMelds, score: bestScore };
  }

  /**
   * Decomposes any subset of tiles into valid melds if possible
   */
  static decomposeIntoMelds(tiles, indicator) {
    if (!tiles || tiles.length < 3) return { valid: false, melds: [], score: 0 };

    // 1. Check if the whole list is already 1 single valid meld
    const singleCheck = this.isValidMeld(tiles, indicator);
    if (singleCheck.valid) {
      return { valid: true, melds: [tiles], score: singleCheck.score };
    }

    // 2. Try finding best non-overlapping melds from selected tiles
    const best = this.findBestMelds(tiles, indicator);
    if (best.melds && best.melds.length > 0) {
      return { valid: true, melds: best.melds, score: best.score };
    }

    return { valid: false, melds: [], score: 0 };
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
    } else if (type === 'group') {
      const jokerIndices = [];
      tiles.forEach((t, idx) => {
        if (isJoker(t)) jokerIndices.push(idx);
      });

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
    } else if (type === 'pairs') {
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
   * Checks if a tile can be processed onto any opened melds on the table (İşlek Taş)
   */
  static isPlayableToTable(tile, allOpenedMelds, indicator) {
    if (!tile || !allOpenedMelds || allOpenedMelds.length === 0) {
      return false;
    }

    for (const meld of allOpenedMelds) {
      const processResult = this.canProcessTile(tile, meld, indicator);
      if (processResult && processResult.canProcess) {
        return true;
      }
    }

    return false;
  }
}

window.ClientValidator = ClientValidator;
