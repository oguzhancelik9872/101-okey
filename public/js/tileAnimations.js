/**
 * TileAnimationEngine - High-performance 2D GPU-accelerated Flying Tile Animations
 * Handles physical tile movements: drawing from deck/discard, discarding to corner piles,
 * opening melds from player profiles to table felt, and tile processing.
 */

class TileAnimationEngine {
  constructor() {
    this.overlay = null;
    this.ensureOverlay();
  }

  ensureOverlay() {
    if (!this.overlay || !document.body.contains(this.overlay)) {
      this.overlay = document.getElementById('animation-overlay');
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'animation-overlay';
        this.overlay.className = 'animation-overlay';
        document.body.appendChild(this.overlay);
      }
    }
    return this.overlay;
  }

  getElCenter(el) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  createTileDOM(tile, isClosed = false) {
    const tileEl = document.createElement('div');
    tileEl.className = 'flying-tile-clone';

    if (isClosed || !tile) {
      tileEl.classList.add('tile-face-down');
      tileEl.innerHTML = '<div class="tile-back-pattern"></div>';
      return tileEl;
    }

    const color = tile.effectiveColor || tile.color || 'red';
    const number = tile.effectiveValue !== undefined ? tile.effectiveValue : (tile.number !== undefined ? tile.number : (tile.value !== undefined ? tile.value : ''));
    tileEl.classList.add('color-' + color);

    if (tile.isOkey) {
      tileEl.classList.add('is-okey-joker');
    } else if (tile.isFake) {
      tileEl.classList.add('is-fake-okey');
      tileEl.innerHTML = `
        <div class="tile-number">
          <div class="fake-okey-emblem"><svg viewBox="0 0 40 40" class="fake-okey-svg"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.8"/><polygon points="20,7 23.8,14.7 32.3,15.9 26.2,21.9 27.6,30.3 20,26.3 12.4,30.3 13.8,21.9 7.7,15.9 16.2,14.7" fill="currentColor"/></svg></div>
        </div>
      `;
    } else {
      tileEl.innerHTML = `
        <span class="tile-number">${number}</span>
        <span class="tile-dot"></span>
      `;
    }

    return tileEl;
  }

  flyTile(options = {}) {
    const {
      fromEl,
      toEl,
      fromCoords,
      toCoords,
      tile = null,
      isClosed = false,
      duration = 340,
      scaleStart = 1.0,
      scaleEnd = 0.85,
      rotateStart = 0,
      rotateEnd = 0,
      onComplete = null
    } = options;

    const overlay = this.ensureOverlay();
    const start = fromCoords || this.getElCenter(fromEl);
    const end = toCoords || this.getElCenter(toEl);

    if (!start || !end) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const tileEl = this.createTileDOM(tile, isClosed);
    const tileW = 34;
    const tileH = 46;

    tileEl.style.width = `${tileW}px`;
    tileEl.style.height = `${tileH}px`;
    tileEl.style.position = 'fixed';
    tileEl.style.left = `${start.x - tileW / 2}px`;
    tileEl.style.top = `${start.y - tileH / 2}px`;
    tileEl.style.transform = `translate3d(0, 0, 0) scale(${scaleStart}) rotate(${rotateStart}deg)`;
    tileEl.style.opacity = '1';
    tileEl.style.transition = `transform ${duration}ms cubic-bezier(0.18, 0.89, 0.32, 1.15), opacity ${duration}ms ease`;
    tileEl.style.zIndex = '9999';
    tileEl.style.pointerEvents = 'none';

    overlay.appendChild(tileEl);

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    // Force reflow
    void tileEl.offsetWidth;

    // Trigger transform
    requestAnimationFrame(() => {
      tileEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleEnd}) rotate(${rotateEnd}deg)`;
    });

    const cleanup = () => {
      if (tileEl && tileEl.parentNode) {
        tileEl.parentNode.removeChild(tileEl);
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    };

    setTimeout(cleanup, duration + 40);
  }

  /**
   * Draw tile from center deck
   */
  animateDrawFromDeck(seatPos, isViewer = false) {
    const deckEl = document.getElementById('center-deck-pile');
    const targetEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    if (!deckEl || !targetEl) return;

    this.flyTile({
      fromEl: deckEl,
      toEl: targetEl,
      isClosed: true,
      duration: 320,
      scaleStart: 1.1,
      scaleEnd: 0.9,
      rotateStart: 0,
      rotateEnd: seatPos === 'right' ? 12 : (seatPos === 'left' ? -12 : 0)
    });
  }

  /**
   * Draw tile from discard pile
   */
  animateDrawFromDiscard(seatPos, fromPos, tile, isViewer = false) {
    const discardEl = document.getElementById('discard-pile-' + fromPos);
    const targetEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    if (!discardEl || !targetEl) return;

    this.flyTile({
      fromEl: discardEl,
      toEl: targetEl,
      tile,
      isClosed: false,
      duration: 340,
      scaleStart: 1.0,
      scaleEnd: 0.95
    });
  }

  /**
   * Discard a tile to player's corner pile
   */
  animateDiscard(seatPos, tile, isViewer = false) {
    const fromEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);
    const discardEl = document.getElementById('discard-pile-' + seatPos);

    if (!fromEl || !discardEl) return;

    this.flyTile({
      fromEl,
      toEl: discardEl,
      tile,
      isClosed: false,
      duration: 320,
      scaleStart: 1.05,
      scaleEnd: 0.9,
      rotateEnd: (Math.random() * 8) - 4
    });
  }

  /**
   * Open melds (Seri or Pairs) - Staggered flying tiles from profile to table felt
   */
  animateOpenMelds(seatPos, melds, openType = 'seri', isViewer = false) {
    const fromEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    const targetPanel = openType === 'pairs'
      ? document.getElementById('panel-pairs-1')
      : document.getElementById('panel-seri-1');

    if (!fromEl || !targetPanel || !melds || melds.length === 0) return;

    // Collect all individual tiles to fly
    const allTiles = [];
    if (Array.isArray(melds)) {
      melds.forEach(m => {
        if (Array.isArray(m)) {
          m.forEach(t => allTiles.push(t));
        } else if (m && Array.isArray(m.tiles)) {
          m.tiles.forEach(t => allTiles.push(t));
        }
      });
    }

    const startCoords = this.getElCenter(fromEl);
    const endCenter = this.getElCenter(targetPanel);
    if (!startCoords || !endCenter) return;

    const maxTilesToAnimate = Math.min(allTiles.length, 12);
    for (let i = 0; i < maxTilesToAnimate; i++) {
      const tile = allTiles[i];
      const offsetX = ((i % 4) - 1.5) * 20;
      const offsetY = (Math.floor(i / 4) - 1) * 15;
      const toCoords = {
        x: endCenter.x + offsetX,
        y: endCenter.y + offsetY
      };

      setTimeout(() => {
        this.flyTile({
          fromCoords: startCoords,
          toCoords,
          tile: typeof tile === 'object' ? tile : null,
          isClosed: false,
          duration: 380,
          scaleStart: 1.1,
          scaleEnd: 0.75,
          rotateEnd: (Math.random() * 12) - 6
        });
      }, i * 40);
    }
  }

  /**
   * Process a tile to existing meld on table
   */
  animateProcessTile(seatPos, tile, isViewer = false) {
    const fromEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);
    const tableZone = document.querySelector('.center-table-zone');

    if (!fromEl || !tableZone) return;

    this.flyTile({
      fromEl,
      toEl: tableZone,
      tile,
      isClosed: false,
      duration: 350,
      scaleStart: 1.1,
      scaleEnd: 0.8
    });
  }
}

window.TileAnimationEngine = TileAnimationEngine;
window.tileAnimations = new TileAnimationEngine();
