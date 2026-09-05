const Validator = require('./Validator');
const { COLORS } = require('./Constants');

class BotAI {
  /**
   * Finds all possible valid runs in a given hand (including Okey Jokers)
   */
  static findAllRuns(hand, indicator) {
    const runs = [];
    const colorGroups = { [COLORS.RED]: [], [COLORS.BLUE]: [], [COLORS.BLACK]: [], [COLORS.YELLOW]: [] };
    const jokers = [];

    for (const tile of hand) {
      if (tile.isOkey(indicator)) {
        jokers.push(tile);
      } else {
        const c = tile.getColor(indicator);
        if (colorGroups[c]) {
          colorGroups[c].push(tile);
        }
      }
    }

    for (const color in colorGroups) {
      const tiles = colorGroups[color];
      if (tiles.length + jokers.length < 3) continue;

      const uniqueTilesByVal = {};
      for (const t of tiles) {
        const val = t.getValue(indicator);
        if (!uniqueTilesByVal[val]) uniqueTilesByVal[val] = [];
        uniqueTilesByVal[val].push(t);
      }

      for (let startVal = 1; startVal <= 11; startVal++) {
        for (let len = 3; len <= 7; len++) {
          if (startVal + len - 1 > 13) continue;

          const runCandidate = [];
          let availableJokers = [...jokers];
          let valid = true;

          for (let step = 0; step < len; step++) {
            const targetVal = startVal + step;

            if (uniqueTilesByVal[targetVal] && uniqueTilesByVal[targetVal].length > 0) {
              runCandidate.push(uniqueTilesByVal[targetVal][0]);
            } else if (availableJokers.length > 0) {
              runCandidate.push(availableJokers.pop());
            } else {
              valid = false;
              break;
            }
          }

          if (valid && runCandidate.length >= 3) {
            const check = Validator.isValidRun(runCandidate, indicator);
            if (check.valid) {
              runs.push({ type: 'run', tiles: runCandidate, score: check.score });
            }
          }
        }
      }
    }

    return runs;
  }

  /**
   * Finds all possible valid groups (same number, diff colors, including Okey Jokers)
   */
  static findAllGroups(hand, indicator) {
    const groups = [];
    const numberBuckets = {};
    const jokers = [];

    for (const tile of hand) {
      if (tile.isOkey(indicator)) {
        jokers.push(tile);
      } else {
        const val = tile.getValue(indicator);
        if (!numberBuckets[val]) numberBuckets[val] = [];
        numberBuckets[val].push(tile);
      }
    }

    for (let num = 1; num <= 13; num++) {
      const tilesWithVal = numberBuckets[num] || [];
      const uniqueByColor = {};
      for (const t of tilesWithVal) {
        const c = t.getColor(indicator);
        if (!uniqueByColor[c]) uniqueByColor[c] = t;
      }

      const distinctTiles = Object.values(uniqueByColor);

      if (distinctTiles.length + jokers.length >= 3 && distinctTiles.length >= 2) {
        // 3-tile group
        if (distinctTiles.length === 3) {
          const check3 = Validator.isValidGroup(distinctTiles, indicator);
          if (check3.valid) groups.push({ type: 'group', tiles: distinctTiles, score: check3.score });
        } else if (distinctTiles.length === 2 && jokers.length >= 1) {
          for (const jTile of jokers) {
            const g3 = [...distinctTiles, jTile];
            const check3 = Validator.isValidGroup(g3, indicator);
            if (check3.valid) groups.push({ type: 'group', tiles: g3, score: check3.score });
          }
        }

        // 4-tile group
        if (distinctTiles.length === 4) {
          const check4 = Validator.isValidGroup(distinctTiles, indicator);
          if (check4.valid) groups.push({ type: 'group', tiles: distinctTiles, score: check4.score });
        } else if (distinctTiles.length === 3 && jokers.length >= 1) {
          for (const jTile of jokers) {
            const g4 = [...distinctTiles, jTile];
            const check4 = Validator.isValidGroup(g4, indicator);
            if (check4.valid) groups.push({ type: 'group', tiles: g4, score: check4.score });
          }
        } else if (distinctTiles.length === 2 && jokers.length >= 2) {
          const g4 = [...distinctTiles, jokers[0], jokers[1]];
          const check4 = Validator.isValidGroup(g4, indicator);
          if (check4.valid) groups.push({ type: 'group', tiles: g4, score: check4.score });
        }
      }
    }

    return groups;
  }

