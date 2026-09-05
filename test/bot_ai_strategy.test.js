const test = require('node:test');
const assert = require('node:assert/strict');
const BotAI = require('../server/game/BotAI');
const OkeyGame = require('../server/game/OkeyGame');
const Tile = require('../server/game/Tile');
const { GAME_STATES } = require('../server/game/Constants');

test('Bot avoids feeding an unopened next player a high loose tile', () => {
  const indicator = new Tile('indicator', 'red', 8);
  const hand = [
    new Tile('low', 'yellow', 2),
    new Tile('high', 'black', 13),
    new Tile('support-a', 'blue', 6),
    new Tile('support-b', 'blue', 7)
  ];

  const picked = BotAI.pickDiscardTile(hand, indicator, [], { nextPlayerOpened: false });
  assert.equal(picked.id, 'low');
});

test('Bot may wait briefly for a stronger opening but cannot stall forever', () => {
  const game = new OkeyGame('bot-wait-test');
  for (let index = 0; index < 4; index++) {
    game.addPlayer(`bot-${index}`, `Bot ${index}`, true, null, null, index);
  }
  game.state = GAME_STATES.PLAYING;
  game.currentTurn = 0;
  game.turnState = 'DISCARD';
  game.indicator = new Tile('indicator', 'red', 1);

  const hand = [];
  for (const number of [9, 11, 12, 13]) {
    for (const color of ['red', 'blue', 'black']) {
      hand.push(new Tile(`${color}-${number}`, color, number));
    }
  }
  hand.push(
    new Tile('extra-1', 'yellow', 1),
    new Tile('extra-2', 'blue', 3),
    new Tile('extra-3', 'black', 5),
    new Tile('extra-4', 'yellow', 7)
  );
  game.players[0].hand = hand;

  game.executeBotPlay(0);
  assert.equal(game.players[0].opened, false);
  assert.equal(game.players[0].openingWaitTurns, 1);
  game.executeBotPlay(0);
  assert.equal(game.players[0].opened, false);
  game.executeBotPlay(0);
  assert.equal(game.players[0].opened, true);
});
