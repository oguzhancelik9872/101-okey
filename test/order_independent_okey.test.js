const assert = require('assert');
const Tile = require('../server/game/Tile');
const Validator = require('../server/game/Validator');
const { COLORS } = require('../server/game/Constants');

console.log('--- Testing Order-Independent Okey & Run Rules ---');

const indicator = new Tile('ind_red_8', COLORS.RED, 8); // Okey is Red 9
const realOkey = new Tile('okey_1', COLORS.RED, 9, false);
const sahteOkey = new Tile('fake_1', 'fake', 0, true);

// 1. Shuffled run with Joker in middle: [Black 6, Real Okey, Black 4]
const runShuffled1 = [
  new Tile('b6', COLORS.BLACK, 6),
  realOkey,
  new Tile('b4', COLORS.BLACK, 4)
];
const rRes1 = Validator.isValidRun(runShuffled1, indicator);
assert.strictEqual(rRes1.valid, true);
assert.strictEqual(rRes1.score, 15);
console.log('1. Shuffled run with Joker in middle [6, OKEY, 4]: PASSED');

// 2. Reverse ordered run: [Blue 13, Blue 12, Blue 11]
const runReverse = [
  new Tile('bl13', COLORS.BLUE, 13),
  new Tile('bl12', COLORS.BLUE, 12),
  new Tile('bl11', COLORS.BLUE, 11)
];
const rRes2 = Validator.isValidRun(runReverse, indicator);
assert.strictEqual(rRes2.valid, true);
assert.strictEqual(rRes2.score, 36);
console.log('2. Reverse ordered run [13, 12, 11]: PASSED');

// 3. Shuffled group with Joker: [Blue 10, Red 10, Real Okey]
const groupShuffled = [
  new Tile('b10', COLORS.BLUE, 10),
  new Tile('r10', COLORS.RED, 10),
  realOkey
];
const gRes = Validator.isValidGroup(groupShuffled, indicator);
assert.strictEqual(gRes.valid, true);
assert.strictEqual(gRes.score, 30);
console.log('3. Shuffled group with Joker [Blue 10, Red 10, OKEY]: PASSED');

// 4. Sahte Okey (plays as Red 9) in shuffled run [Red 10, Sahte Okey, Red 8]
const runSahteShuffled = [
  new Tile('r10', COLORS.RED, 10),
  sahteOkey,
  new Tile('r8', COLORS.RED, 8)
];
const sRes = Validator.isValidRun(runSahteShuffled, indicator);
assert.strictEqual(sRes.valid, true);
assert.strictEqual(sRes.score, 27);
console.log('4. Sahte Okey in shuffled run [Red 10, Sahte, Red 8]: PASSED');

console.log(' ALL ORDER-INDEPENDENT OKEY TESTS PASSED!');
