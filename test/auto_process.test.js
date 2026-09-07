const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

test('otomatik işle bütün uygun taşları işler ve son atılacak taşı korur', () => {
  const game = new OkeyGame('auto-process');
  for (let seat = 0; seat < 4; seat++) game.addPlayer(`p${seat}`, `P${seat}`, false, null, null, seat);
  game.state = GAME_STATES.PLAYING;
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = new Tile('indicator', 'yellow', 9);
  game.players[0].opened = true;
  game.players[0].openType = 'seri';
  game.players[0].hand = [
    new Tile('red4', 'red', 4),
    new Tile('red5', 'red', 5),
    new Tile('black13', 'black', 13)
  ];
  game.tableMelds = [{
    id: 'run-1',
    playerIndex: 1,
    type: 'run',
    tiles: [new Tile('red1', 'red', 1), new Tile('red2', 'red', 2), new Tile('red3', 'red', 3)]
  }];

  const result = game.autoProcessTiles(0);
  assert.equal(result.success, true);
  assert.equal(result.processedCount, 2);
  assert.deepEqual(game.tableMelds[0].tiles.map(tile => tile.number), [1, 2, 3, 4, 5]);
  assert.deepEqual(game.players[0].hand.map(tile => tile.id), ['black13']);
});
