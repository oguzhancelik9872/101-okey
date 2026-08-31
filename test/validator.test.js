const assert = require('assert');
const Tile = require('../server/game/Tile');
const Validator = require('../server/game/Validator');
const { COLORS } = require('../server/game/Constants');

console.log('--- Testing 101 Okey Validator ---');

// Test Indicator: Red 8 => Real Okey is Red 9
const indicator = new Tile('ind', COLORS.RED, 8);

// 1. Seri (Run) Tests
console.log('1. Testing Runs (Seriler)...');

// Valid: Red 4, 5, 6
const run1 = [
  new Tile('1', COLORS.RED, 4),
  new Tile('2', COLORS.RED, 5),
  new Tile('3', COLORS.RED, 6)
];
const res1 = Validator.isValidRun(run1, indicator);
assert.strictEqual(res1.valid, true);
assert.strictEqual(res1.score, 15);

// Valid: Blue 12, 13, 1 (12-13-1 rule)
const run2 = [
  new Tile('4', COLORS.BLUE, 12),
  new Tile('5', COLORS.BLUE, 13),
  new Tile('6', COLORS.BLUE, 1)
];
const res2 = Validator.isValidRun(run2, indicator);
assert.strictEqual(res2.valid, true);
assert.strictEqual(res2.score, 26); // 12 + 13 + 1 = 26

// Invalid: Blue 13, 1, 2 (13-1-2 is not allowed)
const runInvalid = [
  new Tile('7', COLORS.BLUE, 13),
  new Tile('8', COLORS.BLUE, 1),
  new Tile('9', COLORS.BLUE, 2)
];
const resInvalid = Validator.isValidRun(runInvalid, indicator);
assert.strictEqual(resInvalid.valid, false);

// Valid with Okey (Joker: Red 9) substituting Black 6 in [Black 5, Red 9, Black 7]
const runJoker = [
  new Tile('10', COLORS.BLACK, 5),
  new Tile('11', COLORS.RED, 9), // Joker!
  new Tile('12', COLORS.BLACK, 7)
];
const resJoker = Validator.isValidRun(runJoker, indicator);
assert.strictEqual(resJoker.valid, true);
assert.strictEqual(resJoker.score, 18); // 5 + 6 + 7 = 18

// 2. Sahte Okey Tests
console.log('2. Testing Sahte Okey behavior...');
// Sahte Okey should behave as Red 9 (since indicator is Red 8)
const sahteOkey = new Tile('fake1', 'fake', 0, true);
assert.strictEqual(sahteOkey.getColor(indicator), COLORS.RED);
assert.strictEqual(sahteOkey.getValue(indicator), 9);

const runWithSahte = [
  new Tile('13', COLORS.RED, 7),
  new Tile('14', COLORS.RED, 8),
  sahteOkey, // Acts as Red 9
  new Tile('15', COLORS.RED, 10)
];
const resSahte = Validator.isValidRun(runWithSahte, indicator);
assert.strictEqual(resSahte.valid, true);
assert.strictEqual(resSahte.score, 34); // 7 + 8 + 9 + 10 = 34

// 3. Grup (Sets) Tests
console.log('3. Testing Groups (Gruplar)...');
const group1 = [
  new Tile('16', COLORS.RED, 11),
  new Tile('17', COLORS.BLUE, 11),
  new Tile('18', COLORS.BLACK, 11)
];
const resGroup1 = Validator.isValidGroup(group1, indicator);
assert.strictEqual(resGroup1.valid, true);
assert.strictEqual(resGroup1.score, 33);

// Group with duplicate color: should fail
const groupDup = [
  new Tile('19', COLORS.RED, 11),
  new Tile('20', COLORS.RED, 11),
  new Tile('21', COLORS.BLACK, 11)
];
const resGroupDup = Validator.isValidGroup(groupDup, indicator);
assert.strictEqual(resGroupDup.valid, false);

// 4. El Açma (101 Opening) Tests
console.log('4. Testing 101 Points Opening...');
const meldA = [
  new Tile('a1', COLORS.BLUE, 11),
  new Tile('a2', COLORS.BLUE, 12),
  new Tile('a3', COLORS.BLUE, 13)
]; // 36
const meldB = [
  new Tile('b1', COLORS.RED, 12),
  new Tile('b2', COLORS.BLUE, 12),
  new Tile('b3', COLORS.BLACK, 12),
  new Tile('b4', COLORS.YELLOW, 12)
]; // 48
const meldC = [
  new Tile('c1', COLORS.YELLOW, 8),
  new Tile('c2', COLORS.YELLOW, 9),
  new Tile('c3', COLORS.YELLOW, 10)
]; // 27
// Total: 36 + 48 + 27 = 111 (>= 101)
const openingRes = Validator.validateOpening([meldA, meldB, meldC], indicator, 101);
assert.strictEqual(openingRes.valid, true);
assert.strictEqual(openingRes.score, 111);

// Opening below 101: 36 + 48 = 84 (< 101)
const openingFail = Validator.validateOpening([meldA, meldB], indicator, 101);
assert.strictEqual(openingFail.valid, false);
assert.strictEqual(openingFail.score, 84);

// 5. Çift Açma (Pairs Opening) Tests
console.log('5. Testing Pairs Opening...');
const pairs = [
  [new Tile('p1', COLORS.RED, 3), new Tile('p2', COLORS.RED, 3)],
  [new Tile('p3', COLORS.BLUE, 7), new Tile('p4', COLORS.BLUE, 7)],
  [new Tile('p5', COLORS.BLACK, 12), new Tile('p6', COLORS.BLACK, 12)],
  [new Tile('p7', COLORS.YELLOW, 1), new Tile('p8', COLORS.YELLOW, 1)],
  [new Tile('p9', COLORS.RED, 9), new Tile('p10', COLORS.BLUE, 5)] // Joker (Red 9) + Blue 5
];
const pairRes = Validator.validatePairsOpening(pairs, indicator, 5);
assert.strictEqual(pairRes.valid, true);
assert.strictEqual(pairRes.count, 5);

// 6. İşleme (Processing) & İşlek Taş Tests
console.log('6. Testing Processing & İşlek taş...');
const targetRun = {
  type: 'run',
  tiles: [
    new Tile('m1', COLORS.RED, 5),
    new Tile('m2', COLORS.RED, 6),
    new Tile('m3', COLORS.RED, 7)
  ]
};

// Can process Red 4 at start
const canProcess4 = Validator.canProcessTile(new Tile('t4', COLORS.RED, 4), targetRun, indicator);
assert.strictEqual(canProcess4.canProcess, true);

// Can process Red 8 at end
const canProcess8 = Validator.canProcessTile(new Tile('t8', COLORS.RED, 8), targetRun, indicator);
assert.strictEqual(canProcess8.canProcess, true);

// Cannot process Blue 8
const cannotProcess = Validator.canProcessTile(new Tile('tb8', COLORS.BLUE, 8), targetRun, indicator);
assert.strictEqual(cannotProcess.canProcess, false);

// Check isPlayableToTable
const isPlayable = Validator.isPlayableToTable(new Tile('t4', COLORS.RED, 4), [targetRun], indicator);
assert.strictEqual(isPlayable, true);

console.log(' ALL VALIDATOR TESTS PASSED SUCCESSFULLY!');
