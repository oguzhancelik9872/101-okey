const assert = require('assert');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { COLORS } = require('../server/game/Constants');

console.log('--- Testing Subsequent Melds Opening (El Açtıktan Sonra Yeni Per Açma) ---');

const game = new OkeyGame('test_room_subsequent', 'standard');
game.addPlayer('p1', 'Player 1', 0, false);
game.addPlayer('p2', 'Player 2', 1, false);
game.addPlayer('p3', 'Player 3', 2, false);
game.addPlayer('p4', 'Player 4', 3, false);
game.startRound();

game.indicator = new Tile('ind_b1', COLORS.BLACK, 1);
game.currentTurn = 0;
game.turnState = 'DISCARD';

const p1 = game.players[0];
// Give Player 1 a hand with:
// 1. Initial 101+ opening melds:
// Red 11-12-13 (36 pts), Blue 11-12-13 (36 pts), Black 11-12-13 (36 pts) -> 108 pts
// 2. A small 3-tile run: Yellow 1-2-3 (6 pts)
// 3. Extra tile: Red 5
p1.hand = [
  new Tile('r11', COLORS.RED, 11),
  new Tile('r12', COLORS.RED, 12),
  new Tile('r13', COLORS.RED, 13),
  new Tile('b11', COLORS.BLUE, 11),
  new Tile('b12', COLORS.BLUE, 12),
  new Tile('b13', COLORS.BLUE, 13),
  new Tile('bk11', COLORS.BLACK, 11),
  new Tile('bk12', COLORS.BLACK, 12),
  new Tile('bk13', COLORS.BLACK, 13),
  new Tile('y1', COLORS.YELLOW, 1),
  new Tile('y2', COLORS.YELLOW, 2),
  new Tile('y3', COLORS.YELLOW, 3),
  new Tile('extra', COLORS.RED, 5)
];

// Step 1: First opening with 108 points
const firstOpenRes = game.openHand(0, [
  ['r11', 'r12', 'r13'],
  ['b11', 'b12', 'b13'],
  ['bk11', 'bk12', 'bk13']
]);
assert.strictEqual(firstOpenRes.success, true);
assert.strictEqual(firstOpenRes.score, 108);
assert.strictEqual(p1.opened, true);
assert.strictEqual(p1.hand.length, 4); // y1, y2, y3, extra
console.log('1. First 101+ openHand: PASSED (108 points)');

// Step 2: Open subsequent small 3-tile run (Yellow 1-2-3 = 6 points) - MUST SUCCEED WITH 0 MIN REQUIREMENT
const subsequentOpenRes = game.openHand(0, [
  ['y1', 'y2', 'y3']
]);
assert.strictEqual(subsequentOpenRes.success, true);
assert.strictEqual(subsequentOpenRes.score, 6);
assert.strictEqual(p1.hand.length, 1); // only extra left
console.log('2. Subsequent small meld openHand (Yellow 1-2-3 = 6 pts): PASSED');

// Step 3: Discard the last remaining tile to finish hand
const finishDiscard = game.discardTile(0, 'extra');
assert.strictEqual(finishDiscard.success, true);
assert.strictEqual(finishDiscard.finished, true);
console.log('3. Discard last tile and finish: PASSED');

console.log(' ALL SUBSEQUENT MELD TESTS PASSED SUCCESSFULLY!');
