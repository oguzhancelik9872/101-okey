const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

function createPlayingGame(id) {
  const game = new OkeyGame(id, { targetRounds: 1 });
  for (let seat = 0; seat < 4; seat++) {
    game.addPlayer(`p${seat}`, `Oyuncu ${seat + 1}`, false, null, null, seat);
    game.players[seat].hand = [new Tile(`other_${seat}`, 'black', seat + 1)];
  }
  game.state = GAME_STATES.PLAYING;
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = new Tile('indicator', 'yellow', 1);
  return game;
}

test('seri açarak eldeki bütün taşlar tüketilemez', () => {
  const game = createPlayingGame('finish-open-seri');
  const player = game.players[0];
  player.opened = true;
  player.openType = 'seri';
  player.hand = [
    new Tile('r1', 'red', 1),
    new Tile('r2', 'red', 2),
    new Tile('r3', 'red', 3)
  ];

  const result = game.openHand(0, [['r1', 'r2', 'r3']]);

  assert.equal(result.success, false);
  assert.match(result.reason, /son bir taş bırakıp onu yana atmalısınız/);
  assert.equal(player.hand.length, 3);
  assert.equal(game.tableMelds.length, 0);
  assert.equal(game.state, GAME_STATES.PLAYING);
});

test('çift açarak eldeki bütün taşlar tüketilemez', () => {
  const game = createPlayingGame('finish-open-pairs');
  const player = game.players[0];
  player.opened = true;
  player.openType = 'pairs';
  player.hand = [
    new Tile('b7a', 'blue', 7),
    new Tile('b7b', 'blue', 7)
  ];

  const result = game.openPairs(0, [['b7a', 'b7b']]);

  assert.equal(result.success, false);
  assert.match(result.reason, /son bir taş bırakıp onu yana atmalısınız/);
  assert.equal(player.hand.length, 2);
  assert.equal(game.tableMelds.length, 0);
  assert.equal(game.state, GAME_STATES.PLAYING);
});

test('son taş masadaki pere işlenemez', () => {
  const game = createPlayingGame('finish-process');
  const player = game.players[0];
  player.opened = true;
  player.openType = 'seri';
  player.hand = [new Tile('r4', 'red', 4)];
  game.tableMelds = [{
    id: 'run',
    playerIndex: 2,
    type: 'run',
    tiles: [new Tile('r1', 'red', 1), new Tile('r2', 'red', 2), new Tile('r3', 'red', 3)],
    score: 6
  }];

  const result = game.processTile(0, 'r4', 'run');

  assert.equal(result.success, false);
  assert.match(result.reason, /son bir taş bırakıp onu yana atmalısınız/);
  assert.deepEqual(player.hand.map(tile => tile.id), ['r4']);
  assert.deepEqual(game.tableMelds[0].tiles.map(tile => tile.id), ['r1', 'r2', 'r3']);
  assert.equal(game.state, GAME_STATES.PLAYING);
});

test('son taşla Okey alma işlemi yapılabilir çünkü atılacak Okey ele döner', () => {
  const game = createPlayingGame('finish-okey-steal');
  const player = game.players[0];
  player.opened = true;
  player.openType = 'seri';
  player.hand = [new Tile('b2', 'blue', 2)];
  game.tableMelds = [{
    id: 'okey-run',
    playerIndex: 2,
    type: 'run',
    tiles: [
      new Tile('b1', 'blue', 1),
      new Tile('real-okey', 'yellow', 2),
      new Tile('b3', 'blue', 3)
    ],
    score: 6
  }];

  const processResult = game.processTile(0, 'b2', 'okey-run');

  assert.equal(processResult.success, true);
  assert.equal(processResult.finished, false);
  assert.equal(processResult.okeyStolen, true);
  assert.deepEqual(player.hand.map(tile => tile.id), ['real-okey']);
  assert.equal(game.state, GAME_STATES.PLAYING);

  const discardResult = game.discardTile(0, 'real-okey');
  assert.equal(discardResult.success, true);
  assert.equal(discardResult.finished, true);
  assert.equal(game.state, GAME_STATES.GAME_OVER);
});

test('açan oyuncuların kalan cezası seri için normal, çift için iki kat yayınlanır', () => {
  const game = createPlayingGame('remaining-hand-penalty');
  const tiles = (prefix) => [
    new Tile(`${prefix}10`, 'red', 10),
    new Tile(`${prefix}11`, 'blue', 11),
    new Tile(`${prefix}3`, 'black', 3)
  ];

  game.players[0].opened = true;
  game.players[0].openType = 'seri';
  game.players[0].hand = tiles('seri');
  game.players[1].opened = true;
  game.players[1].openType = 'pairs';
  game.players[1].hand = tiles('pairs');

  const clientState = game.getClientState(3);
  assert.equal(clientState.players[0].remainingHandPenalty, 24);
  assert.equal(clientState.players[1].remainingHandPenalty, 48);
  assert.equal(clientState.players[2].remainingHandPenalty, null);
});
