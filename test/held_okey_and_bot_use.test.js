const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');

const tile = (id, color, number) => new Tile(id, color, number, false);

function gameWithPlayers() {
  const game = new OkeyGame('okey-use-test');
  for (let i = 0; i < 4; i++) game.addPlayer(`p${i}`, `P${i}`, false, null, null, i);
  game.state = 'PLAYING';
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = tile('indicator', 'blue', 5); // real Okey = blue 6
  game.discards = [[], [], [], []];
  return game;
}

test('held real Okey counts as 101 when an opponent finishes, but partner hand is cleared', () => {
  const game = gameWithPlayers();
  game.players[0].opened = true;
  game.players[0].hand = [];
  game.players[1].opened = true;
  game.players[1].openType = 'seri';
  game.players[1].hand = [tile('opponent-okey', 'blue', 6)];
  game.players[2].opened = true;
  game.players[2].openType = 'seri';
  game.players[2].hand = [tile('partner-okey', 'blue', 6)];

  game.endRound(0, false);

  assert.equal(game.roundResults.roundScores.p1.handSum, 101);
  assert.equal(game.roundResults.roundScores.p1.basePoints, 101);
  assert.equal(game.roundResults.roundScores.p2.handSum, 0);
  assert.equal(game.roundResults.roundScores.p2.basePoints, 0);
});

test('bot does not steal an Okey it cannot use immediately', () => {
  const game = gameWithPlayers();
  const bot = game.players[0];
  bot.isBot = true;
  bot.opened = true;
  bot.openType = 'seri';
  bot.hand = [tile('replacement', 'yellow', 8), tile('loose', 'red', 13)];
  game.tableMelds = [{
    id: 'target', playerIndex: 1, type: 'run', score: 24,
    tiles: [tile('y7', 'yellow', 7), tile('table-okey', 'blue', 6), tile('y9', 'yellow', 9)]
  }];

  game.executeBotPlay(0);

  assert.equal(bot.hand.some(t => t.id === 'replacement'), true);
  assert.equal(game.tableMelds[0].tiles.some(t => t.id === 'table-okey'), true);
});

test('bot steals an Okey only when it can open it again in the same turn', () => {
  const game = gameWithPlayers();
  const bot = game.players[0];
  bot.isBot = true;
  bot.opened = true;
  bot.openType = 'seri';
  bot.hand = [
    tile('replacement', 'yellow', 8),
    tile('r1', 'red', 1), tile('r2', 'red', 2),
    tile('loose', 'black', 13)
  ];
  game.tableMelds = [{
    id: 'target', playerIndex: 1, type: 'run', score: 24,
    tiles: [tile('y7', 'yellow', 7), tile('table-okey', 'blue', 6), tile('y9', 'yellow', 9)]
  }];

  game.executeBotPlay(0);

  assert.equal(game.tableMelds[0].tiles.some(t => t.id === 'replacement'), true);
  assert.equal(bot.hand.some(t => t.id === 'table-okey'), false);
  assert.equal(game.tableMelds.some(m => m.id !== 'target' && m.tiles.some(t => t.id === 'table-okey')), true);
});
