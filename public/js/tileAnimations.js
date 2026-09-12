/**
 * TileAnimationEngine - High-performance 2D GPU-accelerated Flying Tile Animations
 * Features:
 * - Sequential execution queue (prevents bot actions from overlapping or clashing)
 * - Exact rack-slot targeting for drawn tiles
 * - Seamless opacity synchrony on landing
 * - Calm, minimal, linear-smooth movement (zero wobbling or secondary bouncing)
 */

class TileAnimationEngine {
  constructor() {
    this.overlay = null;
    this.queue = [];
    this.isProcessingQueue = false;
    this.isAnimating = false;
    this.idleCallbacks = [];
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

  enqueue(animFn) {
    this.queue.push(animFn);
    this.isAnimating = true;
    document.documentElement.classList.add('game-animation-busy');
    this.processQueue();
  }

  isBusy() {
    return this.isAnimating || this.isProcessingQueue || this.queue.length > 0;
  }

  whenIdle(callback) {
    if (typeof callback !== 'function') return;
    if (!this.isBusy()) {
      requestAnimationFrame(callback);
      return;
    }
    this.idleCallbacks.push(callback);
  }

  processQueue() {
    if (this.isProcessingQueue || this.queue.length === 0) return;
    this.isProcessingQueue = true;
    this.isAnimating = true;

    const nextFn = this.queue.shift();
    let completed = false;
    let watchdog = null;
    const finishCurrent = () => {
      if (completed) return;
      completed = true;
      if (watchdog) clearTimeout(watchdog);
      this.isProcessingQueue = false;
      if (this.queue.length > 0) {
        // Small 30ms pause between sequential actions for natural physical cadence
        setTimeout(() => this.processQueue(), 30);
      } else {
        this.isAnimating = false;
        document.documentElement.classList.remove('game-animation-busy');
        const callbacks = this.idleCallbacks.splice(0);
        requestAnimationFrame(() => callbacks.forEach(callback => callback()));
      }
    };

    // A broken DOM target or interrupted browser animation must never freeze gameplay.
    watchdog = setTimeout(finishCurrent, 5000);
    try {
      nextFn(finishCurrent);
    } catch (error) {
      console.error('[TileAnimationEngine] Animation queue recovered:', error);
      finishCurrent();
    }
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
    tileEl.className = 'flying-tile-clone okey-tile';

    const hasValue = Boolean(tile && (tile.number !== undefined || tile.value !== undefined || tile.isOkey || tile.isFake));

    if (isClosed || !tile || !hasValue) {
      tileEl.classList.add('tile-face-down');
      tileEl.innerHTML = '<div class="tile-back-pattern"></div>';
      return tileEl;
    }

    const color = tile.effectiveColor || tile.color || 'red';
    const number = tile.effectiveValue !== undefined ? tile.effectiveValue : (tile.number !== undefined ? tile.number : (tile.value !== undefined ? tile.value : ''));
    tileEl.classList.add('color-' + color);

    if (tile.isOkey) {
      tileEl.classList.add('is-okey-joker');
      tileEl.innerHTML = `<span class="tile-number">★</span><span class="tile-dot"></span>`;
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
      fromCoords,
      toCoords,
      tile = null,
      isClosed = false,
      duration = 340,
      onComplete = null
    } = options;

    const overlay = this.ensureOverlay();
    if (!fromCoords || !toCoords) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    const tileEl = this.createTileDOM(tile, isClosed);
    const isTileSized = coords => coords
      && Number.isFinite(coords.width) && Number.isFinite(coords.height)
      && coords.width >= 20 && coords.width <= 90
      && coords.height >= 28 && coords.height <= 120
      && coords.width / coords.height >= .5 && coords.width / coords.height <= .9;
    const sourceSize = isTileSized(fromCoords) ? fromCoords : null;
    const targetSize = isTileSized(toCoords) ? toCoords : null;
    const tileW = Math.round(targetSize?.width || sourceSize?.width || 34);
    const tileH = Math.round(targetSize?.height || sourceSize?.height || 46);
    const startScale = sourceSize ? Math.max(.72, Math.min(1.35, sourceSize.height / tileH)) : 1;

    tileEl.style.width = `${tileW}px`;
    tileEl.style.height = `${tileH}px`;
    tileEl.style.position = 'fixed';
    tileEl.style.left = `${fromCoords.x - tileW / 2}px`;
    tileEl.style.top = `${fromCoords.y - tileH / 2}px`;
    tileEl.style.transform = `translate3d(0, 0, 0) scale(${startScale})`;
    tileEl.style.opacity = '1';
    tileEl.style.willChange = 'transform';
    tileEl.style.zIndex = '9999';
    tileEl.style.pointerEvents = 'none';

    overlay.appendChild(tileEl);

    const deltaX = toCoords.x - fromCoords.x;
    const deltaY = toCoords.y - fromCoords.y;

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionDuration = prefersReducedMotion ? Math.min(duration, 90) : duration;
    const travelDistance = Math.hypot(deltaX, deltaY);
    const lift = prefersReducedMotion ? 0 : Math.min(24, Math.max(8, travelDistance * 0.055));
    const tilt = prefersReducedMotion ? 0 : Math.max(-4, Math.min(4, deltaX / 150));
    const midScale = ((startScale + 1) / 2) * (prefersReducedMotion ? 1 : 1.045);
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (tileEl && tileEl.parentNode) {
        tileEl.parentNode.removeChild(tileEl);
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    };

    if (typeof tileEl.animate === 'function') {
      const motion = tileEl.animate([
        { transform: `translate3d(0,0,0) rotate(0deg) scale(${startScale})`, offset: 0 },
        { transform: `translate3d(${deltaX * .48}px,${(deltaY * .48) - lift}px,0) rotate(${tilt}deg) scale(${midScale})`, offset: .48 },
        { transform: `translate3d(${deltaX}px,${deltaY}px,0) rotate(0deg) scale(1)`, offset: 1 }
      ], {
        duration: motionDuration,
        easing: 'cubic-bezier(.22,.82,.24,1)',
        fill: 'forwards'
      });
      motion.addEventListener('finish', cleanup, { once: true });
      motion.addEventListener('cancel', cleanup, { once: true });
      setTimeout(cleanup, motionDuration + 100);
    } else {
      tileEl.style.transition = `transform ${motionDuration}ms cubic-bezier(.22,.82,.24,1)`;
      void tileEl.offsetWidth;
      requestAnimationFrame(() => {
        tileEl.style.transform = `translate3d(${deltaX}px,${deltaY}px,0) scale(1)`;
      });
      setTimeout(cleanup, motionDuration + 30);
    }
  }

  /**
   * Draw tile from center deck
   */
  animateDrawFromDeck(seatPos, isViewer = false, onDone = null) {
    this.enqueue((done) => {
      const deckEl = document.getElementById('center-deck-pile');
      const startCoords = this.getElCenter(deckEl) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      let targetEl = null;
      let drawnRackTile = null;

      if (isViewer) {
        drawnRackTile = document.querySelector('.istaka-slot .okey-tile.tile-just-drawn') ||
          document.querySelector('#istaka-rack .okey-tile:last-child');
        targetEl = drawnRackTile || document.getElementById('player-istaka-container') || document.getElementById('seat-bottom');
      } else {
        targetEl = document.getElementById('seat-' + seatPos);
      }

      const endCoords = this.getElCenter(targetEl) || this.getSeatFallbackCoords(seatPos);

      if (drawnRackTile) {
        drawnRackTile.style.opacity = '0';
      }

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        isClosed: true,
        duration: 380,
        onComplete: () => {
          if (drawnRackTile) {
            drawnRackTile.style.opacity = '1';
          }
          if (typeof onDone === 'function') onDone();
          done();
        }
      });
    });
  }

  /**
   * Draw tile from discard pile
   */
  animateDrawFromDiscard(seatPos, fromPos, tile, isViewer = false, onDone = null) {
    this.enqueue((done) => {
      const discardEl = document.getElementById('discard-pile-' + fromPos);
      const startCoords = this.getElCenter(discardEl) || this.getSeatFallbackCoords(fromPos);

      let targetEl = null;
      let drawnRackTile = null;

      if (isViewer) {
        drawnRackTile = document.querySelector('.istaka-slot .okey-tile.tile-just-drawn') ||
          document.querySelector('#istaka-rack .okey-tile:last-child');
        targetEl = drawnRackTile || document.getElementById('player-istaka-container') || document.getElementById('seat-bottom');
      } else {
        targetEl = document.getElementById('seat-' + seatPos);
      }

      const endCoords = this.getElCenter(targetEl) || this.getSeatFallbackCoords(seatPos);

      if (drawnRackTile) {
        drawnRackTile.style.opacity = '0';
      }

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        tile,
        isClosed: false,
        duration: 380,
        onComplete: () => {
          if (drawnRackTile) {
            drawnRackTile.style.opacity = '1';
          }
          if (typeof onDone === 'function') onDone();
          done();
        }
      });
    });
  }

  /**
   * Discard a tile to player's corner pile with 100% landing synchrony
   */
  animateDiscard(seatPos, tile, isViewer = false, onDone = null) {
    this.enqueue((done) => {
      let startCoords = null;
      let rackTileEl = null;

      if (isViewer && tile && tile.id) {
        rackTileEl = document.querySelector(`.istaka-slot .okey-tile[data-id="${tile.id}"]`);
        if (rackTileEl) {
          startCoords = this.getElCenter(rackTileEl);
          rackTileEl.style.opacity = '0';
        }
      }

      if (!startCoords) {
        const fromEl = isViewer
          ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
          : document.getElementById('seat-' + seatPos);
        startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);
      }

      const discardEl = document.getElementById('discard-pile-' + seatPos);
      const endCoords = this.getElCenter(discardEl);

      if (!endCoords) {
        if (typeof onDone === 'function') onDone();
        done();
        return;
      }

      // Hide landing slot incoming tile during flight
      window.flyingDiscardSeatPos = seatPos;
      if (window.tableManager) {
        window.tableManager.renderDiscards();
      }

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        tile,
        isClosed: false,
        duration: 340,
        onComplete: () => {
          window.flyingDiscardSeatPos = null;
          if (window.tableManager) {
            window.tableManager.renderDiscards();
          }
          if (typeof onDone === 'function') onDone();
          done();
        }
      });
    });
  }

  /**
   * Return drawn discard tile back to the left player's corner pile (From viewer's hand)
   */
  animateReturnDiscard(toPos, tile, onDone = null) {
    this.animateReturnDiscardFromSeat('bottom', toPos, tile, true, onDone);
  }

  /** Return a side-drawn tile from any player's rack/profile to its original pile. */
  animateReturnDiscardFromSeat(fromPos, toPos, tile, isViewer = false, onDone = null) {
    this.enqueue((done) => {
      let startCoords = null;
      let rackTileEl = null;

      if (isViewer && tile && tile.id) {
        rackTileEl = document.querySelector(`.istaka-slot .okey-tile[data-id="${tile.id}"]`);
        if (rackTileEl) {
          startCoords = this.getElCenter(rackTileEl);
          rackTileEl.style.opacity = '0';
        }
      }

      if (!startCoords) {
        const fromEl = isViewer
          ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
          : document.getElementById('seat-' + fromPos);
        startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(fromPos);
      }

      const discardEl = document.getElementById('discard-pile-' + toPos);
      const endCoords = this.getElCenter(discardEl);

      if (!endCoords) {
        if (typeof onDone === 'function') onDone();
        done();
        return;
      }

      window.flyingDiscardSeatPos = toPos;
      if (window.tableManager) {
        window.tableManager.renderDiscards();
      }

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        tile,
        isClosed: false,
        duration: 340,
        onComplete: () => {
          window.flyingDiscardSeatPos = null;
          if (window.tableManager) {
            window.tableManager.renderDiscards();
          }
          if (typeof onDone === 'function') onDone();
          done();
        }
      });
    });
  }

  /**
   * Open melds (Seri or Pairs) - Tile by tile directly from exact rack slots to table slots
   */
  animateOpenMelds(seatPos, melds, openType = 'seri', isViewer = false, onDone = null) {
    this.enqueue((done) => {
      const fromEl = isViewer
        ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
        : document.getElementById('seat-' + seatPos);

      const defaultStartCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);

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

      if (tileEntries.length === 0) {
        if (typeof onDone === 'function') onDone();
        done();
        return;
      }

      tileEntries.forEach((tile) => {
        // Record rack coordinates if available
        if (isViewer) {
          const rackTileEl = document.querySelector(`.istaka-slot .okey-tile[data-id="${tile.id}"]`);
          if (rackTileEl) {
            tile._rackCoords = this.getElCenter(rackTileEl);
          } else if (window.lastKnownRackCoords && window.lastKnownRackCoords[tile.id]) {
            tile._rackCoords = window.lastKnownRackCoords[tile.id];
          }
        }

        const destEl = document.querySelector(`.center-table-zone .okey-tile[data-id="${tile.id}"]`) || document.querySelector(`.center-table-zone [data-id="${tile.id}"]`);
        if (destEl) {
          destEl.style.opacity = '0';
          const parentSlot = destEl.closest('.grid-cell-slot');
          if (parentSlot) {
            parentSlot.classList.remove('has-tile');
          }
        }
      });

      let completedCount = 0;
      tileEntries.forEach((tile, index) => {
        const destEl = document.querySelector(`.center-table-zone .okey-tile[data-id="${tile.id}"]`) || document.querySelector(`.center-table-zone [data-id="${tile.id}"]`);
        let endCoords = null;

        if (destEl) {
          endCoords = this.getElCenter(destEl);
        } else {
          const fallbackPanel = document.querySelector('.center-table-zone');
          endCoords = this.getElCenter(fallbackPanel);
        }

        const tileStartCoords = (isViewer && (tile._rackCoords || (window.lastKnownRackCoords && window.lastKnownRackCoords[tile.id]))) || defaultStartCoords;

        if (!endCoords) {
          if (window.pendingMeldTileIds) window.pendingMeldTileIds.delete(tile.id);
          completedCount++;
          if (completedCount >= tileEntries.length) {
            if (typeof onDone === 'function') onDone();
            done();
          }
          return;
        }

        setTimeout(() => {
          // Hide tile on rack right as it begins flying
          if (isViewer) {
            const rackTileEl = document.querySelector(`.istaka-slot .okey-tile[data-id="${tile.id}"]`);
            if (rackTileEl) {
              rackTileEl.style.opacity = '0';
            }
          }

          this.flyTile({
            fromCoords: tileStartCoords,
            toCoords: endCoords,
            tile,
            isClosed: false,
            duration: 330,
            onComplete: () => {
              if (window.pendingMeldTileIds) window.pendingMeldTileIds.delete(tile.id);
              const landedEl = document.querySelector(`.center-table-zone .okey-tile[data-id="${tile.id}"]`) || document.querySelector(`.center-table-zone [data-id="${tile.id}"]`);
              if (landedEl) {
                landedEl.style.opacity = '1';
                const parentSlot = landedEl.closest('.grid-cell-slot');
                if (parentSlot) {
                  parentSlot.classList.add('has-tile');
                }
                if (window.soundEngine && typeof window.soundEngine.playTilePlace === 'function') {
                  window.soundEngine.playTilePlace();
                }
              }
              completedCount++;
              if (completedCount >= tileEntries.length) {
                if (typeof onDone === 'function') onDone();
                done();
              }
            }
          });
        }, index * 85);
      });
    });
  }

  /**
   * Process a tile to existing meld on table
   */
  animateProcessTile(seatPos, tile, isViewer = false, onDone = null) {
    this.enqueue((done) => {
      let startCoords = null;
      let rackTileEl = null;

      if (isViewer && tile && tile.id) {
        if (window.lastKnownRackCoords && window.lastKnownRackCoords[tile.id]) {
          startCoords = window.lastKnownRackCoords[tile.id];
        } else {
          rackTileEl = document.querySelector(`.istaka-slot .okey-tile[data-id="${tile.id}"]`);
          if (rackTileEl) {
            startCoords = this.getElCenter(rackTileEl);
            rackTileEl.style.opacity = '0';
          }
        }
      }

      if (!startCoords) {
        const fromEl = isViewer
          ? (document.getElementById('player-istaka-container') || document.getElementById('seat-bottom'))
          : document.getElementById('seat-' + seatPos);
        startCoords = this.getElCenter(fromEl) || this.getSeatFallbackCoords(seatPos);
      }

      const destEl = tile && tile.id ? (document.querySelector(`.center-table-zone .okey-tile[data-id="${tile.id}"]`) || document.querySelector(`.center-table-zone [data-id="${tile.id}"]`)) : null;
      let endCoords = null;

      if (destEl) {
        endCoords = this.getElCenter(destEl);
        destEl.style.opacity = '0';
        const parentSlot = destEl.closest('.grid-cell-slot');
        if (parentSlot) parentSlot.classList.remove('has-tile');
      } else {
        const fallbackPanel = document.querySelector('.center-table-zone');
        endCoords = this.getElCenter(fallbackPanel);
      }

      if (!endCoords) {
        if (typeof onDone === 'function') onDone();
        done();
        return;
      }

      this.flyTile({
        fromCoords: startCoords,
        toCoords: endCoords,
        tile,
        isClosed: false,
        duration: 350,
        onComplete: () => {
          if (destEl) {
            destEl.style.opacity = '1';
            const parentSlot = destEl.closest('.grid-cell-slot');
            if (parentSlot) parentSlot.classList.add('has-tile');
            if (window.soundEngine && typeof window.soundEngine.playTilePlace === 'function') {
              window.soundEngine.playTilePlace();
            }
          }
          if (typeof onDone === 'function') onDone();
          done();
        }
      });
    });
  }
}

window.TileAnimationEngine = TileAnimationEngine;
window.tileAnimations = new TileAnimationEngine();
