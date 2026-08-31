const assert = require('assert');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { COLORS } = require('../server/game/Constants');

console.log('--- Testing Mandatory Discard Tile Usage Rules ---');

const game = new OkeyGame('test_room', 'standard');
game.addPlayer('p1', 'Player 1', 0, false);
game.addPlayer('p2', 'Player 2', 1, false);
game.addPlayer('p3', 'Player 3', 2, false);
game.addPlayer('p4', 'Player 4', 3, false);
game.startRound();

// Set indicator as Black 1 (Okey is Black 2)
game.indicator = new Tile('ind_b1', COLORS.BLACK, 1);

// Set turn to player 1 (seat 1), turnState = 'DRAW'
game.currentTurn = 1;
game.turnState = 'DRAW';

// Place Red 10 into left player's (seat 0) discard pile
const discardTile = new Tile('discard_red_10', COLORS.RED, 10);
game.discards[0] = [discardTile];

// Give Player 1 a hand with:
// Red 8, Red 9 (to combine with Red 10 for 8-9-10 = 27 pts)
// Blue 11-12-13 (36 pts)
// Black 11-12-13 (36 pts)
// Yellow 11-12-13 (36 pts)
// Total score = 27 + 36 + 36 + 36 = 135 pts (>= 101)
const p1 = game.players[1];
p1.hand = [
  new Tile('r8', COLORS.RED, 8),
  new Tile('r9', COLORS.RED, 9),
  new Tile('bl11', COLORS.BLUE, 11),
  new Tile('bl12', COLORS.BLUE, 12),
  new Tile('bl13', COLORS.BLUE, 13),
  new Tile('bk11', COLORS.BLACK, 11),
  new Tile('bk12', COLORS.BLACK, 12),
  new Tile('bk13', COLORS.BLACK, 13),
  new Tile('y11', COLORS.YELLOW, 11),
  new Tile('y12', COLORS.YELLOW, 12),
  new Tile('y13', COLORS.YELLOW, 13),
  new Tile('extra1', COLORS.RED, 1),
  new Tile('extra2', COLORS.RED, 2)
];

// 1. Draw tile from discard
const drawRes = game.drawTile(1, 'discard');
assert.strictEqual(drawRes.success, true);
assert.strictEqual(game.drawnFromDiscard.tile.id, 'discard_red_10');
assert.strictEqual(game.turnState, 'DISCARD');
console.log('1. Draw from discard: PASSED');

// 2. Try to discard a normal tile without using discardTile: MUST BE BLOCKED
const discardBlockRes = game.discardTile(1, 'extra1');
assert.strictEqual(discardBlockRes.success, false);
assert.ok(discardBlockRes.reason.includes('Yandan aldığınız taşı'));
console.log('2. Block normal discard when drawn tile unused: PASSED');

// 3. Try to open melds that DO NOT include the drawn discard tile: MUST BE BLOCKED
// Melds: Blue 11-12-13 (36), Black 11-12-13 (36), Yellow 11-12-13 (36) -> 108 pts (>= 101)
const invalidOpening = game.openHand(1, [
  ['bl11', 'bl12', 'bl13'],
  ['bk11', 'bk12', 'bk13'],
  ['y11', 'y12', 'y13']
]);
assert.strictEqual(invalidOpening.success, false);
assert.ok(invalidOpening.reason.includes('Yandan aldığınız taşı'));
console.log('3. Block openHand without using drawn discard tile: PASSED');

// 4. Open melds that DO include the drawn discard tile: Red 8-9-10 (27) + Blue 11-12-13 (36) + Black 11-12-13 (36) + Yellow 11-12-13 (36) = 135 pts
const validOpening = game.openHand(1, [
  ['r8', 'r9', 'discard_red_10'],
  ['bl11', 'bl12', 'bl13'],
  ['bk11', 'bk12', 'bk13'],
  ['y11', 'y12', 'y13']
]);
assert.strictEqual(validOpening.success, true);
assert.strictEqual(game.drawnFromDiscard, null); // Successfully cleared
assert.strictEqual(p1.opened, true);
console.log('4. Open melds WITH drawn discard tile: PASSED');

// 5. Now discarding remaining tile 'extra1' succeeds
const finalDiscard = game.discardTile(1, 'extra1');
assert.strictEqual(finalDiscard.success, true);
console.log('5. Discard tile after opening with discard tile: PASSED');

// 6. Test Return Discard Tile (Taşı Geri Bırak)
// Player 2 is now up, seat 1 (player 1) just discarded 'extra1'
assert.strictEqual(game.currentTurn, 2);
assert.strictEqual(game.turnState, 'DRAW');

const p2Draw = game.drawTile(2, 'discard');
assert.strictEqual(p2Draw.success, true);
assert.strictEqual(game.drawnFromDiscard.tile.id, 'extra1');

// Player 2 returns the tile
const returnRes = game.returnDiscardTile(2);
assert.strictEqual(returnRes.success, true);
assert.strictEqual(game.drawnFromDiscard, null);
assert.strictEqual(game.turnState, 'DRAW');
assert.strictEqual(game.discards[1][game.discards[1].length - 1].id, 'extra1');
console.log('6. Return Discard Tile (Taşı Geri Bırak): PASSED');

console.log(' ALL MANDATORY DISCARD TILE USAGE TESTS PASSED!');
