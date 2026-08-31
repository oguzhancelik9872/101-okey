const assert = require('assert');
const OkeyGame = require('../server/game/OkeyGame');
const { GAME_STATES } = require('../server/game/Constants');

console.log('--- Simulating 101 Okey 4-Bot Game ---');

const game = new OkeyGame('test_sim_1', { mode: 'standard', targetRounds: 2 });
game.fillWithBots();

assert.strictEqual(game.players.length, 4);
console.log('Players registered:', game.players.map(p => p.name).join(', '));

game.startRound();
assert.strictEqual(game.state, GAME_STATES.PLAYING);
assert(game.indicator !== null, 'Indicator must be set');
console.log(`Round 1 started. Indicator: ${game.indicator.color} ${game.indicator.number}`);

// Verify starting hands: starter has 22 tiles, others have 21
assert.strictEqual(game.players[game.firstPlayerIndex].hand.length, 22);
for (let i = 0; i < 4; i++) {
  if (i !== game.firstPlayerIndex) {
    assert.strictEqual(game.players[i].hand.length, 21);
  }
}
console.log('Hand distribution verified (22 to starter, 21 to others).');

// Simulate round turns until round over or max turns reached
let turns = 0;
const maxTurns = 200;

while (game.state === GAME_STATES.PLAYING && turns < maxTurns) {
  const currentBotIdx = game.currentTurn;
  const currentBotName = game.players[currentBotIdx].name;
  
  const moveRes = game.executeBotTurn();
  turns++;
}

console.log(`Round ended in ${turns} turns. State: ${game.state}`);
if (game.roundResults) {
  console.log('Round Results:', JSON.stringify(game.roundResults, null, 2));
}

assert(game.state === GAME_STATES.ROUND_OVER || game.state === GAME_STATES.GAME_OVER);
console.log(' SIMULATION TEST PASSED!');
