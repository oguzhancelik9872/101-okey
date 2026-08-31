const assert = require('assert');
const Tile = require('../server/game/Tile');
const Validator = require('../server/game/Validator');
const BotAI = require('../server/game/BotAI');
const { COLORS } = require('../server/game/Constants');

console.log('--- Testing Okey Joker and Sahte Okey Thoroughly ---');

// Indicator is Red 8 => Real Okey (Joker) is Red 9
const indicator = new Tile('ind_red_8', COLORS.RED, 8);
const realOkey1 = new Tile('okey_tile_1', COLORS.RED, 9, false);
const realOkey2 = new Tile('okey_tile_2', COLORS.RED, 9, false);
const sahteOkey1 = new Tile('fake_okey_1', 'fake', 0, true);
const sahteOkey2 = new Tile('fake_okey_2', 'fake', 0, true);

// Verify Real Okey detection
assert.strictEqual(realOkey1.isOkey(indicator), true);
assert.strictEqual(realOkey2.isOkey(indicator), true);
assert.strictEqual(sahteOkey1.isOkey(indicator), false);

// Verify Sahte Okey inherits Red 9
assert.strictEqual(sahteOkey1.getColor(indicator), COLORS.RED);
assert.strictEqual(sahteOkey1.getValue(indicator), 9);

// 1. Run with Okey as middle tile: Black 4, OKEY (as Black 5), Black 6
const run1 = [
  new Tile('b4', COLORS.BLACK, 4),
  realOkey1,
  new Tile('b6', COLORS.BLACK, 6)
];
const res1 = Validator.isValidRun(run1, indicator);
assert.strictEqual(res1.valid, true);
assert.strictEqual(res1.score, 15);
console.log('1. Run with Okey Joker as middle tile (Black 4-OKEY-6): PASSED');

// 2. Run with Okey as end tile: Yellow 11, Yellow 12, OKEY (as Yellow 13)
const run2 = [
  new Tile('y11', COLORS.YELLOW, 11),
  new Tile('y12', COLORS.YELLOW, 12),
  realOkey1
];
const res2 = Validator.isValidRun(run2, indicator);
assert.strictEqual(res2.valid, true);
assert.strictEqual(res2.score, 36);
console.log('2. Run with Okey Joker as end tile (Yellow 11-12-OKEY): PASSED');

// 3. Group with Okey: Red 10, Blue 10, OKEY (as Black/Yellow 10)
const group1 = [
  new Tile('r10', COLORS.RED, 10),
  new Tile('b10', COLORS.BLUE, 10),
  realOkey1
];
const gRes1 = Validator.isValidGroup(group1, indicator);
assert.strictEqual(gRes1.valid, true);
assert.strictEqual(gRes1.score, 30);
console.log('3. Group with Okey Joker (Red 10, Blue 10, OKEY): PASSED');

// 4. Run with Sahte Okey: Red 7, Red 8, Sahte Okey (Red 9), Red 10
const runSahte = [
  new Tile('r7', COLORS.RED, 7),
  new Tile('r8', COLORS.RED, 8),
  sahteOkey1,
  new Tile('r10', COLORS.RED, 10)
];
const sRes = Validator.isValidRun(runSahte, indicator);
assert.strictEqual(sRes.valid, true);
assert.strictEqual(sRes.score, 34);
console.log('4. Run with Sahte Okey (Red 7-8-Sahte-10): PASSED');

// 5. Group with Sahte Okey: Sahte Okey (Red 9), Blue 9, Black 9
const groupSahte = [
  sahteOkey1,
  new Tile('b9', COLORS.BLUE, 9),
  new Tile('bl9', COLORS.BLACK, 9)
];
const gsRes = Validator.isValidGroup(groupSahte, indicator);
assert.strictEqual(gsRes.valid, true);
assert.strictEqual(gsRes.score, 27);
console.log('5. Group with Sahte Okey (Sahte Red 9, Blue 9, Black 9): PASSED');

console.log(' ALL OKEY & SAHTE OKEY UNIT TESTS PASSED!');
