/**
 * TileAnimationEngine - High-performance 2D GPU-accelerated Flying Tile Animations
 * Handles physical tile movements: drawing from deck/discard, discarding to corner piles,
 * opening melds tile-by-tile into exact grid slots, and processing tiles.
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
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
      };
    }
    return null;
  }

  getSeatFallbackCoords(seatPos) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    switch (seatPos) {
      case 'top': return { x: w / 2, y: 35 };
      case 'left': return { x: 55, y: h / 2 };
      case 'right': return { x: w - 55, y: h / 2 };
      case 'bottom':
      default: return { x: w / 2, y: h - 90 };
    }
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
      duration = 300,
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
    const tileW = 32;
    const tileH = 44;

    tileEl.style.width = `${tileW}px`;
    tileEl.style.height = `${tileH}px`;
    tileEl.style.position = 'fixed';
    tileEl.style.left = `${start.x - tileW / 2}px`;
    tileEl.style.top = `${start.y - tileH / 2}px`;
    tileEl.style.transform = `translate3d(0, 0, 0) scale(${scaleStart}) rotate(${rotateStart}deg)`;
    tileEl.style.opacity = '1';
    tileEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${duration}ms ease`;
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

    setTimeout(cleanup, duration + 30);
  }

  /**
   * Draw tile from center deck to player profile or rack
   */
  animateDrawFromDeck(seatPos, isViewer = false) {
    const deckEl = document.getElementById('center-deck-pile');
    const startCoords = this.getElCenter(deckEl) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const targetEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    const endCoords = this.getElCenter(targetEl) || this.getSeatFallbackCoords(seatPos);

    this.flyTile({
      fromCoords: startCoords,
      toCoords: endCoords,
      isClosed: true,
      duration: 300,
      scaleStart: 1.05,
      scaleEnd: 0.9,
      rotateStart: 0,
      rotateEnd: 0
    });
  }

  /**
   * Draw tile from discard pile
   */
  animateDrawFromDiscard(seatPos, fromPos, tile, isViewer = false) {
    const discardEl = document.getElementById('discard-pile-' + fromPos);
    const startCoords = this.getElCenter(discardEl) || this.getSeatFallbackCoords(fromPos);

    const targetEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    const endCoords = this.getElCenter(targetEl) || this.getSeatFallbackCoords(seatPos);

    this.flyTile({
      fromCoords: startCoords,
      toCoords: endCoords,
      tile,
      isClosed: false,
      duration: 320,
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

    const startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);
    const discardEl = document.getElementById('discard-pile-' + seatPos);
    const endCoords = this.getElCenter(discardEl);

    if (!endCoords) return;

    this.flyTile({
      fromCoords: startCoords,
      toCoords: endCoords,
      tile,
      isClosed: false,
      duration: 300,
      scaleStart: 1.0,
      scaleEnd: 0.88,
      rotateEnd: 0
    });
  }

  /**
   * Open melds (Seri or Pairs) - Tile by tile directly to their exact slots on the table!
   */
  animateOpenMelds(seatPos, melds, openType = 'seri', isViewer = false) {
    const fromEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    const startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);

    // Collect all tiles to animate
    const tileEntries = [];
    if (Array.isArray(melds)) {
      melds.forEach(m => {
        const tiles = Array.isArray(m) ? m : (m && Array.isArray(m.tiles) ? m.tiles : []);
        tiles.forEach(t => {
          if (t && t.id) {
            tileEntries.push(t);
          }
        });
      });
    }

    if (tileEntries.length === 0) return;

    // Wait 1 frame so table DOM is rendered
    requestAnimationFrame(() => {
      tileEntries.forEach((tile, index) => {
        // Find exact destination element on the table grid
        const destEl = document.querySelector(`.table-grid-panel [data-id="${tile.id}"]`);
        let endCoords = null;

        if (destEl) {
          endCoords = this.getElCenter(destEl);
          // Hide actual element until flying tile lands on it
          destEl.style.opacity = '0';
        } else {
          // Fallback to table center
          const fallbackPanel = document.querySelector('.center-table-zone');
          endCoords = this.getElCenter(fallbackPanel);
        }

        if (!endCoords) return;

        setTimeout(() => {
          this.flyTile({
            fromCoords: startCoords,
            toCoords: endCoords,
            tile,
            isClosed: false,
            duration: 320,
            scaleStart: 1.05,
            scaleEnd: 0.85,
            onComplete: () => {
              if (destEl) {
                destEl.style.opacity = '1';
                if (window.soundEngine && typeof window.soundEngine.playTilePlace === 'function') {
                  window.soundEngine.playTilePlace();
                }
              }
            }
          });
        }, index * 55); // Rhythmic 55ms interval per tile
      });
    });
  }

  /**
   * Process a tile to existing meld on table
   */
  animateProcessTile(seatPos, tile, isViewer = false) {
    const fromEl = isViewer
      ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
      : document.getElementById('seat-' + seatPos);

    const startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);

    requestAnimationFrame(() => {
      const destEl = tile && tile.id ? document.querySelector(`.table-grid-panel [data-id="${tile.id}"]`) : null;
      let endCoords = null;

      if (destEl) {
        endCoords = this.getElCenter(destEl);
        destEl.style.opacity = '0';
      } else {
        const fallbackPanel = document.querySelector('.center-table-zone');
        endCoords = this.getElCenter(fallbackPanel);
      }

      if (!endCoords) return;

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        tile,
        isClosed: false,
        duration: 320,
        scaleStart: 1.05,
        scaleEnd: 0.85,
        onComplete: () => {
          if (destEl) {
            destEl.style.opacity = '1';
            if (window.soundEngine && typeof window.soundEngine.playTilePlace === 'function') {
              window.soundEngine.playTilePlace();
            }
          }
        }
      });
    });
  }
}

window.TileAnimationEngine = TileAnimationEngine;
window.tileAnimations = new TileAnimationEngine();
