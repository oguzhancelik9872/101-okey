/**
 * Istaka (Player's Dual-Row Wood Rack) Management
 * 16 Columns x 2 Rows = 32 Slots (Spacious for all 22 tiles + per gap spacing)
 */
class IstakaManager {
  constructor(containerId, onStateChangeCallback, onTileDoubleClickedCallback, onDrawDeckCallback, onDrawDiscardCallback) {
    this.container = document.getElementById(containerId);
    this.onStateChange = onStateChangeCallback;
    this.onTileDoubleClicked = onTileDoubleClickedCallback;
    this.onDrawDeck = onDrawDeckCallback;
    this.onDrawDiscard = onDrawDiscardCallback;

    this.ROWS = 2;
    this.COLS = 16; // 16 slots per row = 32 slots total (lots of room for gaps)
    
    // Grid holding tiles: grid[row][col] = tile | null
    this.grid = [
      new Array(this.COLS).fill(null),
      new Array(this.COLS).fill(null)
    ];

    this.selectedTileIds = new Set();
    this.draggedSource = null; // { row, col, tile }
    this.indicator = null;
    this.activeTile = null;
    this.tableMelds = [];
    this.viewerOpened = false;
    this.lastDrawnTileId = null;
    this.drawnDiscardTileId = null;

    this.initDOM();
  }

  setDrawnTileId(id) {
    if (this.lastDrawnTileId !== id) {
      this.lastDrawnTileId = id;
      this.render();
    }
  }

  initDOM() {
    if (!this.container) return;
    this.container.innerHTML = '';

    for (let r = 0; r < this.ROWS; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = `istaka-row istaka-row-${r}`;
      rowEl.dataset.row = r;

      for (let c = 0; c < this.COLS; c++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'istaka-slot';
        slotEl.dataset.row = r;
        slotEl.dataset.col = c;

        // Drag & Drop listeners
        slotEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          slotEl.classList.add('drag-over');
        });
        slotEl.addEventListener('dragleave', () => {
          slotEl.classList.remove('drag-over');
        });
        slotEl.addEventListener('drop', (e) => {
          e.preventDefault();
          slotEl.classList.remove('drag-over');

          const action = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (action === 'ACTION:DRAW_DECK') {
            this.pendingDropTarget = { row: r, col: c };
            if (this.onDrawDeck) this.onDrawDeck();
            return;
          }
          if (action === 'ACTION:DRAW_DISCARD') {
            this.pendingDropTarget = { row: r, col: c };
            if (this.onDrawDiscard) this.onDrawDiscard();
            return;
          }

          if (!this.draggedSource) return;

          const { row: srcRow, col: srcCol, tile: srcTile } = this.draggedSource;
          this.insertTileAt(srcRow, srcCol, r, c, srcTile);

          this.draggedSource = null;
          this.activeTile = null;
          this.render();
        });

        slotEl.addEventListener('click', (e) => this.handleSlotClick(e, r, c));

        rowEl.appendChild(slotEl);
      }

