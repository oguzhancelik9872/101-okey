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

  // Opponent team (Player 1 & 3) should now have an extra +101 penalty (+202 total)
  assert.strictEqual(game.players[1].penaltyPoints, initialP1Penalties + 101);
  assert.strictEqual(game.players[3].penaltyPoints, initialP3Penalties + 101);
  console.log('   Okey Steal Penalty: PASSED (Opponent Team got +101)');

  // 5. Test Single-Match Game Over and Rematch Starting Player Rotation
  console.log('4. Testing Single-Match Finish & Rematch Rotation...');
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
  console.log('🎉 ALL PENALTY & REMATCH TESTS PASSED SUCCESSFULLY!');
});
