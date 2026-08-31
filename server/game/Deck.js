const Tile = require('./Tile');
const { COLORS } = require('./Constants');

class Deck {
  constructor() {
    this.tiles = [];
    this.indicator = null;
    this.initialize();
  }

  /**
   * Initializes standard 106 tiles
   */
  initialize() {
    this.tiles = [];
    let idCounter = 1;

    // 2 sets of 13 numbers for each of the 4 colors = 104 tiles
    const colorList = [COLORS.RED, COLORS.BLUE, COLORS.BLACK, COLORS.YELLOW];
    for (let set = 1; set <= 2; set++) {
      for (const color of colorList) {
        for (let num = 1; num <= 13; num++) {
          this.tiles.push(new Tile(`${color}_${num}_${set}_${idCounter++}`, color, num, false));
        }
      }
    }

    // 2 Sahte Okey (Fake Okey)
    this.tiles.push(new Tile(`fake_1_${idCounter++}`, 'fake', 0, true));
    this.tiles.push(new Tile(`fake_2_${idCounter++}`, 'fake', 0, true));
  }

  /**
   * Shuffle tiles using Fisher-Yates
   */
  shuffle() {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  /**
   * Pick an indicator tile from the deck. Indicator cannot be a Sahte Okey.
   */
  pickIndicator() {
    // Find first non-fake tile in shuffled deck to be the indicator
    const nonFakeIndex = this.tiles.findIndex(t => !t.isFake);
    if (nonFakeIndex !== -1) {
      this.indicator = this.tiles.splice(nonFakeIndex, 1)[0];
    } else {
      this.indicator = this.tiles.pop();
    }
    return this.indicator;
  }

  /**
   * Deal hands: starter gets 22, others get 21.
   */
  deal(firstPlayerIndex = 0) {
    const hands = [[], [], [], []];

    // Starter gets 22 tiles
    // Others get 21 tiles
    for (let p = 0; p < 4; p++) {
      const count = (p === firstPlayerIndex) ? 22 : 21;
      for (let i = 0; i < count; i++) {
        if (this.tiles.length > 0) {
          hands[p].push(this.tiles.pop());
        }
      }
    }

    return hands;
  }

  /**
   * Draw a tile from middle deck
   */
  draw() {
    return this.tiles.pop() || null;
  }

  remainingCount() {
    return this.tiles.length;
  }

  getOkeyInfo() {
    if (!this.indicator) return null;
    const okeyNumber = this.indicator.number === 13 ? 1 : this.indicator.number + 1;
    return {
      indicator: this.indicator,
      okeyColor: this.indicator.color,
      okeyNumber: okeyNumber
    };
  }
}

module.exports = Deck;
