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

    // Strict 1-13 consecutive numbers (13'ün yanına 1 konulamaz, 13-1 sadece okey belirlenirken geçerlidir)
    const regularValues = regularTiles.map(t => ({
      id: t.id,
      origNumber: t.number,
      val: t.number
    })).sort((a, b) => a.val - b.val);

    for (let startNum = 1; startNum <= 13 - len + 1; startNum++) {
      let isMatch = true;
      let regularIdx = 0;
      let usedJokersCount = 0;
      const substituted = [];

      for (let i = 0; i < len; i++) {
        const expectedNum = startNum + i;

        if (expectedNum > 13) {
          isMatch = false;
          break;
        }

        if (regularIdx < regularValues.length && regularValues[regularIdx].val === expectedNum) {
          const reg = regularValues[regularIdx++];
          substituted.push({
            id: reg.id,
            isOkey: false,
            substitutedNumber: reg.origNumber,
            score: reg.origNumber
          });
        } else if (usedJokersCount < jokers.length) {
          const jokerTile = jokers[usedJokersCount++];
          substituted.push({
            id: jokerTile.id,
            isOkey: true,
            substitutedNumber: expectedNum,
            score: expectedNum
          });
        } else {
          isMatch = false;
          break;
        }
      }

      if (isMatch && regularIdx === regularValues.length && usedJokersCount === jokers.length) {
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
   * Finds all possible runs from a list of tiles (including Okey Jokers)
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

      for (let startVal = 1; startVal <= 11; startVal++) {
        for (let len = 3; len <= 7; len++) {
          if (startVal + len - 1 > 13) continue;

          const candidate = [];
          let availableJokers = [...jokers];
          let valid = true;

          for (let step = 0; step < len; step++) {
            const targetVal = startVal + step;

            if (byVal[targetVal] && byVal[targetVal].length > 0) {
              candidate.push(byVal[targetVal][0]);
            } else if (availableJokers.length > 0) {
              candidate.push(availableJokers.pop());
            } else {
              valid = false;
              break;
            }
          }

          if (valid && candidate.length >= 3) {
            const check = this.isValidRun(candidate, indicator);
            if (check.valid) {
              runs.push({ type: 'run', tiles: candidate, score: check.score });
            }
          }
        }
      }
    }

    return runs;
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

    for (let num = 1; num <= 13; num++) {
      const bTiles = numBuckets[num] || [];
      const byColor = {};
      for (const t of bTiles) {
        const c = this.getTileProps(t, indicator).color;
        if (!byColor[c]) byColor[c] = t;
      }

      const distinct = Object.values(byColor);

      if (distinct.length + jokers.length >= 3 && distinct.length >= 2) {
        // 3-tile group
        if (distinct.length === 3) {
          const c3 = this.isValidGroup(distinct, indicator);
          if (c3.valid) groups.push({ type: 'group', tiles: distinct, score: c3.score });
        } else if (distinct.length === 2 && jokers.length >= 1) {
          const g3 = [...distinct, jokers[0]];
          const c3 = this.isValidGroup(g3, indicator);
          if (c3.valid) groups.push({ type: 'group', tiles: g3, score: c3.score });
        }

        // 4-tile group
        if (distinct.length === 4) {
          const c4 = this.isValidGroup(distinct, indicator);
          if (c4.valid) groups.push({ type: 'group', tiles: distinct, score: c4.score });
        } else if (distinct.length === 3 && jokers.length >= 1) {
          const g4 = [...distinct, jokers[0]];
          const c4 = this.isValidGroup(g4, indicator);
          if (c4.valid) groups.push({ type: 'group', tiles: g4, score: c4.score });
        }
      }
    }

    return groups;
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
   * Finds best non-overlapping valid melds maximizing score (with optional requiredTileId constraint)
   */
  static findBestMelds(tiles, indicator, requiredTileId = null) {
    const allRuns = this.findAllRuns(tiles, indicator);
    const allGroups = this.findAllGroups(tiles, indicator);
    const candidates = [...allRuns, ...allGroups];

    if (candidates.length === 0) return { melds: [], score: 0 };

    let bestScore = 0;
    let bestMelds = [];

    function search(index, curMelds, usedIds, curScore) {
      const containsRequired = !requiredTileId || usedIds.has(requiredTileId);
      if (curScore > bestScore && containsRequired) {
        bestScore = curScore;
        bestMelds = [...curMelds];
      }

      for (let i = index; i < candidates.length; i++) {
        const c = candidates[i];
        const cIds = c.tiles.map(t => t.id);
        const hasOverlap = cIds.some(id => usedIds.has(id));

        if (!hasOverlap) {
          for (const id of cIds) usedIds.add(id);
          curMelds.push(c.tiles);

          search(i + 1, curMelds, usedIds, curScore + c.score);

          curMelds.pop();
          for (const id of cIds) usedIds.delete(id);
        }
      }
    }

    search(0, [], new Set(), 0);

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
      const jokerIndices = [];
      tiles.forEach((t, idx) => {
        if (isJoker(t)) jokerIndices.push(idx);
      });

      for (const jIdx of jokerIndices) {
        const candidateTiles = [...tiles];
        candidateTiles[jIdx] = tile;

        const checkReplaced = this.isValidRun(candidateTiles, indicator);
        if (checkReplaced.valid) {
          const sorted = [...candidateTiles].sort((a, b) => {
            const pa = this.getTileProps(a, indicator);
            const pb = this.getTileProps(b, indicator);
            return pa.number - pb.number;
          });

          return {
            canProcess: true,
            isOkeySteal: true,
            stolenOkeyTile: tiles[jIdx],
            position: 'replace_joker',
            newTiles: sorted
          };
        }
      }

      const combined = [...tiles, tile];
      const result = this.isValidRun(combined, indicator);
      if (result.valid) {
        const sorted = [...combined].sort((a, b) => {
          const pa = this.getTileProps(a, indicator);
          const pb = this.getTileProps(b, indicator);
          return pa.number - pb.number;
        });

        return { canProcess: true, isOkeySteal: false, position: 'add', newTiles: sorted };
      }
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
}

window.ClientValidator = ClientValidator;
