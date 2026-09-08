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

test('baraj altındaki seri perleri masaya iner, atış uyarılır ve doğru açılış cezasız tamamlanır', () => {
  const game = createGame('false-run');
  const melds = [
    [new Tile('r1', 'red', 1), new Tile('r2', 'red', 2), new Tile('r3', 'red', 3)],
    [new Tile('b10', 'blue', 10), new Tile('b11', 'blue', 11), new Tile('b12', 'blue', 12)],
    [new Tile('k10', 'black', 10), new Tile('k11', 'black', 11), new Tile('k12', 'black', 12)],
    [new Tile('y10', 'yellow', 10), new Tile('y11', 'yellow', 11), new Tile('y12', 'yellow', 12)]
  ];
  game.players[0].hand = [...melds.flat(), new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  const result = game.openHand(0, [melds[0].map(tile => tile.id)]);
  assert.equal(result.success, true);
  assert.equal(result.provisional, true);
  assert.equal(result.openingAttemptPending, true);
  assert.equal(game.players[0].penaltyPoints, 0);
  assert.equal(game.players[0].hand.length, 10);
  assert.equal(game.tableMelds.length, 1);
  assert.equal(game.tableMelds[0].provisional, true);

  const blockedDiscard = game.discardTile(0, 'extra');
  assert.equal(blockedDiscard.success, false);
  assert.equal(blockedDiscard.openingAttemptPending, true);
  assert.equal(game.players[0].penaltyPoints, 0);
  assert.equal(game.currentTurn, 0);

  assert.equal(game.undoTurn(0).success, true);
  assert.equal(game.players[0].hand.length, 13);
  assert.equal(game.tableMelds.length, 0);
  assert.equal(game.openHand(0, melds.map(meld => meld.map(tile => tile.id))).success, true);
  assert.equal(game.discardTile(0, 'extra').success, true);
  assert.equal(game.players[0].penaltyPoints, 0);
});

test('geçici seri açılışı süre bitince geri toplanır ve +101 ceza uygulanır', () => {
  const game = createGame('false-run-timeout');
  const run = [new Tile('r1', 'red', 1), new Tile('r2', 'red', 2), new Tile('r3', 'red', 3)];
  game.players[0].hand = [...run, new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  assert.equal(game.openHand(0, [run.map(tile => tile.id)]).provisional, true);
  const timeoutResult = game.executeEmergencyTurn(0);

  assert.equal(game.players[0].penaltyPoints, 101);
  assert.equal(game.tableMelds.length, 0);
  assert.equal(game.currentTurn, 1);
  assert.ok(timeoutResult.actions.some(action => action.type === 'discard'));
});

test('geçici seri açılışı geri toplandıktan sonra oyuncu +101 ile yana taş atabilir', () => {
  const game = createGame('false-run-undo-discard');
  const run = [new Tile('r1', 'red', 1), new Tile('r2', 'red', 2), new Tile('r3', 'red', 3)];
  game.players[0].hand = [...run, new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  assert.equal(game.openHand(0, [run.map(tile => tile.id)]).provisional, true);
  assert.equal(game.discardTile(0, 'extra').success, false);
  assert.equal(game.undoTurn(0).success, true);

  const discardResult = game.discardTile(0, 'extra');
  assert.equal(discardResult.success, true);
  assert.equal(game.players[0].penaltyPoints, 101);
  assert.equal(game.currentTurn, 1);
});

test('baraj altındaki çiftler masaya iner, atış uyarılır ve geri toplandıktan sonra +101 ile atılabilir', () => {
  const game = createGame('false-pairs');
  const pair = [new Tile('b7a', 'blue', 7), new Tile('b7b', 'blue', 7)];
  game.players[0].hand = [...pair, new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  const result = game.openPairs(0, [pair.map(tile => tile.id)]);
  assert.equal(result.success, true);
  assert.equal(result.provisional, true);
  assert.equal(result.openingAttemptPending, true);
  assert.equal(game.players[0].penaltyPoints, 0);
  assert.equal(game.players[0].hand.length, 1);
  assert.equal(game.tableMelds.length, 1);
  assert.equal(game.tableMelds[0].provisional, true);
  assert.equal(game.discardTile(0, 'extra').success, false);
  assert.equal(game.undoTurn(0).success, true);
  assert.equal(game.discardTile(0, 'extra').success, true);
  assert.equal(game.players[0].penaltyPoints, 101);
});

test('geçici çift açılışı geri toplanıp doğru tamamlanırsa ceza verilmez', () => {
  const game = createGame('false-pairs-corrected');
  const pairs = [];
  for (let number = 3; number <= 7; number++) {
    pairs.push([
      new Tile(`b${number}a`, 'blue', number),
      new Tile(`b${number}b`, 'blue', number)
    ]);
  }
  game.players[0].hand = [...pairs.flat(), new Tile('extra', 'black', 13)];
  game._saveTurnSnapshot(0);

  assert.equal(game.openPairs(0, [pairs[0].map(tile => tile.id)]).provisional, true);
  assert.equal(game.discardTile(0, 'extra').success, false);
  assert.equal(game.undoTurn(0).success, true);
  assert.equal(game.openPairs(0, pairs.map(pair => pair.map(tile => tile.id))).success, true);
  assert.equal(game.discardTile(0, 'extra').success, true);
  assert.equal(game.players[0].penaltyPoints, 0);
});

test('oyuncu aynı turda açıp topladıktan sonra doğru açarsa ceza almaz', () => {
  const game = createGame('false-then-undo');
  const melds = ['red', 'blue', 'black', 'yellow'].map((color, index) => [
    new Tile(`${index}a`, color, 10),
    new Tile(`${index}b`, color, 11),
    new Tile(`${index}c`, color, 12)
  ]);
  game.players[0].hand = [...melds.flat(), new Tile('extra', 'red', 1)];
  game._saveTurnSnapshot(0);

  const falseAttempt = game.openHand(0, [melds[0].map(tile => tile.id)]);
  assert.equal(falseAttempt.openingAttemptPending, true);
  assert.equal(falseAttempt.provisional, true);
  assert.equal(game.undoTurn(0).success, true);
  const validAttempt = game.openHand(0, melds.map(meld => meld.map(tile => tile.id)));
  assert.equal(validAttempt.success, true);
  const undo = game.undoTurn(0);
  assert.equal(undo.success, true);
  assert.equal(game.players[0].penaltyPoints, 0);
  const reopened = game.openHand(0, melds.map(meld => meld.map(tile => tile.id)));
  assert.equal(reopened.success, true);
  assert.equal(game.discardTile(0, 'extra').success, true);
  assert.equal(game.players[0].penaltyPoints, 0);
});

test('başarılı ilk açılışı geri toplayıp açmadan turu kapatmak +101 verir', () => {
  const game = createGame('open-undo-no-reopen');
  const melds = ['red', 'blue', 'black', 'yellow'].map((color, index) => [
    new Tile(`${index}a`, color, 10),
    new Tile(`${index}b`, color, 11),
    new Tile(`${index}c`, color, 12)
  ]);
  game.players[0].hand = [...melds.flat(), new Tile('extra', 'red', 1)];
  game._saveTurnSnapshot(0);
  assert.equal(game.openHand(0, melds.map(meld => meld.map(tile => tile.id))).success, true);
  assert.equal(game.undoTurn(0).success, true);
  assert.equal(game.players[0].penaltyPoints, 0);
  assert.equal(game.discardTile(0, 'extra').success, true);
  assert.equal(game.players[0].penaltyPoints, 101);
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
