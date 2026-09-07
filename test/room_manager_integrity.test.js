const test = require('node:test');
const assert = require('node:assert/strict');
const RoomManager = require('../server/game/RoomManager');
const { GAME_STATES } = require('../server/game/Constants');

function makeIo() {
  return {
    events: [],
    emit(name, payload) { this.events.push({ room: null, name, payload }); },
    to(room) {
      return { emit: (name, payload) => this.events.push({ room, name, payload }) };
    }
  };
}

test('RoomManager fills sparse seats and reuses waiting public rooms', () => {
  const manager = new RoomManager(makeIo());
  const room = manager.getOrCreatePublicRoom();
  const first = manager.joinRoom('MASA-101', 'socket-1', 'Akın', 'usr-akın', 0);
  assert.equal(first.success, true);

  const quick = manager.findQuickMatch('socket-2', 'Efe');
  assert.equal(quick.success, true);
  assert.equal(quick.room.id, room.id);
  assert.equal(room.game.players.filter(Boolean).length, 2);

  const started = manager.startGame(room.id, 'socket-1');
  assert.equal(started.success, true);
  assert.equal(room.game.players.filter(Boolean).length, 4);
  clearInterval(room.botInterval);
});

test('finished public room survives lobby reads and rejects outsider rematch votes', () => {
  const manager = new RoomManager(makeIo());
  const room = manager.getOrCreatePublicRoom();
  manager.joinRoom('MASA-101', 'socket-1', 'Akın', 'usr-akın', 0);
  room.game.fillWithBots();
  room.game.state = GAME_STATES.GAME_OVER;

  manager.getLobbyState();
  assert.equal(manager.rooms.get('MASA-101'), room);
  assert.equal(manager.handleVoteRematch(room.id, 'outsider').success, false);

  const vote = manager.handleVoteRematch(room.id, 'socket-1');
  assert.equal(vote.success, true);
  assert.equal(vote.restarted, true);
  clearInterval(room.botInterval);
});

test('reconnecting human loses the temporary bot label', () => {
  const manager = new RoomManager(makeIo());
  const room = manager.getOrCreatePublicRoom();
  manager.joinRoom(room.id, 'old-socket', 'Efe', 'usr-efe', 0);
  room.game.fillWithBots();
  room.game.state = GAME_STATES.PLAYING;

  const player = room.game.players[0];
  player.isBot = true;
  player.name = 'Efe (Bot)';

  const result = manager.reconnectPlayer(room.id, 'new-socket', 'usr-efe');
  assert.equal(result.success, true);
  assert.equal(player.isBot, false);
  assert.equal(player.name, 'Efe');
});

test('public lobby lists multiple independent tables with their own rules', () => {
  const manager = new RoomManager(makeIo());
  const folded = manager.createRoom({ hostId: 's1', hostName: 'Efe', userId: 'u1', isPrivate: false, rules: { folded: true, assistance: false, teams: true } });
  const solo = manager.createRoom({ hostId: 's2', hostName: 'Oğuz', userId: 'u2', isPrivate: false, rules: { folded: false, assistance: true, teams: false } });

  manager.joinRoom(folded.id, 's3', 'Can', 'u3', 1);
  const state = manager.getLobbyState();
  assert.equal(state.tables.length, 2);
  assert.equal(state.tables.find(t => t.id === folded.id).playerCount, 2);
  assert.equal(state.tables.find(t => t.id === folded.id).rules.assistance, false);
  assert.equal(state.tables.find(t => t.id === solo.id).playerCount, 1);
  assert.equal(state.tables.find(t => t.id === solo.id).rules.teams, false);
  assert.equal(folded.game.rules.folded, true);
  assert.equal(solo.game.rules.folded, false);
});

test('lobby seat operations target only the selected table', () => {
  const manager = new RoomManager(makeIo());
  const first = manager.createRoom({ hostId: 'host-a', hostName: 'A', userId: 'ua', isPrivate: false });
  const second = manager.createRoom({ hostId: 'host-b', hostName: 'B', userId: 'ub', isPrivate: false });

  assert.equal(manager.addBotToSeat(first.id, 'host-a', 1, 'ua').success, true);
  assert.equal(first.game.players.filter(Boolean).length, 2);
  assert.equal(second.game.players.filter(Boolean).length, 1);
  assert.equal(manager.switchSeat(second.id, 'host-b', 3, 'ub').success, true);
  assert.equal(second.game.players[3].name, 'B');
  assert.equal(first.game.players[0].name, 'A');
});
