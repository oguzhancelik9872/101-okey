const test = require('node:test');
const assert = require('node:assert/strict');
const BotAI = require('../server/game/BotAI');
const Tile = require('../server/game/Tile');

test('Bot avoids feeding an unopened next player a high loose tile', () => {
  const indicator = new Tile('indicator', 'red', 8);
  const hand = [
    new Tile('low', 'yellow', 2),
    new Tile('high', 'black', 13),
    new Tile('support-a', 'blue', 6),
    new Tile('support-b', 'blue', 7)
  ];

  const picked = BotAI.pickDiscardTile(hand, indicator, [], { nextPlayerOpened: false });
  assert.equal(picked.id, 'low');
});

test('Bot opening choice reacts to table pressure instead of fixed turn counters', () => {
  const indicator = new Tile('indicator', 'red', 1);
  const hand = [];
  for (const number of [9, 11, 12, 13]) {
    for (const color of ['red', 'blue', 'black']) {
      hand.push(new Tile(`${color}-${number}`, color, number));
    }
  }
  hand.push(
    new Tile('extra-1', 'yellow', 1),
    new Tile('extra-2', 'blue', 3),
    new Tile('extra-3', 'black', 5),
    new Tile('extra-4', 'yellow', 7)
  );
  const best = BotAI.findBestMelds(hand, indicator);
  assert.equal(best.score, 135);

  const calmDecision = BotAI.shouldOpenMelds({
    hand,
    melds: best.melds,
    score: best.score,
    minScore: 101,
    indicator,
    deckRemaining: 80,
    opponentSmallestHand: 20,
    riskTolerance: 0.25
  });
  const pressuredDecision = BotAI.shouldOpenMelds({
    hand,
    melds: best.melds,
    score: best.score,
    minScore: 101,
    indicator,
    opponentsOpened: true,
    deckRemaining: 35,
    opponentSmallestHand: 10,
    riskTolerance: 0.25
  });

  assert.equal(calmDecision, false);
  assert.equal(pressuredDecision, true);
});