  /**
   * Finds all pairs in hand
   */
  static findAllPairs(hand, indicator) {
    const pairs = [];
    const used = new Set();

    for (let i = 0; i < hand.length; i++) {
      if (used.has(hand[i].id)) continue;
      for (let j = i + 1; j < hand.length; j++) {
        if (used.has(hand[j].id)) continue;

        const t1 = Validator.getTileProps(hand[i], indicator);
        const t2 = Validator.getTileProps(hand[j], indicator);

        if ((t1.color === t2.color && t1.number === t2.number) || t1.isOkey || t2.isOkey) {
          pairs.push([hand[i], hand[j]]);
          used.add(hand[i].id);
          used.add(hand[j].id);
          break;
        }
      }
    }

    return pairs;
  }

  /**
   * Finds the best non-overlapping combination of melds maximizing total score
   */
  static findBestMelds(hand, indicator) {
    const allRuns = this.findAllRuns(hand, indicator);
    const allGroups = this.findAllGroups(hand, indicator);
    const allCandidates = [...allRuns, ...allGroups];

    if (allCandidates.length === 0) {
      return { melds: [], score: 0 };
    }

    let bestScore = 0;
    let bestMelds = [];

    // Helper backtracking function
    function search(index, currentMelds, usedTileIds, currentScore) {
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestMelds = [...currentMelds];
      }

      for (let i = index; i < allCandidates.length; i++) {
        const candidate = allCandidates[i];
        const candidateIds = candidate.tiles.map(t => t.id);

        // Check overlap
        const hasOverlap = candidateIds.some(id => usedTileIds.has(id));
        if (!hasOverlap) {
          for (const id of candidateIds) usedTileIds.add(id);
          currentMelds.push(candidate.tiles);

          search(i + 1, currentMelds, usedTileIds, currentScore + candidate.score);

          currentMelds.pop();
          for (const id of candidateIds) usedTileIds.delete(id);
        }
      }
    }

    search(0, [], new Set(), 0);

    return { melds: bestMelds, score: bestScore };
  }

  /**
   * Decides which tile the bot should discard.
   * Avoids discarding Okey, avoids işlek tiles if possible, prefers lonely/useless tiles.
   */
  static pickDiscardTile(hand, indicator, allOpenedMelds = [], options = {}) {
    if (!hand || hand.length === 0) return null;

    // Filter out real Okeys if we have any other option
    const nonOkeys = hand.filter(t => !t.isOkey(indicator));
    const pool = nonOkeys.length > 0 ? nonOkeys : hand;

    // Categorize tiles by whether they are "işlek"
    const safeTiles = [];
    const playableTiles = [];

    for (const t of pool) {
      if (Validator.isPlayableToTable(t, allOpenedMelds, indicator)) {
        playableTiles.push(t);
      } else {
        safeTiles.push(t);
      }
    }

    const candidateList = safeTiles.length > 0 ? safeTiles : playableTiles;

    // Find best melds to keep
    const { melds } = this.findBestMelds(hand, indicator);
    const meldTileIds = new Set();
    for (const m of melds) {
      for (const t of m) meldTileIds.add(t.id);
    }

    // Prefer tiles not in best melds
    const nonMeldCandidates = candidateList.filter(t => !meldTileIds.has(t.id));
    const targetPool = nonMeldCandidates.length > 0 ? nonMeldCandidates : candidateList;

    // Count color/number neighbor support for each candidate
    let bestTile = targetPool[0];
    let lowestRisk = Infinity;

    for (const t of targetPool) {
      let support = 0;
      const c = t.getColor(indicator);
      const num = t.getValue(indicator);

      for (const other of hand) {
        if (other.id === t.id) continue;
        const oc = other.getColor(indicator);
        const onum = other.getValue(indicator);

        // Same number diff color (group potential)
        if (onum === num && oc !== c) support += 2;
        // Same color adjacent number (run potential)
        if (oc === c && Math.abs(onum - num) <= 2) support += 2;
      }

      // Before the next player opens, high tiles are dangerous: they can be
      // taken from the side to open and make the bot pay 10x their value.
      const receiverRiskMultiplier = options.nextPlayerOpened ? 0.45 : 2.2;
      const highTileRisk = num * receiverRiskMultiplier;
      const structureRisk = support * 4;
      const duplicateCount = hand.filter(other => other.id !== t.id && other.getColor(indicator) === c && other.getValue(indicator) === num).length;
      const duplicateSafety = duplicateCount > 0 ? -3 : 0;
      const risk = highTileRisk + structureRisk + duplicateSafety;

      if (risk < lowestRisk || (risk === lowestRisk && num < bestTile.getValue(indicator))) {
        lowestRisk = risk;
        bestTile = t;
      }
    }

    return bestTile;
  }
}

module.exports = BotAI;
