const COLORS = {
  RED: 'red',
  BLUE: 'blue',
  BLACK: 'black',
  YELLOW: 'yellow'
};

const COLOR_NAMES_TR = {
  red: 'Kırmızı',
  blue: 'Mavi',
  black: 'Siyah',
  yellow: 'Sarı'
};

const COLOR_HEX = {
  red: '#e74c3c',
  blue: '#2980b9',
  black: '#2c3e50',
  yellow: '#f39c12'
};

const GAME_MODES = {
  STANDARD: 'standard', // Katlamasız
  FOLDED: 'folded'      // Katlamalı (her açan öncekinin üstüne açmalı)
};

const GAME_STATES = {
  WAITING: 'WAITING',
  DEALING: 'DEALING',
  PLAYING: 'PLAYING',
  ROUND_OVER: 'ROUND_OVER',
  GAME_OVER: 'GAME_OVER'
};

const PLAYER_STATES = {
  WAITING_DRAW: 'WAITING_DRAW',
  WAITING_DISCARD: 'WAITING_DISCARD'
};

const PENALTIES = {
  FALSE_OPEN: 101,      // Yanlış el açmaya çalışma veya açamama
  ILLEGAL_DISCARD_DRAW: 101, // Yandan uygunsuz taş çekme
  DISCARDED_PLAYABLE: 101,   // İşlek taş atma cezası
  UNOPENED_HAND: 101,   // El açamadan biri bitince ceza
  UNOPENED_DOUBLE: 202  // Biri çift açarak biterse açamayanlara x2 ceza
};

module.exports = {
  COLORS,
  COLOR_NAMES_TR,
  COLOR_HEX,
  GAME_MODES,
  GAME_STATES,
  PLAYER_STATES,
  PENALTIES
};