      this.container.appendChild(rowEl);
    }
  }

  insertTileAt(srcRow, srcCol, targetRow, targetCol, srcTile) {
    if (srcRow === targetRow && srcCol === targetCol) return;

    const targetOccupied = this.grid[targetRow][targetCol] !== null;

    if (!targetOccupied) {
      // Empty slot, simple move
      this.grid[srcRow][srcCol] = null;
      this.grid[targetRow][targetCol] = srcTile;
      return;
    }

    // Target is occupied -> Insert dynamically between tiles & shift adjacent tiles
    // Remove tile from source first so that spot is freed
    this.grid[srcRow][srcCol] = null;

    // Find nearest empty slot to the right on targetRow
    let rightEmpty = -1;
    for (let c = targetCol + 1; c < this.COLS; c++) {
      if (this.grid[targetRow][c] === null) {
        rightEmpty = c;
        break;
      }
    }

    // Find nearest empty slot to the left on targetRow
    let leftEmpty = -1;
    for (let c = targetCol - 1; c >= 0; c--) {
      if (this.grid[targetRow][c] === null) {
        leftEmpty = c;
        break;
      }
    }

    const distRight = rightEmpty !== -1 ? (rightEmpty - targetCol) : Infinity;
    const distLeft = leftEmpty !== -1 ? (targetCol - leftEmpty) : Infinity;

    // Shift in the direction of the closest empty slot
    if (distRight <= distLeft && distRight !== Infinity) {
      for (let k = rightEmpty; k > targetCol; k--) {
        this.grid[targetRow][k] = this.grid[targetRow][k - 1];
      }
      this.grid[targetRow][targetCol] = srcTile;
    } else if (distLeft < distRight && distLeft !== Infinity) {
      for (let k = leftEmpty; k < targetCol; k++) {
        this.grid[targetRow][k] = this.grid[targetRow][k + 1];
      }
      this.grid[targetRow][targetCol] = srcTile;
    } else {
      // Target row has no empty slots! Check other row
      const otherRow = targetRow === 0 ? 1 : 0;
      let otherEmpty = -1;
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[otherRow][c] === null) {
          otherEmpty = c;
          break;
        }
      }

      if (otherEmpty !== -1) {
        const popped = this.grid[targetRow][this.COLS - 1];
        this.grid[otherRow][otherEmpty] = popped;
        for (let k = this.COLS - 1; k > targetCol; k--) {
          this.grid[targetRow][k] = this.grid[targetRow][k - 1];
        }
        this.grid[targetRow][targetCol] = srcTile;
      } else {
        // Fallback swap if literally all 32 slots are occupied
        const existing = this.grid[targetRow][targetCol];
        this.grid[targetRow][targetCol] = srcTile;
        this.grid[srcRow][srcCol] = existing;
      }
    }
  }

  insertNewTileAt(targetRow, targetCol, newTile) {
    const targetOccupied = this.grid[targetRow][targetCol] !== null;

    if (!targetOccupied) {
      this.grid[targetRow][targetCol] = newTile;
      return;
    }

    // Target is occupied -> Shift adjacent tiles to make room at (targetRow, targetCol)
    let rightEmpty = -1;
    for (let c = targetCol + 1; c < this.COLS; c++) {
      if (this.grid[targetRow][c] === null) {
        rightEmpty = c;
        break;
      }
    }

    let leftEmpty = -1;
    for (let c = targetCol - 1; c >= 0; c--) {
      if (this.grid[targetRow][c] === null) {
        leftEmpty = c;
        break;
      }
    }

    const distRight = rightEmpty !== -1 ? (rightEmpty - targetCol) : Infinity;
    const distLeft = leftEmpty !== -1 ? (targetCol - leftEmpty) : Infinity;

    if (distRight <= distLeft && distRight !== Infinity) {
      for (let k = rightEmpty; k > targetCol; k--) {
        this.grid[targetRow][k] = this.grid[targetRow][k - 1];
      }
      this.grid[targetRow][targetCol] = newTile;
    } else if (distLeft < distRight && distLeft !== Infinity) {
      for (let k = leftEmpty; k < targetCol; k++) {
        this.grid[targetRow][k] = this.grid[targetRow][k + 1];
      }
      this.grid[targetRow][targetCol] = newTile;
    } else {
      const otherRow = targetRow === 0 ? 1 : 0;
      let otherEmpty = -1;
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[otherRow][c] === null) {
          otherEmpty = c;
          break;
        }
      }

      if (otherEmpty !== -1) {
        const popped = this.grid[targetRow][this.COLS - 1];
        this.grid[otherRow][otherEmpty] = popped;
        for (let k = this.COLS - 1; k > targetCol; k--) {
          this.grid[targetRow][k] = this.grid[targetRow][k - 1];
        }
        this.grid[targetRow][targetCol] = newTile;
      } else {
        this.placeInFirstEmptySlot(newTile);
      }
    }
  }

  setIndicator(indicator) {
    this.indicator = indicator;
  }

  setTableMelds(tableMelds) {
    this.tableMelds = tableMelds || [];
  }

  setViewerOpened(opened) {
    this.viewerOpened = !!opened;
  }

  saveTurnSnapshot() {
    this.savedTurnRack = this.grid.map(row => row.map(t => (t ? { id: t.id, color: t.color, number: t.number, isFake: t.isFake, effectiveColor: t.effectiveColor, effectiveValue: t.effectiveValue, isOkey: t.isOkey } : null)));
  }

  hasTurnSnapshot() {
    return Boolean(this.savedTurnRack);
  }

  clearTurnSnapshot() {
    this.savedTurnRack = null;
  }

  restoreTurnSnapshot(tiles) {
    if (!this.savedTurnRack) {
      this.setHand(tiles, true, false);
      return;
    }

    const tileMap = new Map();
    tiles.forEach(t => tileMap.set(t.id, t));

    this.clearGrid();

    // 1. Restore tiles to their exact saved slot positions
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const saved = this.savedTurnRack[r][c];
        if (saved && tileMap.has(saved.id)) {
          this.grid[r][c] = tileMap.get(saved.id);
          tileMap.delete(saved.id);
        }
      }
    }

    // 2. Place any remaining tiles into first empty slots
    for (const [id, tile] of tileMap.entries()) {
      this.placeInFirstEmptySlot(tile);
    }

    this.render();
  }

  /**
   * Loads incoming hand tiles into the rack
   */
  setHand(tiles, preservePositions = true, autoSortRuns = false) {
    const tileMap = new Map();
    tiles.forEach(t => tileMap.set(t.id, t));

    if (preservePositions) {
      // Keep existing positions if tiles are still in hand
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          const current = this.grid[r][c];
          if (current) {
            if (tileMap.has(current.id)) {
              this.grid[r][c] = tileMap.get(current.id);
              tileMap.delete(current.id);
            } else {
              this.grid[r][c] = null;
            }
          }
        }
      }

      // If we have a pending target slot from dragging a drawn tile from deck/discard:
      if (this.pendingDropTarget && tileMap.size > 0) {
        const { row: targetR, col: targetC } = this.pendingDropTarget;
        this.pendingDropTarget = null;

        const firstNewId = tileMap.keys().next().value;
        const newTile = tileMap.get(firstNewId);
        tileMap.delete(firstNewId);

        this.insertNewTileAt(targetR, targetC, newTile);
      }

      // Place newly added tiles in first available empty slots
      for (const [id, tile] of tileMap.entries()) {
        this.placeInFirstEmptySlot(tile);
      }
    } else {
      this.clearGrid();
      if (autoSortRuns && typeof ClientValidator !== 'undefined' && ClientValidator.findBestMelds) {
        const { melds } = ClientValidator.findBestMelds(tiles, this.indicator, null);
        const meldTileIds = new Set();
        melds.forEach(m => m.forEach(t => meldTileIds.add(t.id)));

        const leftovers = tiles.filter(t => !meldTileIds.has(t.id));
        leftovers.sort((a, b) => {
          const ca = a.effectiveColor || a.color;
          const cb = b.effectiveColor || b.color;
          if (ca !== cb) return ca.localeCompare(cb);
          return (a.effectiveValue || a.number) - (b.effectiveValue || b.number);
        });

        this._placeTilesSafely(melds, leftovers, tiles);
      } else {
        let index = 0;
        for (const tile of tiles) {
          const r = Math.floor(index / this.COLS);
          const c = index % this.COLS;
          if (r < this.ROWS) {
            this.grid[r][c] = tile;
            index++;
          }
        }
      }
    }

    this.render();
  }

  clearGrid() {
    this.grid = [
      new Array(this.COLS).fill(null),
      new Array(this.COLS).fill(null)
    ];
  }

  placeInFirstEmptySlot(tile) {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (!this.grid[r][c]) {
          this.grid[r][c] = tile;
          return true;
        }
      }
    }
    return false;
  }

  getAllTiles() {
    const list = [];
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c]) list.push(this.grid[r][c]);
      }
    }
    return list;
  }

  render() {
    // Detect valid melds formed on rack (contiguous segments between empty slots)
    const rackAnalysis = this.analyzeRackMelds();

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const slotEl = this.container.querySelector(`.istaka-slot[data-row="${r}"][data-col="${c}"]`);
        if (!slotEl) continue;

        slotEl.innerHTML = '';
        slotEl.className = 'istaka-slot';

        const tile = this.grid[r][c];
        if (tile) {
          const tileEl = this.createTileElement(tile, r, c);
          slotEl.appendChild(tileEl);
        }
      }
    }

    if (this.onStateChange) {
      this.onStateChange({
        selectedTiles: [],
        rackAnalysis: rackAnalysis,
        bestHandMelds: this.getBestHandMelds()
      });
    }
  }

  createTileElement(tile, row, col, isPartOfValidMeld = false) {
    const el = document.createElement('div');
    el.className = `okey-tile color-${tile.effectiveColor || tile.color}`;
    el.dataset.id = tile.id;
    el.dataset.row = row;
    el.dataset.col = col;
    el.draggable = true;

    if (tile.isOkey) el.classList.add('is-okey-joker');
    if (tile.isFake) el.classList.add('is-fake-okey');
    if (this.activeTile && this.activeTile.id === tile.id) el.classList.add('active-focus');

    const isJustDrawn = (this.lastDrawnTileId && this.lastDrawnTileId === tile.id) || (this.drawnDiscardTileId && this.drawnDiscardTileId === tile.id);
    if (isJustDrawn) {
      el.classList.add('tile-just-drawn');
    }

    // Number & Symbol display
    if (tile.isOkey) {
      // Okey taşı ters çevrili düz beyaz kemik taş olarak durur (herhangi bir sayı veya simge basılmaz)
    } else if (tile.isFake) {
      const numDisplay = document.createElement('span');
      numDisplay.className = 'tile-number';
      numDisplay.innerHTML = `
        <div class="fake-okey-emblem" title="Sahte Okey">
          <svg viewBox="0 0 40 40" class="fake-okey-svg">
            <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5" />
            <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.8" />
            <polygon points="20,7 23.8,14.7 32.3,15.9 26.2,21.9 27.6,30.3 20,26.3 12.4,30.3 13.8,21.9 7.7,15.9 16.2,14.7" fill="currentColor" />
          </svg>
        </div>
      `;
      el.appendChild(numDisplay);
    } else {
      const numDisplay = document.createElement('span');
      numDisplay.className = 'tile-number';
      numDisplay.textContent = tile.effectiveValue !== undefined ? tile.effectiveValue : tile.number;

      const dot = document.createElement('span');
      dot.className = 'tile-dot';

      el.appendChild(numDisplay);
      el.appendChild(dot);
    }

    // Drag handlers (Mouse / Pointer)
    el.addEventListener('dragstart', (e) => {
      this.draggedSource = { row, col, tile };
      window.draggedTileId = tile.id;
      e.dataTransfer.setData('text/plain', tile.id);
      e.dataTransfer.effectAllowed = 'move';

      // Create an exact solid clone off-screen for the drag preview so it is 100% opaque
      const dragPreview = el.cloneNode(true);
      dragPreview.classList.remove('dragging', 'selected', 'active-focus');
      dragPreview.style.position = 'fixed';
      dragPreview.style.top = '-9999px';
      dragPreview.style.left = '-9999px';
      dragPreview.style.opacity = '1';
      dragPreview.style.zIndex = '999999';
      dragPreview.style.pointerEvents = 'none';
      dragPreview.style.transform = 'none';
      dragPreview.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.8), 0 4px 10px rgba(0, 0, 0, 0.6)';
      document.body.appendChild(dragPreview);

      if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(dragPreview, 19, 26);
      }

      setTimeout(() => {
        if (dragPreview.parentNode) {
          dragPreview.parentNode.removeChild(dragPreview);
        }
      }, 0);

      requestAnimationFrame(() => {
        el.classList.add('dragging');
      });
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      this.draggedSource = null;
      window.draggedTileId = null;
      document.querySelectorAll('.istaka-slot').forEach(s => s.classList.remove('drag-over'));
      document.querySelectorAll('.meld-drag-hover').forEach(m => m.classList.remove('meld-drag-hover'));
    });

    // Touch event handlers for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoveActive = false;
    let ghostEl = null;

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchMoveActive = false;
      this.draggedSource = { row, col, tile };
      window.draggedTileId = tile.id;
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (!touchMoveActive && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        touchMoveActive = true;
        ghostEl = el.cloneNode(true);
        ghostEl.classList.remove('active-focus', 'tile-just-drawn', 'dragging');
        ghostEl.style.position = 'fixed';
        ghostEl.style.zIndex = '9999999';
        ghostEl.style.pointerEvents = 'none';
        ghostEl.style.opacity = '0.96';
        ghostEl.style.transform = 'translate(-50%, -50%) scale(1.15)';
        ghostEl.style.boxShadow = '0 16px 36px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.7)';
        ghostEl.style.left = `${touch.clientX}px`;
        ghostEl.style.top = `${touch.clientY}px`;
        document.body.appendChild(ghostEl);
        el.classList.add('dragging');
      }

      if (touchMoveActive) {
        e.preventDefault(); // Prevent page scroll / pull-to-refresh
        if (ghostEl) {
          ghostEl.style.left = `${touch.clientX}px`;
          ghostEl.style.top = `${touch.clientY}px`;
        }

        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        document.querySelectorAll('.istaka-slot').forEach(s => s.classList.remove('drag-over'));
        document.querySelectorAll('.plus-discard-box').forEach(b => b.classList.remove('drag-over'));
        document.querySelectorAll('.table-grid-row, .table-pairs-row').forEach(m => m.classList.remove('meld-drag-hover'));
        
        if (elemBelow) {
          const slot = elemBelow.closest('.istaka-slot');
          if (slot) slot.classList.add('drag-over');
          const discard = elemBelow.closest('#discard-pile-bottom') || elemBelow.closest('.corner-bottom-right');
          if (discard) {
            const box = discard.querySelector('.plus-discard-box') || discard;
            box.classList.add('drag-over');
          }
          const meldRow = elemBelow.closest('.table-grid-row') || elemBelow.closest('.table-pairs-row');
          if (meldRow) meldRow.classList.add('meld-drag-hover');
        }
      }
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (ghostEl) {
        if (ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
        ghostEl = null;
      }
      el.classList.remove('dragging');
      document.querySelectorAll('.istaka-slot').forEach(s => s.classList.remove('drag-over'));
      document.querySelectorAll('.plus-discard-box').forEach(b => b.classList.remove('drag-over'));
      document.querySelectorAll('.table-grid-row, .table-pairs-row').forEach(m => m.classList.remove('meld-drag-hover'));

      if (touchMoveActive && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elemBelow) {
          const targetSlot = elemBelow.closest('.istaka-slot');
          const targetDiscard = elemBelow.closest('#discard-pile-bottom') || elemBelow.closest('.corner-bottom-right');
          const targetMeldRow = elemBelow.closest('.table-grid-row') || elemBelow.closest('.table-pairs-row');

          if (targetDiscard) {
            if (this.onTileDoubleClicked) {
              this.onTileDoubleClicked(tile);
            }
          } else if (targetMeldRow) {
            const meldId = targetMeldRow.dataset.meldId;
            if (meldId && window.onProcessTileTouch) {
              window.onProcessTileTouch(tile.id, meldId);
            }
          } else if (targetSlot) {
            const targetRow = parseInt(targetSlot.dataset.row, 10);
            const targetCol = parseInt(targetSlot.dataset.col, 10);
            if (!isNaN(targetRow) && !isNaN(targetCol) && this.draggedSource) {
              const { row: srcRow, col: srcCol, tile: srcTile } = this.draggedSource;
              this.insertTileAt(srcRow, srcCol, targetRow, targetCol, srcTile);
              this.render();
            }
          }
        }
        this.draggedSource = null;
        window.draggedTileId = null;
      }
    });

    // Drop onto this specific tile to insert directly before/at this tile
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const slot = el.closest('.istaka-slot');
      if (slot) slot.classList.add('drag-over');
    });

    el.addEventListener('dragleave', () => {
      const slot = el.closest('.istaka-slot');
      if (slot) slot.classList.remove('drag-over');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const slot = el.closest('.istaka-slot');
      if (slot) slot.classList.remove('drag-over');

      const action = e.dataTransfer.getData('text/plain') || window.draggedTileId;
      if (action === 'ACTION:DRAW_DECK') {
        this.pendingDropTarget = { row, col };
        if (this.onDrawDeck) this.onDrawDeck();
        return;
      }
      if (action === 'ACTION:DRAW_DISCARD') {
        this.pendingDropTarget = { row, col };
        if (this.onDrawDiscard) this.onDrawDiscard();
        return;
      }

      if (!this.draggedSource) return;

      const { row: srcRow, col: srcCol, tile: srcTile } = this.draggedSource;
      this.insertTileAt(srcRow, srcCol, row, col, srcTile);

      this.draggedSource = null;
      this.activeTile = null;
      this.render();
    });

    // Click & Double-Click Handler (Foolproof across all devices and DOM re-renders)
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = Date.now();
      const isDouble = (this.lastClickTileId === tile.id && (now - (this.lastClickTime || 0)) < 350);
      this.lastClickTime = now;
      this.lastClickTileId = tile.id;

      if (isDouble) {
        this.lastClickTileId = null;
        if (this.onTileDoubleClicked) {
          this.onTileDoubleClicked(tile);
        }
        return;
      }

      // If another tile was active and user clicks on this tile, insert activeTile at (row, col) shifting others!
      if (this.activeTile && this.activeTile.id !== tile.id) {
        let srcR = -1, srcC = -1;
        for (let r = 0; r < this.ROWS; r++) {
          for (let c = 0; c < this.COLS; c++) {
            if (this.grid[r][c] && this.grid[r][c].id === this.activeTile.id) {
              srcR = r;
              srcC = c;
              break;
            }
          }
          if (srcR !== -1) break;
        }

        if (srcR !== -1) {
          const movingTile = this.activeTile;
          this.activeTile = null;
          this.insertTileAt(srcR, srcC, row, col, movingTile);
          this.render();
          return;
        }
      }

      this.activeTile = (this.activeTile && this.activeTile.id === tile.id) ? null : tile;
      this.render();
    });

    return el;
  }

  getSelectedTiles() {
    return [];
  }

  clearSelection() {
    this.activeTile = null;
    this.render();
  }

  handleSlotClick(e, row, col) {
    // If we clicked a tile then click any slot (empty or occupied), insert it there
    if (!this.activeTile) return;

    let srcR = -1, srcC = -1;
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.grid[r][c] && this.grid[r][c].id === this.activeTile.id) {
          srcR = r;
          srcC = c;
          break;
        }
      }
      if (srcR !== -1) break;
    }

    if (srcR !== -1) {
      const movingTile = this.activeTile;
      this.activeTile = null;
      this.insertTileAt(srcR, srcC, row, col, movingTile);
      this.render();
    }
  }

  setDrawnDiscardTileId(tileId) {
    this.drawnFromDiscardTileId = tileId;
  }

  /**
   * Safe placement helper that guarantees 100% of player's hand tiles are placed on rack without any being lost!
   */
  _placeTilesSafely(groups, leftovers, allTiles) {
    this.clearGrid();

    let r = 0;
    let c = 0;
    const unplacedLeftovers = [...leftovers];

    // Place all meld/pair groups onto the rack (A group is NEVER split across rows!)
    for (const group of groups) {
      if (!group || group.length === 0) continue;

      // If group does not fit in remaining columns of current row, move to row 1
      if (c + group.length > this.COLS) {
        r++;
        c = 0;
      }

      // If exceeding 2 rows, place tightly on row 1
      if (r >= this.ROWS) {
        r = this.ROWS - 1;
        c = Math.max(0, this.COLS - group.length);
      }

      // Place all tiles of this group contiguously
      for (const t of group) {
        if (c < this.COLS && r < this.ROWS) {
          this.grid[r][c++] = t;
        }
      }

      // Leave a 1-slot gap after the group if there is still room on the row
      if (c < this.COLS) {
        c++;
      }
    }

    // Place leftovers into remaining available empty slots
    // 1. First, place on the current row/col after the last placed group
    while (unplacedLeftovers.length > 0 && r < this.ROWS) {
      if (c >= this.COLS) {
        r++;
        c = 0;
        continue;
      }
      if (r < this.ROWS && !this.grid[r][c]) {
        this.grid[r][c] = unplacedLeftovers.shift();
      }
      c++;
    }

    // 2. If any leftovers remain (e.g. gaps left on row 0 before row wrap), fill any remaining empty slots
    if (unplacedLeftovers.length > 0) {
      for (let row = 0; row < this.ROWS && unplacedLeftovers.length > 0; row++) {
        for (let col = 0; col < this.COLS && unplacedLeftovers.length > 0; col++) {
          if (!this.grid[row][col]) {
            this.grid[row][col] = unplacedLeftovers.shift();
          }
        }
      }
    }

    // Final safety verification: Ensure 100% of all tiles exist on the rack
    const placedIds = new Set();
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        if (this.grid[row][col]) placedIds.add(this.grid[row][col].id);
      }
    }
    for (const t of allTiles) {
      if (!placedIds.has(t.id)) {
        this.placeInFirstEmptySlot(t);
      }
    }
  }

  /**
   * Smart "Seri Diz" (Perlere Göre Akıllı Diz)
   */
  autoSortRuns(requiredTileId = null) {
    const allTiles = this.getAllTiles();
    if (allTiles.length === 0) return;

    const { melds } = ClientValidator.findBestMelds(allTiles, this.indicator, requiredTileId);
    const meldTileIds = new Set();
    melds.forEach(m => m.forEach(t => meldTileIds.add(t.id)));

    const leftovers = allTiles.filter(t => !meldTileIds.has(t.id));
    leftovers.sort((a, b) => {
      const ca = a.effectiveColor || a.color;
      const cb = b.effectiveColor || b.color;
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.effectiveValue || a.number) - (b.effectiveValue || b.number);
    });

    this._placeTilesSafely(melds, leftovers, allTiles);

    this.clearSelection();
    this.render();
  }

  /**
   * Smart "Çift Diz" (Çiftlere Göre Akıllı Diz)
   */
  autoSortPairs(requiredTileId = null) {
    const allTiles = this.getAllTiles();
    if (allTiles.length === 0) return;

    const pairs = ClientValidator.findAllPairs(allTiles, this.indicator, requiredTileId);
    const usedIds = new Set();
    pairs.forEach(p => { usedIds.add(p[0].id); usedIds.add(p[1].id); });

    const leftovers = allTiles.filter(t => !usedIds.has(t.id));
    leftovers.sort((a, b) => (a.effectiveValue || a.number) - (b.effectiveValue || b.number));

    this._placeTilesSafely(pairs, leftovers, allTiles);

    this.clearSelection();
    this.render();
  }

  /**
   * Analyzes contiguous tile segments currently arranged on the rack
   */
  analyzeRackMelds() {
    const validMelds = [];
    const invalidSegments = [];
    const validTileIds = new Set();
    let totalScore = 0;

    for (let r = 0; r < this.ROWS; r++) {
      let currentSegment = [];

      for (let c = 0; c < this.COLS; c++) {
        const t = this.grid[r][c];
        if (t) {
          currentSegment.push(t);
        } else {
          if (currentSegment.length > 0) {
            this._evaluateSegment(currentSegment, validMelds, invalidSegments, validTileIds);
            currentSegment = [];
          }
        }
      }

      if (currentSegment.length > 0) {
        this._evaluateSegment(currentSegment, validMelds, invalidSegments, validTileIds);
      }
    }

    totalScore = validMelds.reduce((sum, m) => sum + m.score, 0);

    return {
      validMelds,
      invalidSegments,
      validTileIds,
      totalScore
    };
  }

  _evaluateSegment(segment, validMelds, invalidSegments, validTileIds) {
    if (segment.length >= 3) {
      const check = ClientValidator.isValidMeld(segment, this.indicator);
      if (check.valid) {
        validMelds.push({ type: check.type, tiles: segment, score: check.score });
        segment.forEach(t => validTileIds.add(t.id));
      } else {
        invalidSegments.push(segment);
      }
    } else {
      invalidSegments.push(segment);
    }
  }

  /**
   * Analyzes contiguous 2-tile pair segments currently arranged on the rack
   */
  analyzeRackPairs() {
    const validPairs = [];
    const invalidSegments = [];
    const validTileIds = new Set();

    for (let r = 0; r < this.ROWS; r++) {
      let currentSegment = [];

      for (let c = 0; c < this.COLS; c++) {
        const t = this.grid[r][c];
        if (t) {
          currentSegment.push(t);
        } else {
          if (currentSegment.length > 0) {
            this._evaluatePairSegment(currentSegment, validPairs, invalidSegments, validTileIds);
            currentSegment = [];
          }
        }
      }

      if (currentSegment.length > 0) {
        this._evaluatePairSegment(currentSegment, validPairs, invalidSegments, validTileIds);
      }
    }

    return {
      validPairs,
      invalidSegments,
      validTileIds,
      count: validPairs.length
    };
  }

  _evaluatePairSegment(segment, validPairs, invalidSegments, validTileIds) {
    if (segment.length === 2) {
      if (ClientValidator.isPair(segment[0], segment[1], this.indicator)) {
        validPairs.push(segment);
        validTileIds.add(segment[0].id);
        validTileIds.add(segment[1].id);
      } else {
        invalidSegments.push(segment);
      }
    } else {
      invalidSegments.push(segment);
    }
  }

  getBestHandMelds(requiredTileId = null) {
    return ClientValidator.findBestMelds(this.getAllTiles(), this.indicator, requiredTileId);
  }
}

window.IstakaManager = IstakaManager;
