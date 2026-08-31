const FEMALE_NAMES = new Set([
  'zeynep', 'ayse', 'fatma', 'elif', 'merve', 'ece', 'selin', 'gizem', 'busra',
  'derya', 'seda', 'ceren', 'irem', 'ebru', 'gamze', 'melis', 'pinar',
  'tugba', 'hande', 'asli', 'burcu', 'damla', 'sinem', 'yasemin',
  'berna', 'kubra', 'hilal', 'melike', 'filiz', 'hulya', 'sevgi', 'songul',
  'ayşe', 'büşra', 'pınar', 'tuğba', 'aslı', 'kübra', 'hülya'
]);

const femaleAvatars = Array.from({ length: 9 }, (_, i) => `<img src="/assets/avatars/female_${i}.png" alt="Female Avatar" class="avatar-img-photo" />`);
const maleAvatars = Array.from({ length: 9 }, (_, i) => `<img src="/assets/avatars/male_${i}.png" alt="Male Avatar" class="avatar-img-photo" />`);

function getPlayerAvatarHTML(name, gender = null, avatarIndex = null, isBot = false) {
  const isBotUser = Boolean(isBot || (typeof name === 'string' && name.includes('(Bot)')));
  const clean = (name || '').replace('(Bot)', '').trim().toLowerCase().split(' ')[0];
  const isFemale = (gender === 'female') || FEMALE_NAMES.has(clean);

  if (isBotUser) {
    if (isFemale) {
      return `<div class="bot-avatar-badge bot-female"><span class="bot-glyph">🤖</span></div>`;
    } else {
      return `<div class="bot-avatar-badge bot-male"><span class="bot-glyph">🤖</span></div>`;
    }
  }

  const list = isFemale ? femaleAvatars : maleAvatars;

  if (avatarIndex !== null && avatarIndex !== undefined && avatarIndex >= 0 && avatarIndex < list.length) {
    return list[avatarIndex];
  }

  const charCodeSum = (name || 'user').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const idx = charCodeSum % list.length;
  return list[idx] || list[0];
}

function getPlayerAvatarSVG(name, gender = null, avatarIndex = null, isBot = false) {
  return getPlayerAvatarHTML(name, gender, avatarIndex, isBot);
}

window.femaleAvatars = femaleAvatars;
window.maleAvatars = maleAvatars;
window.getPlayerAvatarHTML = getPlayerAvatarHTML;
window.getPlayerAvatarSVG = getPlayerAvatarSVG;

class TableManager {
  constructor(options = {}) {
    this.onDrawDeck = options.onDrawDeck;
    this.onDrawDiscard = options.onDrawDiscard;
    this.onDiscard = options.onDiscard;
    this.onProcessTile = options.onProcessTile;
    this.onProcessTileDragDrop = options.onProcessTileDragDrop;

    this.viewerSeatIndex = 0;
    this.gameState = null;
  }

  setViewerSeatIndex(seatIndex) {
    this.viewerSeatIndex = seatIndex;
  }

  getRelativePosition(seatIndex) {
    const diff = (seatIndex - this.viewerSeatIndex + 4) % 4;
    switch (diff) {
      case 0: return 'bottom';
      case 1: return 'right';
      case 2: return 'top';
      case 3: return 'left';
    }
  }

  update(gameState) {
    this.gameState = gameState;
    this.renderSeats();
    this.renderCenterDeck();
    this.renderDiscards();
    this.renderTableMelds();
  }

