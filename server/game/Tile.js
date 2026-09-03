/**
 * Tile representation in 101 Okey
 */
class Tile {
  constructor(id, color, number, isFake = false) {
    this.id = id;
    this.color = color;       // 'red' | 'blue' | 'black' | 'yellow' | 'fake'
    this.number = number;     // 1 - 13 (0 for fake)
    this.isFake = isFake;     // true if Sahte Okey
  }

  /**
   * Checks if this physical tile is the Joker/Okey for the given indicator
   */
  isOkey(indicatorTile) {
    if (!indicatorTile || this.isFake) return false;
    const okeyNumber = indicatorTile.number === 13 ? 1 : indicatorTile.number + 1;
    return this.color === indicatorTile.color && this.number === okeyNumber;
  }

  /**
   * If this is a fake okey, it inherits the face value of the real okey tile.
   */
  getValue(indicatorTile) {
    if (this.isFake && indicatorTile) {
      return indicatorTile.number === 13 ? 1 : indicatorTile.number + 1;
    }
    return this.number;
  }

  /**
   * If this is a fake okey, it inherits the color of the real okey tile.
   */
  getColor(indicatorTile) {
    if (this.isFake && indicatorTile) {
      return indicatorTile.color;
    }
    return this.color;
  }

  getTurkishColor(indicatorTile = null) {
    const c = this.getColor(indicatorTile);
    const colorMap = {
      'red': 'Kırmızı',
      'blue': 'Mavi',
      'black': 'Siyah',
      'yellow': 'Sarı',
      'fake': 'Sahte'
    };
    return colorMap[c] || c;
  }

  getTurkishName(indicatorTile = null) {
    const colorName = this.getTurkishColor(indicatorTile);
    const val = this.getValue(indicatorTile);
    if (this.isFake) {
      return `Sahte Okey (${colorName} ${val})`;
    }
    if (indicatorTile && this.isOkey(indicatorTile)) {
      return `OKEY (${colorName} ${val})`;
    }
    return `${colorName} ${val}`;
  }

  /**
   * Formats for easy debugging / logging in Turkish
   */
  toString(indicatorTile) {
    return this.getTurkishName(indicatorTile);
  }

  toJSON() {
    return {
      id: this.id,
      color: this.color,
      number: this.number,
      isFake: this.isFake
    };
  }

  static fromJSON(json) {
    return new Tile(json.id, json.color, json.number, json.isFake);
  }
}

module.exports = Tile;
