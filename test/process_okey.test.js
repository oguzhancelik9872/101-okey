const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

function createGame() {
  const game = new OkeyGame('process-real-okey', { targetRounds: 1 });
  for (let seat = 0; seat < 4; seat++) {
    game.addPlayer(`p${seat}`, `Player ${seat + 1}`, false, null, null, seat);
  }
  game.state = GAME_STATES.PLAYING;
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  // Yellow 1 indicator makes Yellow 2 the real Okey.
  game.indicator = new Tile('indicator', 'yellow', 1);
  return game;
}

test('real Okey can be processed beside an open run of another color', () => {
  const game = createGame();
  const player = game.players[0];
  player.opened = true;
  player.openType = 'seri';
  player.hand = [
    new Tile('real-okey-to-process', 'yellow', 2),
    new Tile('discard-after-process', 'black', 13)
  ];
  game.tableMelds = [{
    id: 'blue-run',
    playerIndex: 2,
    type: 'run',
    tiles: [
      new Tile('blue5-live', 'blue', 5),
      new Tile('blue6-live', 'blue', 6),
      new Tile('blue7-live', 'blue', 7)
    ],
    score: 18
  }];

  const result = game.processTile(0, 'real-okey-to-process', 'blue-run');

  assert.equal(result.success, true);
  assert.equal(result.okeyStolen, false);
  assert.deepEqual(player.hand.map(tile => tile.id), ['discard-after-process']);
  assert.deepEqual(game.tableMelds[0].tiles.map(tile => tile.id), [
    'blue5-live', 'blue6-live', 'blue7-live', 'real-okey-to-process'
  ]);
});

test('real Okey can be processed into a three-tile number group', () => {
  const game = createGame();
  const player = game.players[0];
  player.opened = true;
  player.openType = 'seri';
  player.hand = [
    new Tile('real-okey-for-group', 'yellow', 2),
    new Tile('discard-after-group', 'black', 13)
  ];
  game.tableMelds = [{
    id: 'eights-group',
    playerIndex: 2,
    type: 'group',
    tiles: [
      new Tile('red8-live', 'red', 8),
      new Tile('blue8-live', 'blue', 8),
      new Tile('black8-live', 'black', 8)
    ],
    score: 24
  }];

  const result = game.processTile(0, 'real-okey-for-group', 'eights-group');

  assert.equal(result.success, true);
  assert.deepEqual(player.hand.map(tile => tile.id), ['discard-after-group']);
  assert.equal(game.tableMelds[0].tiles.length, 4);
});
