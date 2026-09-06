const test = require('node:test');
const assert = require('node:assert/strict');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');

function tile(id, color, number) {
  return new Tile(id, color, number, false);
}

function preparedGame() {
  const game = new OkeyGame('indicator-test');
  for (let i = 0; i < 4; i++) game.addPlayer(`p${i}`, `P${i}`, false, null, null, i);
  game.state = 'PLAYING';
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = tile('face-up-blue-5', 'blue', 5);
  game.minOpenPairs = 5;
  game.discards = [[], [], [], []];
  game.tableMelds = [];
  return game;
}

test('indicator twin can be declared before the first draw and is public without leaking its id', () => {
  const game = preparedGame();
  game.players[0].hand = [tile('held-blue-5', 'blue', 5), tile('other', 'red', 1)];

  assert.equal(game.declareIndicator(0, 'held-blue-5').success, true);
  assert.equal(game.players[0].indicatorDeclared, true);
  assert.equal(game.getClientState(1).players[0].indicatorDeclared, true);
  assert.equal(game.getClientState(1).players[0].indicatorTileId, null);
  assert.equal(game.getClientState(0).players[0].indicatorTileId, 'held-blue-5');
});

test('wrong or late indicator declaration is rejected', () => {
  const game = preparedGame();
  game.players[0].hand = [tile('red-5', 'red', 5), tile('held-blue-5', 'blue', 5)];
  assert.equal(game.declareIndicator(0, 'red-5').success, false);
  game.players[0].indicatorDeclarationClosed = true;
  assert.equal(game.declareIndicator(0, 'held-blue-5').success, false);
});

test('starter may discard before declaring, until their first draw', () => {
  const game = preparedGame();
  game.players[0].hand = [tile('held-blue-5', 'blue', 5), tile('first-discard', 'red', 13)];
  assert.equal(game.discardTile(0, 'first-discard').success, true);
  assert.equal(game.currentTurn, 1);
  assert.equal(game.declareIndicator(0, 'held-blue-5').success, true);
});

test('returning a side-drawn tile restores declaration eligibility before any deck draw', () => {
  const game = preparedGame();
  game.turnState = 'DRAW';
  game.players[0].hand = [tile('held-blue-5', 'blue', 5), tile('base', 'red', 2)];
  game.discards[3] = [tile('side-tile', 'yellow', 9)];

  assert.equal(game.drawTile(0, 'discard').success, true);
  assert.equal(game.declareIndicator(0, 'held-blue-5').success, false);
  assert.equal(game.returnDiscardTile(0).success, true);
  assert.equal(game.declareIndicator(0, 'held-blue-5').success, true);
});

test('bot declares a dealt indicator immediately when the round starts', () => {
  const game = preparedGame();
  game.players[2].isBot = true;
  game.players[2].hand = [tile('bot-blue-5', 'blue', 5)];
  game.players[2].indicatorDeclared = false;
  game.players[2].indicatorDeclarationClosed = false;
  game._declareBotIndicatorIfHeld(2);
  assert.equal(game.players[2].indicatorDeclared, true);
  assert.equal(game.players[2].indicatorTileId, 'bot-blue-5');
});

test('declared indicator forms exactly one arbitrary pair on the first pairs opening', () => {
  const game = preparedGame();
  game.players[0].hand = [
    tile('b5', 'blue', 5), tile('companion', 'yellow', 13),
    tile('r1a', 'red', 1), tile('r1b', 'red', 1),
    tile('r2a', 'red', 2), tile('r2b', 'red', 2),
    tile('k3a', 'black', 3), tile('k3b', 'black', 3),
    tile('y4a', 'yellow', 4), tile('y4b', 'yellow', 4),
    tile('discard', 'black', 12)
  ];
  assert.equal(game.declareIndicator(0, 'b5').success, true);
  game._saveTurnSnapshot(0);
  const result = game.openPairs(0, [
    ['r1a', 'r1b'], ['r2a', 'r2b'], ['k3a', 'k3b'], ['y4a', 'y4b'], ['b5', 'companion']
  ]);

  assert.equal(result.success, true);
  assert.equal(result.count, 5);
  assert.equal(game.players[0].indicatorBonusUsed, true);
  assert.equal(game.tableMelds.filter(m => m.isIndicatorPair).length, 1);
  assert.equal(game.players[0].indicatorDeclared, true);
});

test('special indicator pair cannot be used without declaration or after a first pairs opening', () => {
  const game = preparedGame();
  game.players[0].hand = [tile('b5', 'blue', 5), tile('odd', 'yellow', 13)];
  game.players[0].opened = true;
  game.players[0].openType = 'pairs';
  game.players[0].indicatorDeclared = true;
  game.players[0].indicatorTileId = 'b5';
  game.players[0].indicatorBonusExpired = true;
  assert.equal(game.openPairs(0, [['b5', 'odd']]).success, false);
});
