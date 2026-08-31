const FEMALE_NAMES = new Set([
  'zeynep', 'ayse', 'fatma', 'elif', 'merve', 'ece', 'selin', 'gizem', 'busra',
  'derya', 'seda', 'ceren', 'irem', 'ebru', 'gamze', 'melis', 'pinar',
  'tugba', 'hande', 'asli', 'burcu', 'damla', 'sinem', 'yasemin',
  'berna', 'kubra', 'hilal', 'melike', 'filiz', 'hulya', 'sevgi', 'songul',
  'ayşe', 'büşra', 'pınar', 'tuğba', 'aslı', 'kübra', 'hülya'
]);

const maleConfigs = [
  { bg: ['#1e3c72', '#2a5298'], hair: '#1a1a1a', skin: '#f8d5b8', beard: 'none', glasses: false, hairStyle: 'short' },
  { bg: ['#0f2027', '#203a43'], hair: '#3d2314', skin: '#eec7a2', beard: 'full', glasses: true, hairStyle: 'buzz' },
  { bg: ['#3a1c71', '#d76d77'], hair: '#2d3436', skin: '#f5cd79', beard: 'goatee', glasses: false, hairStyle: 'undercut' },
  { bg: ['#134e5e', '#71b280'], hair: '#4b382a', skin: '#f8d5b8', beard: 'none', glasses: false, hairStyle: 'wavy' },
  { bg: ['#4b1248', '#f0c27b'], hair: '#1e272e', skin: '#eec7a2', beard: 'full', glasses: false, hairStyle: 'short' },
  { bg: ['#114357', '#f29492'], hair: '#2f3542', skin: '#f5cd79', beard: 'goatee', glasses: true, hairStyle: 'undercut' },
  { bg: ['#000428', '#004e92'], hair: '#2c3e50', skin: '#f8d5b8', beard: 'none', glasses: true, hairStyle: 'wavy' },
  { bg: ['#2c3e50', '#3498db'], hair: '#1a1a1a', skin: '#eec7a2', beard: 'full', glasses: false, hairStyle: 'undercut' }
];

const femaleConfigs = [
  { bg: ['#ff758c', '#ff7eb3'], hair: '#2c3e50', skin: '#f8d5b8', hairStyle: 'long', glasses: false },
  { bg: ['#ee9ca7', '#ffdde1'], hair: '#d35400', skin: '#f5cd79', hairStyle: 'bob', glasses: false },
  { bg: ['#c33764', '#1d2671'], hair: '#1a1a1a', skin: '#eec7a2', hairStyle: 'ponytail', glasses: true },
  { bg: ['#654ea3', '#eaafc8'], hair: '#8e44ad', skin: '#f8d5b8', hairStyle: 'wavy', glasses: false },
  { bg: ['#f857a6', '#ff5858'], hair: '#2d3436', skin: '#f5cd79', hairStyle: 'long', glasses: true },
  { bg: ['#4facfe', '#00f2fe'], hair: '#3d2314', skin: '#eec7a2', hairStyle: 'bob', glasses: false },
  { bg: ['#43e97b', '#38f9d7'], hair: '#1e272e', skin: '#f8d5b8', hairStyle: 'ponytail', glasses: false },
  { bg: ['#fa709a', '#fee140'], hair: '#4b382a', skin: '#f5cd79', hairStyle: 'wavy', glasses: false }
];