  renderSeats() {
    if (!this.gameState || !this.gameState.players) return;

    const positions = ['bottom', 'right', 'top', 'left'];
    const isMyTurn = this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.state === 'PLAYING';

    const istakaBoardEl = document.querySelector('.plus-istaka-board');
    if (istakaBoardEl) {
      istakaBoardEl.classList.toggle('your-turn-active', isMyTurn);
    }
    const istakaEl = document.getElementById('player-istaka-container');
    if (istakaEl) {
      istakaEl.classList.toggle('your-turn-active', isMyTurn);
    }
    const turnBadge = document.getElementById('turn-indicator-badge');
    if (turnBadge) {
      turnBadge.classList.toggle('hidden', !isMyTurn);
    }

    positions.forEach((pos) => {
      const seatEl = document.getElementById('seat-' + pos);
      if (!seatEl) return;

      // Find player mapped to this relative position
      const player = this.gameState.players.find(p => this.getRelativePosition(p.seatIndex) === pos);

      if (player) {
        seatEl.classList.remove('seat-empty');
        const isCurrentTurn = this.gameState.currentTurn === player.seatIndex && this.gameState.state === 'PLAYING';
        seatEl.classList.toggle('active-turn', isCurrentTurn);

        const nameEl = seatEl.querySelector('.player-name');
        if (nameEl) {
          const displayName = (player.isBot && !player.name.includes('(Bot)')) ? `${player.name} (Bot)` : player.name;
          nameEl.textContent = displayName;
        }

        const avatarEl = seatEl.querySelector('.pod-avatar');
        if (avatarEl) {
          avatarEl.innerHTML = getPlayerAvatarHTML(player.name, player.gender, player.avatarIndex, player.isBot);
        }

        const scoreEl = seatEl.querySelector('.player-score');
        if (scoreEl) scoreEl.textContent = '';

        const statusEl = seatEl.querySelector('.player-open-status');
        if (statusEl) {
          if (this.gameState.state === 'WAITING') {
            statusEl.className = 'player-open-status';
            statusEl.textContent = 'Hazır';
          } else if (player.opened) {
            statusEl.className = 'player-open-status opened';
            if (player.openType === 'pairs') {
              statusEl.textContent = (player.openedMeldsCount || 5) + ' Çift Açtı';
            } else {
              statusEl.textContent = player.openedScore ? (player.openedScore + ' Puanla Açtı') : 'Açtı';
            }
          } else {
            statusEl.className = 'player-open-status not-opened';
            statusEl.textContent = 'Açmadı';
          }
        }
      } else {
        // Empty seat waiting for player
        seatEl.classList.add('seat-empty');
        seatEl.classList.remove('active-turn');

        const nameEl = seatEl.querySelector('.player-name');
        if (nameEl) nameEl.textContent = 'Oyuncu Bekleniyor...';

        const avatarEl = seatEl.querySelector('.pod-avatar');
        if (avatarEl) {
          avatarEl.innerHTML = `
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4 4" stroke-width="2"/>
              <circle cx="50" cy="40" r="16" fill="rgba(255,255,255,0.2)"/>
              <path d="M 24 82 Q 50 64 76 82 Z" fill="rgba(255,255,255,0.2)"/>
            </svg>
          `;
        }

        const statusEl = seatEl.querySelector('.player-open-status');
        if (statusEl) {
          statusEl.className = 'player-open-status';
          statusEl.textContent = 'Boş Koltuk';
        }
      }
    });
  }

