const test = require('node:test');
const assert = require('node:assert');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

test('Penalties & Multi-round 101 Okey Rules', async (t) => {
  console.log('--- Testing 101 Okey Penalties and Multi-Round Rotation ---');

  // 1. Initialise game with 4 players and default 3 rounds
  const game = new OkeyGame('test_room', { targetRounds: 3 });
  assert.strictEqual(game.targetRounds, 3);
  assert.strictEqual(game.currentRound, 1);

  for (let i = 0; i < 4; i++) {
    game.addPlayer(`p_${i}`, `Oyuncu ${i + 1}`, false, 'female', null, i);
  }

  game.startRound();
  assert.strictEqual(game.state, GAME_STATES.PLAYING);
  assert.strictEqual(game.firstPlayerIndex, 0);
  assert.strictEqual(game.currentTurn, 0);

  // 2. Test 153+ Open Penalty to Opponent Team
  console.log('1. Testing 153+ Open Penalty to Opponents...');
  game.indicator = new Tile('ind_test', 'yellow', 1); // Okey is yellow 2

  const run1 = [new Tile('red_11', 'red', 11), new Tile('red_12', 'red', 12), new Tile('red_13', 'red', 13)];
  const run2 = [new Tile('black_11', 'black', 11), new Tile('black_12', 'black', 12), new Tile('black_13', 'black', 13)];
  const run3 = [new Tile('blue_11', 'blue', 11), new Tile('blue_12', 'blue', 12), new Tile('blue_13', 'blue', 13)];
  const run4 = [new Tile('yellow_11', 'yellow', 11), new Tile('yellow_12', 'yellow', 12), new Tile('yellow_13', 'yellow', 13)];
  const run5 = [new Tile('red_8', 'red', 8), new Tile('red_9', 'red', 9), new Tile('red_10', 'red', 10)];

  // Inject into player 0's hand
  const bigHand = [...run1, ...run2, ...run3, ...run4, ...run5];
  game.players[0].hand = [...bigHand, new Tile('discard_test', 'yellow', 5)];

  const meldIds = [
    run1.map(t => t.id),
    run2.map(t => t.id),
    run3.map(t => t.id),
    run4.map(t => t.id),
    run5.map(t => t.id)
  ];

  const openRes = game.openHand(0, meldIds);
  assert.strictEqual(openRes.success, true);
  assert.ok(openRes.score >= 153);

  // Check opponent players 1 and 3 received +101 penalty
  assert.strictEqual(game.players[1].penaltyPoints, 101);
  assert.strictEqual(game.players[3].penaltyPoints, 101);
  assert.strictEqual(game.players[0].penaltyPoints, 0);
  assert.strictEqual(game.players[2].penaltyPoints, 0);
  console.log('   153+ Open Penalty: PASSED (Opponents got +101)');

  // 3. Test Playable Discard Penalty (+101)
  console.log('2. Testing Playable Discard Penalty (+101)...');
  // Player 0 discards red_7 (which can connect to red_8-9-10 on table)
  const playableTile = new Tile('red_7', 'red', 7);
  game.players[0].hand.push(playableTile);
  const discardRes = game.discardTile(0, 'red_7');
  assert.strictEqual(discardRes.success, true);
  assert.strictEqual(game.players[0].penaltyPoints, 101); // Player 0 received +101 for discarding playable
  console.log('   Playable Discard Penalty: PASSED (Player 0 got +101)');

  // 4. Test Okey Steal from Opponent Melds
  console.log('3. Testing Okey Steal from Opponents (+101 to opponent team)...');
  // Player 1 turn: open a meld with Okey (yellow 2 is okey since indicator is yellow 1)
  const okeyTile = new Tile('okey_tile', 'yellow', 2);
  const opponentMeld = {
    id: 'meld_opp_1',
    playerIndex: 1, // Team 2 (Player 1 & 3)
    type: 'run',
    tiles: [new Tile('blue_1', 'blue', 1), okeyTile, new Tile('blue_3', 'blue', 3)],
    score: 6
  };
  game.tableMelds.push(opponentMeld);

  // Player 2 (Team 1) turn to steal okey with blue_2
  game.currentTurn = 2;
  game.turnState = 'DISCARD';
  game.players[2].opened = true;
  game.players[2].hand = [new Tile('blue_2', 'blue', 2), new Tile('dummy_extra', 'black', 1)];

  const initialP1Penalties = game.players[1].penaltyPoints; // was 101
  const initialP3Penalties = game.players[3].penaltyPoints; // was 101

  const processRes = game.processTile(2, 'blue_2', 'meld_opp_1');
  assert.strictEqual(processRes.success, true);
  assert.strictEqual(processRes.okeyStolen, true);

  // ONLY Player 1 (the meld owner) should now have an extra +101 penalty (+202 total), Player 3 remains 101
  assert.strictEqual(game.players[1].penaltyPoints, initialP1Penalties + 101);
  assert.strictEqual(game.players[3].penaltyPoints, initialP3Penalties);
  console.log('   Okey Steal Penalty: PASSED (Only meld owner got +101)');

  // 5. Test Team Folding Rules (Katlamalı Sistem)
  console.log('4. Testing Team Folding Rules (Katlamalı)...');
  // Team 1 Player 0 opened with 171 points.
  // Team 2 (Player 1 & 3) now needs 172 points to open runs!
  const reqsP1 = game.getMinOpenRequirements(1);
  assert.strictEqual(reqsP1.minScore, 172);

  // But Team 1 Player 2 (Partner) only needs 101 points since Team 2 hasn't opened!
  const reqsP2 = game.getMinOpenRequirements(2);
  assert.strictEqual(reqsP2.minScore, 101);

  // If Player 1 opens 5 pairs:
  game.players[1].opened = true;
  game.players[1].openType = 'pairs';
  game.players[1].openedMelds = [
    { type: 'pairs', score: 10 },
    { type: 'pairs', score: 10 },
    { type: 'pairs', score: 10 },
    { type: 'pairs', score: 10 },
    { type: 'pairs', score: 10 }
  ];

  // Now Team 1 (Player 0 & 2) needs 6 pairs to open pairs!
  const reqsTeam1Pairs = game.getMinOpenRequirements(2);
  assert.strictEqual(reqsTeam1Pairs.minPairs, 6);

  // But Player 3 (Partner of Player 1) only needs 5 pairs!
  const reqsTeam2Pairs = game.getMinOpenRequirements(3);
  assert.strictEqual(reqsTeam2Pairs.minPairs, 5);

  console.log('   Team Folding Rules: PASSED');

  // 6. Test Single-Match Game Over and Rematch Starting Player Rotation
  console.log('5. Testing Single-Match Finish & Rematch Rotation...');
  // End match 1
  game.endRound(2, false, false);
  assert.strictEqual(game.state, GAME_STATES.GAME_OVER);
  assert.strictEqual(game.roundResults.hasNextRound, false);

  // Trigger Rematch (Tekrar Oyna)
  game.resetForNewMatch();
  assert.strictEqual(game.state, GAME_STATES.PLAYING);
  assert.strictEqual(game.firstPlayerIndex, 1); // Rotated to seat 1 (counter-clockwise)!
  assert.strictEqual(game.currentTurn, 1);
  assert.strictEqual(game.players[1].hand.length, 22); // Starter gets 22 tiles
  assert.strictEqual(game.players[0].hand.length, 21); // Others get 21

  console.log('   Single Match & Rematch Rotation: PASSED');

  // 6. Test Timeout Auto-Discard logic (Never discard Real Okey, pick lowest tile including low Sahte Okey)
  console.log('6. Testing Timeout Emergency Auto-Discard...');
  game.indicator = new Tile('ind_red_13', 'red', 13); // Real Okey = Red 1, Sahte Okey = Red 1
  const realOkeyTile = new Tile('okey_red_1', 'red', 1, false);
  const sahteOkeyTile = new Tile('sahte_okey', 'fake', 0, true); // Value 1
  const normalTile7 = new Tile('yellow_7', 'yellow', 7, false);
  const normalTile10 = new Tile('black_10', 'black', 10, false);

  game.currentTurn = 1;
  game.turnState = 'DISCARD';
  game.players[1].hand = [realOkeyTile, sahteOkeyTile, normalTile7, normalTile10];

  game.executeEmergencyTurn(1);

  // The discarded tile into discard pile should be sahteOkeyTile (value 1, lowest non-real-okey)
  const lastDiscarded = game.discards[1][game.discards[1].length - 1];
  assert.strictEqual(lastDiscarded.id, 'sahte_okey');
  // Real Okey must STILL be in hand
  assert.strictEqual(game.players[1].hand.some(t => t.id === 'okey_red_1'), true);

  console.log('   Timeout Emergency Auto-Discard: PASSED');
  console.log('🎉 ALL PENALTY & REMATCH TESTS PASSED SUCCESSFULLY!');
});