const maleAvatars = maleConfigs.map((c, i) => {
  let hair = '';
  if (c.hairStyle === 'short') {
    hair = `<path d="M28,38 C26,20 38,14 50,14 C62,14 74,20 72,38 C68,26 60,22 50,22 C40,22 32,26 28,38 Z" fill="${c.hair}"/>`;
  } else if (c.hairStyle === 'wavy') {
    hair = `<path d="M24,40 C22,18 36,12 50,12 C64,12 78,18 76,40 C72,26 64,20 50,20 C36,20 28,26 24,40 Z" fill="${c.hair}"/><path d="M22,32 Q32,22 45,26 Q35,14 50,14 Q65,14 55,26 Q68,22 78,32 Q68,18 50,16 Q32,18 22,32 Z" fill="${c.hair}"/>`;
  } else if (c.hairStyle === 'undercut') {
    hair = `<path d="M28,36 C27,18 38,13 50,13 C62,13 73,18 72,36 C70,24 62,19 50,19 C38,19 30,24 28,36 Z" fill="${c.hair}"/><path d="M34,22 Q50,8 66,22 Q50,14 34,22 Z" fill="${c.hair}"/>`;
  } else {
    hair = `<path d="M27,38 C26,22 36,15 50,15 C64,15 74,22 73,38 C70,26 62,21 50,21 C38,21 30,26 27,38 Z" fill="${c.hair}" opacity="0.9"/>`;
  }

  let beard = '';
  if (c.beard === 'full') {
    beard = `<path d="M34,54 C34,74 42,82 50,82 C58,82 66,74 66,54 C62,64 56,68 50,68 C44,68 38,64 34,54 Z" fill="${c.hair}"/><path d="M42,59 Q50,64 58,59 Q50,61 42,59 Z" fill="${c.hair}"/>`;
  } else if (c.beard === 'goatee') {
    beard = `<path d="M43,60 Q50,64 57,60 Q50,62 43,60 Z" fill="${c.hair}"/><path d="M45,69 Q50,78 55,69 Q50,74 45,69 Z" fill="${c.hair}"/>`;
  }

  let glasses = '';
  if (c.glasses) {
    glasses = `<rect x="31" y="43" width="15" height="10" rx="3" fill="none" stroke="#f1c40f" stroke-width="2"/><rect x="54" y="43" width="15" height="10" rx="3" fill="none" stroke="#f1c40f" stroke-width="2"/><line x1="46" y1="48" x2="54" y2="48" stroke="#f1c40f" stroke-width="2"/>`;
  }

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="m_bg_${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c.bg[0]}"/><stop offset="100%" stop-color="${c.bg[1]}"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(#m_bg_${i})" stroke="rgba(255,255,255,0.2)" stroke-width="2"/><path d="M20,96 C20,74 34,68 50,68 C66,68 80,74 80,96 Z" fill="#1e272e"/><path d="M38,68 L50,82 L62,68 Z" fill="#fff" opacity="0.9"/><rect x="44" y="58" width="12" height="14" rx="3" fill="${c.skin}"/><ellipse cx="50" cy="48" rx="18" ry="22" fill="${c.skin}"/>${hair}<circle cx="42" cy="48" r="2.5" fill="#2c3e50"/><circle cx="58" cy="48" r="2.5" fill="#2c3e50"/><circle cx="43" cy="47" r="0.8" fill="#fff"/><circle cx="59" cy="47" r="0.8" fill="#fff"/><path d="M37,43 Q42,40 47,43" fill="none" stroke="${c.hair}" stroke-width="2" stroke-linecap="round"/><path d="M53,43 Q58,40 63,43" fill="none" stroke="${c.hair}" stroke-width="2" stroke-linecap="round"/><path d="M50,47 L48,54 L52,54" fill="none" stroke="#d35400" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><path d="M44,59 Q50,65 56,59" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>${beard}${glasses}</svg>`;
});

const femaleAvatars = femaleConfigs.map((c, i) => {
  let hair = '';
  if (c.hairStyle === 'long') {
    hair = `<path d="M22,38 C20,16 36,12 50,12 C64,12 80,16 78,38 C82,54 82,78 74,84 C70,76 74,56 72,40 C68,26 60,20 50,20 C40,20 32,26 28,40 C26,56 30,76 26,84 C18,78 18,54 22,38 Z" fill="${c.hair}"/>`;
  } else if (c.hairStyle === 'bob') {
    hair = `<path d="M24,38 C22,18 36,12 50,12 C64,12 78,18 76,38 C80,56 76,64 70,62 C68,48 64,22 50,22 C36,22 32,48 30,62 C24,64 20,56 24,38 Z" fill="${c.hair}"/>`;
  } else if (c.hairStyle === 'ponytail') {
    hair = `<path d="M26,38 C24,18 36,12 50,12 C64,12 76,18 74,38 C70,24 62,20 50,20 C38,20 30,24 26,38 Z" fill="${c.hair}"/><path d="M72,26 C82,24 88,36 84,54 C82,44 80,32 72,26 Z" fill="${c.hair}"/>`;
  } else {
    hair = `<path d="M22,38 C20,16 36,12 50,12 C64,12 80,16 78,38 C82,50 80,68 74,74 C72,60 72,42 70,36 C66,24 58,20 50,20 C42,20 34,24 30,36 C28,42 28,60 26,74 C20,68 18,50 22,38 Z" fill="${c.hair}"/>`;
  }

  let glasses = '';
  if (c.glasses) {
    glasses = `<rect x="31" y="43" width="15" height="10" rx="3" fill="none" stroke="#e84393" stroke-width="2"/><rect x="54" y="43" width="15" height="10" rx="3" fill="none" stroke="#e84393" stroke-width="2"/><line x1="46" y1="48" x2="54" y2="48" stroke="#e84393" stroke-width="2"/>`;
  }

  return `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="f_bg_${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c.bg[0]}"/><stop offset="100%" stop-color="${c.bg[1]}"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(#f_bg_${i})" stroke="rgba(255,255,255,0.2)" stroke-width="2"/><path d="M20,96 C20,74 34,68 50,68 C66,68 80,74 80,96 Z" fill="#6c5ce7"/><path d="M38,68 L50,80 L62,68 Z" fill="#fd79a8" opacity="0.8"/><rect x="44" y="58" width="12" height="14" rx="3" fill="${c.skin}"/><ellipse cx="50" cy="48" rx="18" ry="22" fill="${c.skin}"/>${hair}<circle cx="42" cy="48" r="2.5" fill="#2c3e50"/><circle cx="58" cy="48" r="2.5" fill="#2c3e50"/><circle cx="43" cy="47" r="0.8" fill="#fff"/><circle cx="59" cy="47" r="0.8" fill="#fff"/><path d="M37,43 Q42,40 47,43" fill="none" stroke="${c.hair}" stroke-width="1.8" stroke-linecap="round"/><path d="M53,43 Q58,40 63,43" fill="none" stroke="${c.hair}" stroke-width="1.8" stroke-linecap="round"/><path d="M50,47 L48,54 L52,54" fill="none" stroke="#d35400" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><path d="M44,60 Q50,66 56,60" fill="none" stroke="#e84393" stroke-width="2.2" stroke-linecap="round"/>${glasses}</svg>`;
});

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
