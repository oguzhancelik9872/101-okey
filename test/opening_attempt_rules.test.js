const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

function createGame(id, rules = {}) {
  const game = new OkeyGame(id, { rules });
  for (let i = 0; i < 4; i++) game.addPlayer(`p${i}`, `Oyuncu ${i + 1}`, false, 'female', null, i);
  game.state = GAME_STATES.PLAYING;
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = new Tile('indicator', 'yellow', 1);
  return game;
}

test('baraj altındaki geçerli seri açma denemesi +101 ceza verir ve eli değiştirmez', () => {
  const game = createGame('false-run');
  const run = [new Tile('r1', 'red', 1), new Tile('r2', 'red', 2), new Tile('r3', 'red', 3)];
  game.players[0].hand = [...run, new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  const result = game.openHand(0, [run.map(tile => tile.id)]);
  assert.equal(result.success, false);
  assert.equal(result.penaltyApplied, true);
  assert.equal(game.players[0].penaltyPoints, 101);
  assert.equal(game.players[0].hand.length, 4);
  assert.equal(game.tableMelds.length, 0);
});

test('baraj altındaki en az bir geçerli çift denemesi +101 ceza verir', () => {
  const game = createGame('false-pairs');
  const pair = [new Tile('b7a', 'blue', 7), new Tile('b7b', 'blue', 7)];
  game.players[0].hand = [...pair, new Tile('extra', 'black', 13)];

  const result = game.openPairs(0, [pair.map(tile => tile.id)]);
  assert.equal(result.success, false);
  assert.equal(result.penaltyApplied, true);
  assert.equal(game.players[0].penaltyPoints, 101);
  assert.equal(game.players[0].hand.length, 3);
});

test('aynı turdaki hatalı deneme cezası doğru açılış geri toplanınca silinmez', () => {
  const game = createGame('false-then-undo');
  const melds = ['red', 'blue', 'black', 'yellow'].map((color, index) => [
    new Tile(`${index}a`, color, 10),
    new Tile(`${index}b`, color, 11),
    new Tile(`${index}c`, color, 12)
  ]);
  game.players[0].hand = [...melds.flat(), new Tile('extra', 'red', 1)];
  game._saveTurnSnapshot(0);

  const falseAttempt = game.openHand(0, [melds[0].map(tile => tile.id)]);
  assert.equal(falseAttempt.penaltyApplied, true);
  const validAttempt = game.openHand(0, melds.map(meld => meld.map(tile => tile.id)));
  assert.equal(validAttempt.success, true);
  const undo = game.undoTurn(0);
  assert.equal(undo.penaltyApplied, true);
  assert.equal(game.players[0].penaltyPoints, 202);
});

test('tekli oyunda 7 çift açan oyuncu kendi skoruna -101 yazar', () => {
  const game = createGame('seven-pairs', { teams: false });
  const pairs = [];
  for (let number = 3; number <= 9; number++) {
    pairs.push([
      new Tile(`b${number}a`, 'blue', number),
      new Tile(`b${number}b`, 'blue', number)
    ]);
  }
  game.players[0].hand = [...pairs.flat(), new Tile('extra', 'black', 13)];

  const result = game.openPairs(0, pairs.map(pair => pair.map(tile => tile.id)));
  assert.equal(result.success, true);
  assert.equal(game.players[0].penaltyPoints, -101);
  assert.deepEqual(game.players.slice(1).map(player => player.penaltyPoints), [0, 0, 0]);
});

test('tekli oyunda Okey kaptıran karşı koltuk da kendi +101 cezasını alır', () => {
  const game = createGame('solo-okey-steal', { teams: false });
  const okey = new Tile('okey', 'yellow', 2);
  game.tableMelds = [{
    id: 'owner-two-meld',
    playerIndex: 2,
    type: 'run',
    tiles: [new Tile('r1', 'red', 1), okey, new Tile('r3', 'red', 3)],
    score: 6
  }];
  game.players[0].opened = true;
  game.players[0].openType = 'seri';
  game.players[0].hand = [new Tile('r2', 'red', 2), new Tile('extra', 'black', 13)];

  const result = game.processTile(0, 'r2', 'owner-two-meld');
  assert.equal(result.success, true);
  assert.equal(result.okeyStolen, true);
  assert.equal(game.players[2].penaltyPoints, 101);
});
