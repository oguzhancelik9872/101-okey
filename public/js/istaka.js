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
    this.activeMeldGroup = null; // { row, startCol, count, tiles }
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
          if (window.draggedMeldGroup) {
            this.showGroupDropPreview(r, c, window.draggedMeldGroup);
          } else {
            slotEl.classList.add('drag-over');
          }
        });
        slotEl.addEventListener('dragleave', () => {
          if (!window.draggedMeldGroup) slotEl.classList.remove('drag-over');
        });
        slotEl.addEventListener('drop', (e) => {
          e.preventDefault();
          slotEl.classList.remove('drag-over');

          const action = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (action === 'ACTION:MOVE_MELD_GROUP' || window.draggedMeldGroup) {
            const mg = window.draggedMeldGroup;
            window.draggedMeldGroup = null;
            this.clearDragHighlights();
            this.removeGroupDragPreview();
            if (mg) {
              this.moveMeldGroup(mg.row, mg.startCol, mg.count, r, c);
              this.render();
              return;
            }
          }

          if (action === 'ACTION:DRAW_DECK') {
            window.lastManualDragTime = Date.now();
            window.lastActionWasManualDrag = true;
            this.pendingDropTarget = { row: r, col: c };
            if (this.onDrawDeck) this.onDrawDeck();
            return;
          }
          if (action === 'ACTION:DRAW_DISCARD') {
            window.lastManualDragTime = Date.now();
            window.lastActionWasManualDrag = true;
            this.pendingDropTarget = { row: r, col: c };
            if (this.onDrawDiscard) this.onDrawDiscard();
            return;
          }

          if (!this.draggedSource) return;

          const { row: srcRow, col: srcCol, tile: srcTile } = this.draggedSource;
          this.insertTileAt(srcRow, srcCol, r, c, srcTile);

          this.draggedSource = null;
          this.activeTile = null;
          this.activeMeldGroup = null;
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

  findIsolatedRackMeldsAndPairs() {
    const isolatedGroups = [];

    for (let r = 0; r < this.ROWS; r++) {
      let startCol = -1;
      let segment = [];

      for (let c = 0; c < this.COLS; c++) {
        const t = this.grid[r][c];
        if (t) {
          if (startCol === -1) startCol = c;
          segment.push(t);
        } else {
          if (segment.length > 0) {
            this._checkIfIsolatedValidGroup(r, startCol, segment, isolatedGroups);
            startCol = -1;
            segment = [];
          }
        }
      }

      if (segment.length > 0) {
        this._checkIfIsolatedValidGroup(r, startCol, segment, isolatedGroups);
      }
    }

    return isolatedGroups;
  }

  _checkIfIsolatedValidGroup(row, startCol, segment, isolatedGroups) {
    if (typeof ClientValidator === 'undefined') return;

    if (segment.length >= 3) {
      const check = ClientValidator.isValidMeld(segment, this.indicator);
      if (check && check.valid) {
        isolatedGroups.push({
          type: check.type,
          row,
          startCol,
          endCol: startCol + segment.length - 1,
          count: segment.length,
          tiles: [...segment]
        });
        return;
      }
    } else if (segment.length === 2) {
      if (ClientValidator.isPair(segment[0], segment[1], this.indicator)) {
        isolatedGroups.push({
          type: 'pairs',
          row,
          startCol,
          endCol: startCol + segment.length - 1,
          count: segment.length,
          tiles: [...segment]
        });
        return;
      }
    }
  }

  moveMeldGroup(srcRow, srcStartCol, count, targetRow, targetCol) {
    // 1. Extract the group tiles
    const groupTiles = [];
    for (let c = srcStartCol; c < srcStartCol + count; c++) {
      if (this.grid[srcRow][c]) {
        groupTiles.push(this.grid[srcRow][c]);
        this.grid[srcRow][c] = null;
      }
    }

    if (groupTiles.length === 0) return;

    // 2. The cursor is holding the rightmost tile (where the green handle is located),
    // so targetCol is where the rightmost tile will sit! The meld starts at (targetCol - count + 1).
    let computedStartCol = targetCol - groupTiles.length + 1;
    if (computedStartCol < 0) {
      computedStartCol = 0;
    }
    if (computedStartCol + groupTiles.length > this.COLS) {
      computedStartCol = Math.max(0, this.COLS - groupTiles.length);
    }

    // 3. Find any existing tiles occupying slots from computedStartCol to computedStartCol + groupTiles.length - 1
    const displacedTiles = [];
    for (let i = 0; i < groupTiles.length; i++) {
      const col = computedStartCol + i;
      if (this.grid[targetRow][col] !== null) {
        displacedTiles.push(this.grid[targetRow][col]);
        this.grid[targetRow][col] = null;
      }
    }

    // 4. Place the groupTiles into the target slots contiguously
    for (let i = 0; i < groupTiles.length; i++) {
      this.grid[targetRow][computedStartCol + i] = groupTiles[i];
    }

    // 5. Re-place any displaced tiles into the nearest available empty slots on the rack
    for (const dTile of displacedTiles) {
      this.placeInFirstEmptySlot(dTile);
    }
  }

  clearDragHighlights() {
    document.querySelectorAll('.istaka-slot.drag-over, .istaka-slot.drag-group-over')
      .forEach(slot => slot.classList.remove('drag-over', 'drag-group-over'));
  }

  showGroupDropPreview(targetRow, targetCol, group) {
    this.clearDragHighlights();
    if (!group || !group.count) return;
    const startCol = Math.max(0, Math.min(this.COLS - group.count, targetCol - group.count + 1));
    for (let index = 0; index < group.count; index++) {
      const slot = this.container.querySelector(`.istaka-slot[data-row="${targetRow}"][data-col="${startCol + index}"]`);
      if (slot) slot.classList.add('drag-group-over');
    }
  }

  removeGroupDragPreview() {
    if (!this.groupDragPreviewEl) return;
    this.groupDragPreviewEl.remove();
    this.groupDragPreviewEl = null;
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
    if (preservePositions && (this.draggedSource || window.draggedMeldGroup || (this.touchDrag && this.touchDrag.moved))) {
      this.pendingServerHand = Array.isArray(tiles) ? [...tiles] : [];
      return;
    }

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

  flushPendingHand() {
    if (!this.pendingServerHand || this.draggedSource || window.draggedMeldGroup || (this.touchDrag && this.touchDrag.moved)) return;
    const pending = this.pendingServerHand;
    this.pendingServerHand = null;
    this.setHand(pending, true, false);
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
    const isolatedGroups = this.findIsolatedRackMeldsAndPairs();

    const groupHandleMap = new Map();
    const groupActiveTileIdSet = new Set();

    if (this.activeMeldGroup) {
      this.activeMeldGroup.tiles.forEach(t => groupActiveTileIdSet.add(t.id));
    }

    isolatedGroups.forEach(g => {
      groupHandleMap.set(`${g.row}_${g.endCol}`, g);
    });

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const slotEl = this.container.querySelector(`.istaka-slot[data-row="${r}"][data-col="${c}"]`);
        if (!slotEl) continue;

        slotEl.innerHTML = '';
        slotEl.className = 'istaka-slot';

        const tile = this.grid[r][c];
        if (tile) {
          const isGroupActive = groupActiveTileIdSet.has(tile.id);
          const tileEl = this.createTileElement(tile, r, c);
          if (isGroupActive) {
            tileEl.classList.add('active-meld-group-focus');
          }

          // Attach green group move handle to the last tile of each isolated valid meld group
          const group = groupHandleMap.get(`${r}_${c}`);
          if (group) {
            const handleEl = document.createElement('div');
            handleEl.className = 'meld-group-drag-handle';
            handleEl.title = `Per Grubunu Taşı (${group.count} Taş) - Sürükle veya Tıkla`;
            handleEl.innerHTML = '✥';
            handleEl.draggable = true;

            handleEl.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.activeMeldGroup && this.activeMeldGroup.row === group.row && this.activeMeldGroup.startCol === group.startCol) {
                this.activeMeldGroup = null;
              } else {
                this.activeMeldGroup = group;
                this.activeTile = null;
              }
              this.render();
            });

            handleEl.addEventListener('dragstart', (e) => {
              e.stopPropagation();
              window.draggedMeldGroup = group;
              e.dataTransfer.setData('text/plain', 'ACTION:MOVE_MELD_GROUP');
              e.dataTransfer.effectAllowed = 'move';

              const preview = document.createElement('div');
              preview.className = 'meld-group-drag-preview';
              preview.style.display = 'flex';
              preview.style.gap = '2px';
              preview.style.position = 'fixed';
              preview.style.top = '-9999px';
              preview.style.left = '-9999px';
              preview.style.zIndex = '999999';
              preview.style.pointerEvents = 'none';

              group.tiles.forEach(t => {
                const clone = this.createTileElement(t, group.row, group.startCol);
                clone.style.transform = 'none';
                preview.appendChild(clone);
              });
              document.body.appendChild(preview);
              this.removeGroupDragPreview();
              this.groupDragPreviewEl = preview;

              if (e.dataTransfer.setDragImage) {
                const previewRect = preview.getBoundingClientRect();
                const offsetX = previewRect.width > 0 ? Math.max(10, previewRect.width - 6) : (group.tiles.length * 36 - 6);
                const offsetY = 6;
                e.dataTransfer.setDragImage(preview, offsetX, offsetY);
              }

            });

            handleEl.addEventListener('dragend', () => {
              window.draggedMeldGroup = null;
              this.clearDragHighlights();
              this.removeGroupDragPreview();
              this.flushPendingHand();
            });

            tileEl.appendChild(handleEl);
          }

          slotEl.appendChild(tileEl);
        }
      }
    }

    // Save exact physical pixel coordinates of every tile currently sitting on the rack
    window.lastKnownRackCoords = window.lastKnownRackCoords || {};
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const t = this.grid[r][c];
        if (t) {
          const slotEl = this.container.querySelector(`.istaka-slot[data-row="${r}"][data-col="${c}"]`);
          if (slotEl) {
            const rect = slotEl.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              window.lastKnownRackCoords[t.id] = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height
              };
            }
          }
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
    el.style.touchAction = 'none';

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

    // Drag handlers
    el.addEventListener('dragstart', (e) => {
      this.draggedSource = { row, col, tile };
      window.draggedTileId = tile.id;
      e.dataTransfer.setData('text/plain', tile.id);
      e.dataTransfer.effectAllowed = 'move';

      // Keep a 100% solid, identical clone alive for the whole native drag.
      // Chromium can lose the drag image when its source node is removed too early.
      const rect = el.getBoundingClientRect();
      if (this.dragPreviewEl) this.dragPreviewEl.remove();
      const dragPreview = el.cloneNode(true);
      dragPreview.id = 'active-drag-tile-preview';
      dragPreview.classList.remove('dragging', 'selected', 'active-focus', 'tile-just-drawn');
      dragPreview.style.position = 'fixed';
      dragPreview.style.left = '-10000px';
      dragPreview.style.top = '0';
      dragPreview.style.width = `${rect.width}px`;
      dragPreview.style.height = `${rect.height}px`;
      dragPreview.style.opacity = '1';
      dragPreview.style.visibility = 'visible';
      dragPreview.style.zIndex = '999999';
      dragPreview.style.pointerEvents = 'none';
      dragPreview.style.transform = 'none';
      dragPreview.style.margin = '0';
      dragPreview.style.transition = 'none';
      document.body.appendChild(dragPreview);
      this.dragPreviewEl = dragPreview;

      if (e.dataTransfer && e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(dragPreview, (rect.width || 38) / 2, (rect.height || 52) / 2);
      }

    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      this.draggedSource = null;
      window.draggedTileId = null;
      if (this.dragPreviewEl) {
        this.dragPreviewEl.remove();
        this.dragPreviewEl = null;
      }
      document.querySelectorAll('.istaka-slot').forEach(s => s.classList.remove('drag-over'));
      document.querySelectorAll('.meld-drag-hover').forEach(m => m.classList.remove('meld-drag-hover'));
      this.flushPendingHand();
    });

    // Native HTML drag/drop is unreliable or completely disabled on many
    // mobile browsers. Pointer events provide the same rack, discard and
    // table-meld actions for a finger/stylus without breaking mouse drag.
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.button !== 0) return;
      this.touchDrag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        row,
        col,
        tile,
        moved: false
      };
      el.setPointerCapture?.(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      const drag = this.touchDrag;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const distance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (distance < 8) return;
      drag.moved = true;
      e.preventDefault();
      el.classList.add('dragging', 'touch-dragging');
      document.querySelectorAll('.mobile-drag-target').forEach(node => node.classList.remove('mobile-drag-target'));
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const dropTarget = target?.closest('.istaka-slot, #discard-pile-bottom, .meld-row');
      if (dropTarget && !dropTarget.contains(el)) dropTarget.classList.add('mobile-drag-target');
    });

    const finishTouchDrag = (e) => {
      const drag = this.touchDrag;
      if (!drag || drag.pointerId !== e.pointerId) return;
      this.touchDrag = null;
      el.releasePointerCapture?.(e.pointerId);
      el.classList.remove('dragging', 'touch-dragging');
      document.querySelectorAll('.mobile-drag-target').forEach(node => node.classList.remove('mobile-drag-target'));
      if (!drag.moved) return;

      e.preventDefault();
      this.suppressClickUntil = Date.now() + 450;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const targetSlot = target?.closest('.istaka-slot');
      const targetMeld = target?.closest('.meld-row[data-meld-id]');
      const targetDiscard = target?.closest('#discard-pile-bottom');

      if (targetSlot) {
        const targetRow = Number(targetSlot.dataset.row);
        const targetCol = Number(targetSlot.dataset.col);
        if (Number.isInteger(targetRow) && Number.isInteger(targetCol)) {
          this.insertTileAt(row, col, targetRow, targetCol, tile);
          this.activeTile = null;
          this.activeMeldGroup = null;
          this.render();
        }
      } else if (targetDiscard && this.onTileDoubleClicked) {
        window.lastManualDragTime = Date.now();
        window.lastActionWasManualDrag = true;
        this.onTileDoubleClicked(tile);
      } else if (targetMeld && window.tableManager?.onProcessTileDragDrop) {
        window.lastManualDragTime = Date.now();
        window.lastActionWasManualDrag = true;
        window.tableManager.onProcessTileDragDrop(tile.id, targetMeld.dataset.meldId);
      }
      this.flushPendingHand();
    };

    el.addEventListener('pointerup', finishTouchDrag);
    el.addEventListener('pointercancel', (e) => {
      if (this.touchDrag?.pointerId === e.pointerId) this.touchDrag = null;
      el.classList.remove('dragging', 'touch-dragging');
      document.querySelectorAll('.mobile-drag-target').forEach(node => node.classList.remove('mobile-drag-target'));
      this.flushPendingHand();
    });

    // Drop onto this specific tile to insert directly before/at this tile
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const slot = el.closest('.istaka-slot');
      if (window.draggedMeldGroup) {
        this.showGroupDropPreview(row, col, window.draggedMeldGroup);
      } else if (slot) {
        slot.classList.add('drag-over');
      }
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
      if (action === 'ACTION:MOVE_MELD_GROUP' || window.draggedMeldGroup) {
        const mg = window.draggedMeldGroup;
        window.draggedMeldGroup = null;
        this.clearDragHighlights();
        this.removeGroupDragPreview();
        if (mg) {
          this.moveMeldGroup(mg.row, mg.startCol, mg.count, row, col);
          this.render();
          return;
        }
      }

      if (action === 'ACTION:DRAW_DECK') {
        window.lastManualDragTime = Date.now();
        window.lastActionWasManualDrag = true;
        this.pendingDropTarget = { row, col };
        if (this.onDrawDeck) this.onDrawDeck();
        return;
      }
      if (action === 'ACTION:DRAW_DISCARD') {
        window.lastManualDragTime = Date.now();
        window.lastActionWasManualDrag = true;
        this.pendingDropTarget = { row, col };
        if (this.onDrawDiscard) this.onDrawDiscard();
        return;
      }

      if (!this.draggedSource) return;

      const { row: srcRow, col: srcCol, tile: srcTile } = this.draggedSource;
      this.insertTileAt(srcRow, srcCol, row, col, srcTile);

      this.draggedSource = null;
      this.activeTile = null;
      this.activeMeldGroup = null;
      this.render();
    });

    // Click & Double-Click Handler (Foolproof across all devices and DOM re-renders)
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() < (this.suppressClickUntil || 0)) return;
      const now = Date.now();
      const isDouble = (this.lastClickTileId === tile.id && (now - (this.lastClickTime || 0)) < 350);
      this.lastClickTime = now;
      this.lastClickTileId = tile.id;

      if (isDouble) {
        this.lastClickTileId = null;
        window.lastActionWasManualDrag = false;
        if (this.onTileDoubleClicked) {
          this.onTileDoubleClicked(tile);
        }
        return;
      }

      // If active meld group is selected, move it to this slot on click!
      if (this.activeMeldGroup) {
        const mg = this.activeMeldGroup;
        this.activeMeldGroup = null;
        this.moveMeldGroup(mg.row, mg.startCol, mg.count, row, col);
        this.render();
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
    this.activeMeldGroup = null;
    this.render();
  }

  handleSlotClick(e, row, col) {
    if (this.activeMeldGroup) {
      const mg = this.activeMeldGroup;
      this.activeMeldGroup = null;
      this.moveMeldGroup(mg.row, mg.startCol, mg.count, row, col);
      this.render();
      return;
    }

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
    if (this.drawnDiscardTileId !== tileId) {
      this.drawnDiscardTileId = tileId;
      this.render();
    }
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