  renderCenterDeck() {
    if (!this.gameState) return;

    const deckCountEl = document.getElementById('deck-count');
    if (deckCountEl) {
      deckCountEl.textContent = this.gameState.remainingDeckCount + ' Taş';
    }

    const centerDeckEl = document.getElementById('center-deck-pile');
    const isViewerTurnToDraw = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DRAW');
    if (centerDeckEl) {
      centerDeckEl.draggable = isViewerTurnToDraw;
      centerDeckEl.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'ACTION:DRAW_DECK');
        e.dataTransfer.effectAllowed = 'copyMove';
      };
    }

    const indicatorSlot = document.getElementById('indicator-tile-slot');
    if (indicatorSlot && this.gameState.indicator) {
      indicatorSlot.innerHTML = '';
      const indTile = this.gameState.indicator;
      const tileEl = this.createTileDOM(indTile, true);
      indicatorSlot.appendChild(tileEl);
    }
  }

  renderDiscards() {
    if (!this.gameState || !this.gameState.discards) return;

    for (let i = 0; i < 4; i++) {
      const pos = this.getRelativePosition(i);
      const discardSlot = document.getElementById('discard-pile-' + pos);
      if (!discardSlot) continue;

      discardSlot.innerHTML = '';
      const pile = this.gameState.discards[i];

      if (pile && pile.length > 0) {
        const topTile = pile[pile.length - 1];
        const tileEl = this.createTileDOM(topTile, false);
        discardSlot.appendChild(tileEl);
      }

      const leftPlayerSeat = (this.viewerSeatIndex + 3) % 4;
      const isLeftPlayerDiscard = (i === leftPlayerSeat);
      const isViewerTurnToDraw = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DRAW');

      if (isLeftPlayerDiscard && isViewerTurnToDraw && pile && pile.length > 0) {
        discardSlot.classList.add('can-draw-pulse');
        discardSlot.title = 'Yandan Taş Al (Tıkla veya Istakaya Sürükle)';
        discardSlot.draggable = true;
        discardSlot.ondragstart = (e) => {
          e.dataTransfer.setData('text/plain', 'ACTION:DRAW_DISCARD');
          e.dataTransfer.effectAllowed = 'copyMove';
        };
      } else {
        discardSlot.classList.remove('can-draw-pulse');
        discardSlot.title = '';
        discardSlot.draggable = false;
        discardSlot.ondragstart = null;
      }
    }
  }

  renderTableMelds() {
    const seri1RowsEl = document.getElementById('seri-1-rows');
    const seri2RowsEl = document.getElementById('seri-2-rows');
    const pairs1RowsEl = document.getElementById('pairs-1-rows') || document.getElementById('pairs-rows');
    const pairs2RowsEl = document.getElementById('pairs-2-rows');
    if (!seri1RowsEl || !seri2RowsEl || !pairs1RowsEl || !this.gameState) return;

    seri1RowsEl.innerHTML = '';
    seri2RowsEl.innerHTML = '';
    pairs1RowsEl.innerHTML = '';
    if (pairs2RowsEl) pairs2RowsEl.innerHTML = '';

    const melds = this.gameState.tableMelds || [];
    const seriMelds = melds.filter(m => m.type === 'run' || m.type === 'group');
    const pairMelds = melds.filter(m => m.type === 'pairs');

    const isViewerTurn = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DISCARD');
    const viewerPlayer = this.gameState.players[this.viewerSeatIndex];
    const viewerOpened = viewerPlayer && viewerPlayer.opened;

    // 1. Render Seri Melds: Fill Left 13x13 Panel first, overflow into Right 13x13 Panel
    const MAX_ROWS_PER_PANEL = 13;
    seriMelds.forEach((meld, idx) => {
      const targetContainer = (idx < MAX_ROWS_PER_PANEL) ? seri1RowsEl : seri2RowsEl;

      const meldRow = document.createElement('div');
      meldRow.className = 'table-grid-row meld-row meld-type-' + meld.type;
      meldRow.dataset.meldId = meld.id;

      if (isViewerTurn && viewerOpened) {
        meldRow.title = 'İşlemek istediğiniz taşı bu pere sürükleyip bırakabilirsiniz';
        meldRow.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          meldRow.classList.add('meld-drag-hover');
        });

        meldRow.addEventListener('dragleave', (e) => {
          if (!meldRow.contains(e.relatedTarget)) {
            meldRow.classList.remove('meld-drag-hover');
          }
        });

        meldRow.addEventListener('drop', (e) => {
          e.preventDefault();
          meldRow.classList.remove('meld-drag-hover');
          const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (tileId && !tileId.startsWith('ACTION:')) {
            if (this.onProcessTileDragDrop) {
              this.onProcessTileDragDrop(tileId, meld.id);
            }
          }
        });
      }

      meldRow.addEventListener('click', () => {
        if (isViewerTurn && viewerOpened && this.onProcessTile) {
          this.onProcessTile(meld.id);
        }
      });

      const slotElements = [];
      for (let col = 1; col <= 13; col++) {
        const slot = document.createElement('div');
        slot.className = 'grid-cell-slot col-' + col;
        slot.dataset.col = col;

        if (isViewerTurn && viewerOpened) {
          slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            meldRow.classList.add('meld-drag-hover');
          });
          slot.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            meldRow.classList.remove('meld-drag-hover');
            const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
            if (tileId && !tileId.startsWith('ACTION:')) {
              if (this.onProcessTileDragDrop) {
                this.onProcessTileDragDrop(tileId, meld.id);
              }
            }
          });
        }

        slotElements[col] = slot;
        meldRow.appendChild(slot);
      }

      if (meld.type === 'run') {
        const runTiles = [...meld.tiles];
        let startCol = 1;
        const firstNonOkeyIdx = runTiles.findIndex(t => !t.isOkey);
        if (firstNonOkeyIdx !== -1) {
          const firstNonOkeyTile = runTiles[firstNonOkeyIdx];
          const val = firstNonOkeyTile.effectiveValue !== undefined ? firstNonOkeyTile.effectiveValue : firstNonOkeyTile.number;
          startCol = val - firstNonOkeyIdx;
        }
        startCol = Math.max(1, Math.min(13 - runTiles.length + 1, startCol));

        runTiles.forEach((t, i) => {
          const colIndex = startCol + i;
          if (slotElements[colIndex]) {
            slotElements[colIndex].classList.add('has-tile');
            const tileEl = this.createTileDOM(t, false, true);
            slotElements[colIndex].appendChild(tileEl);
          }
        });

      } else if (meld.type === 'group') {
        const firstNonOkeyTile = meld.tiles.find(t => !t.isOkey) || meld.tiles[0];
        const groupNum = firstNonOkeyTile ? (firstNonOkeyTile.effectiveValue !== undefined ? firstNonOkeyTile.effectiveValue : firstNonOkeyTile.number) : 1;
        const startCol = Math.max(1, Math.min(13 - meld.tiles.length + 1, groupNum));

        meld.tiles.forEach((t, i) => {
          const colIndex = startCol + i;
          if (slotElements[colIndex]) {
            slotElements[colIndex].classList.add('has-tile');
            const tileEl = this.createTileDOM(t, false, true);
            slotElements[colIndex].appendChild(tileEl);
          }
        });
      }

      if (meld.tiles && meld.tiles.some(t => t.isOkey)) {
        meldRow.classList.add('contains-okey-stealable');
      }

      targetContainer.appendChild(meldRow);
    });

    // 2. Render Pair Melds on Dual 2x13 Pairs Panels (Sol ve Sağ Çift Bölmeleri)
    const MAX_PAIRS_PER_PANEL = 13;
    pairMelds.forEach((meld, idx) => {
      const targetContainer = (idx < MAX_PAIRS_PER_PANEL || !pairs2RowsEl) ? pairs1RowsEl : pairs2RowsEl;

      const pairBox = document.createElement('div');
      pairBox.className = 'table-pairs-box';
      pairBox.dataset.meldId = meld.id;

      const hasOkey = meld.tiles && meld.tiles.some(t => t.isOkey);
      if (hasOkey) {
        pairBox.classList.add('contains-okey-stealable');
      }

      const tilesRow = document.createElement('div');
      tilesRow.className = 'pairs-tiles-row';

      meld.tiles.forEach((t) => {
        const tileEl = this.createTileDOM(t, false, true);
        tilesRow.appendChild(tileEl);
      });

      pairBox.appendChild(tilesRow);

      if (isViewerTurn && viewerOpened && hasOkey) {
        pairBox.title = 'Aynı taşa sahipseniz Okeyi almak için taşınızı bu çifte sürükleyin';
        pairBox.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          pairBox.classList.add('meld-drag-hover');
        });

        pairBox.addEventListener('dragleave', (e) => {
          if (!pairBox.contains(e.relatedTarget)) {
            pairBox.classList.remove('meld-drag-hover');
          }
        });

        pairBox.addEventListener('drop', (e) => {
          e.preventDefault();
          pairBox.classList.remove('meld-drag-hover');
          const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (tileId && !tileId.startsWith('ACTION:')) {
            if (this.onProcessTileDragDrop) {
              this.onProcessTileDragDrop(tileId, meld.id);
            }
          }
        });

        pairBox.addEventListener('click', () => {
          if (this.onProcessTile) {
            this.onProcessTile(meld.id);
          }
        });
      }

      targetContainer.appendChild(pairBox);
    });
  }

  createTileDOM(tile, isIndicator = false, isSmall = false) {
    const el = document.createElement('div');
    el.className = 'okey-tile color-' + (tile.effectiveColor || tile.color) + (isSmall ? ' tile-small' : '');
    el.dataset.id = tile.id;

    if (tile.isOkey && !isIndicator) el.classList.add('is-okey-joker');
    if (tile.isFake) el.classList.add('is-fake-okey');

    if (tile.isOkey && !isIndicator) {
      // Okey
    } else if (tile.isFake) {
      const numDisplay = document.createElement('span');
      numDisplay.className = 'tile-number';
      numDisplay.innerHTML = '<div class="fake-okey-emblem" title="Sahte Okey"><svg viewBox="0 0 40 40" class="fake-okey-svg"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5" /><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.8" /><polygon points="20,7 23.8,14.7 32.3,15.9 26.2,21.9 27.6,30.3 20,26.3 12.4,30.3 13.8,21.9 7.7,15.9 16.2,14.7" fill="currentColor" /></svg></div>';
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

    return el;
  }
}

window.TableManager = TableManager;
