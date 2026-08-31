/**
 * Main 101 Okey Client Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const ui = new UIManager();

  let roomId = null;
  let viewerSeatIndex = 0;
  let isHost = false;
  let currentGameState = null;
  let lastTurn = -1;
  let roundStartedHandSorted = false;

  // Initialize Istaka & Table Managers
  const istaka = new IstakaManager(
    'player-istaka-container',
    (stateData) => handleIstakaStateChange(stateData),
    (tileToDiscard) => handleQuickDiscard(tileToDiscard),
    () => handleDrawDeck(),
    () => handleDrawDiscard()
  );

  const table = new TableManager({
    onDrawDeck: () => handleDrawDeck(),
    onDrawDiscard: () => handleDrawDiscard(),
    onDiscard: () => handleDiscardTile(),
    onProcessTile: (targetMeldId) => handleProcessTileToMeld(targetMeldId),
    onProcessTileDragDrop: (tileId, targetMeldId) => handleProcessTileById(tileId, targetMeldId)
  });

  // --- Lobby Setup & Connection ---
  const playerNameInput = document.getElementById('player-name-input');
  const lobbyAvatarImg = document.getElementById('lobby-avatar-img');

  // Load saved player name from localStorage
  const savedPlayerName = localStorage.getItem('okey101_player_name');
  if (savedPlayerName && playerNameInput) {
    playerNameInput.value = savedPlayerName;
    document.title = `101 - ${savedPlayerName}`;
  }

  if (playerNameInput && lobbyAvatarImg) {
    const updateLobbyAvatar = () => {
      const name = playerNameInput.value.trim() || 'Oyuncu';
      if (typeof window.getPlayerAvatarSVG === 'function') {
        lobbyAvatarImg.innerHTML = window.getPlayerAvatarSVG(name);
      }
      if (playerNameInput.value.trim()) {
        localStorage.setItem('okey101_player_name', playerNameInput.value.trim());
        document.title = `101 - ${playerNameInput.value.trim()}`;
      }
    };
    playerNameInput.addEventListener('input', updateLobbyAvatar);
    updateLobbyAvatar();
  }

  // Quick Play (Matchmaking)
  const btnQuickPlay = document.getElementById('btn-quick-play');
  if (btnQuickPlay) {
    btnQuickPlay.addEventListener('click', () => {
      const name = playerNameInput ? (playerNameInput.value.trim() || 'Oyuncu') : 'Oyuncu';
      socket.emit('quickMatch', { playerName: name }, (res) => {
        if (res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Play vs Bots (Single Round 101 Okey Plus)
  const btnPlayBots = document.getElementById('btn-play-bots');
  if (btnPlayBots) {
    btnPlayBots.addEventListener('click', () => {
      const name = playerNameInput ? (playerNameInput.value.trim() || 'Oyuncu') : 'Oyuncu';
      socket.emit('createRoom', {
        playerName: name,
        isPrivate: true,
        mode: 'standard',
        targetRounds: 1,
        vsBots: true
      }, (res) => {
        if (res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Create Room Modal
  const btnOpenCreate = document.getElementById('btn-open-create-room');
  if (btnOpenCreate) {
    btnOpenCreate.addEventListener('click', () => {
      ui.showModal('modal-create-room');
    });
  }

  const btnConfirmCreate = document.getElementById('btn-confirm-create-room');
  if (btnConfirmCreate) {
    btnConfirmCreate.addEventListener('click', () => {
      const name = playerNameInput ? (playerNameInput.value.trim() || 'Oyuncu') : 'Oyuncu';

      socket.emit('createRoom', {
        playerName: name,
        isPrivate: true,
        mode: 'standard',
        targetRounds: 1,
        vsBots: false
      }, (res) => {
        ui.hideModal('modal-create-room');
        if (res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Join Room Modal
  const btnOpenJoin = document.getElementById('btn-open-join-room');
  if (btnOpenJoin) {
    btnOpenJoin.addEventListener('click', () => {
      ui.showModal('modal-join-room');
    });
  }

  const btnConfirmJoin = document.getElementById('btn-confirm-join-room');
  if (btnConfirmJoin) {
    btnConfirmJoin.addEventListener('click', () => {
      const name = playerNameInput ? (playerNameInput.value.trim() || 'Oyuncu') : 'Oyuncu';
      const codeEl = document.getElementById('input-room-code');
      const code = codeEl ? codeEl.value.trim().toUpperCase() : '';

      if (!code) {
        ui.showToast('Lütfen 6 haneli oda kodunu girin.', 'error');
        return;
      }

      socket.emit('joinRoom', { roomId: code, playerName: name }, (res) => {
        ui.hideModal('modal-join-room');
        if (res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Start Game Button (for room host in menu)
  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
      socket.emit('startGame', { roomId }, (res) => {
        if (!res.success) {
          ui.showToast(res.reason, 'error');
        } else {
          const dropdownMenu = document.getElementById('dropdown-table-menu');
          if (dropdownMenu) dropdownMenu.classList.add('hidden');
        }
      });
    });
  }

  // Menu Dropdown Toggle
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const dropdownMenu = document.getElementById('dropdown-table-menu');
  if (btnMenuToggle && dropdownMenu) {
    btnMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => {
      dropdownMenu.classList.add('hidden');
    });
    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Leave Table Button
  const btnLeaveTable = document.getElementById('btn-leave-table');
  if (btnLeaveTable) {
    btnLeaveTable.addEventListener('click', () => {
      if (roomId) {
        socket.emit('leaveRoom', { roomId });
      }
      roomId = null;
      currentGameState = null;
      viewerSeatIndex = 0;
      isHost = false;
      if (dropdownMenu) dropdownMenu.classList.add('hidden');
      ui.showView('lobby');
      ui.showToast('Masadan ayrıldınız.', 'info');
    });
  }

  function setupGameRoom(rId, seatIdx, hostFlag) {
    roomId = rId;
    viewerSeatIndex = seatIdx;
    isHost = hostFlag;
    roundStartedHandSorted = false;

    table.setViewerSeatIndex(viewerSeatIndex);
    ui.showView('game');

    const codeEl = document.getElementById('display-room-code');
    if (codeEl) codeEl.textContent = roomId;
    if (btnStartGame) btnStartGame.classList.toggle('hidden', !isHost);
    ui.showToast(`Odaya katıldınız! Kod: ${roomId}`, 'success');
  }

  // --- Socket.IO Game State Updates ---
  socket.on('gameStateUpdate', (state) => {
    currentGameState = state;
    table.setViewerSeatIndex(viewerSeatIndex);
    istaka.setIndicator(state.indicator);

    // Update table components
    table.update(state);

    // Set drawn discard tile ID on istaka for highlighting and smart auto-sort
    const hasDrawnDiscard = state.drawnFromDiscard && state.drawnFromDiscard.playerIndex === viewerSeatIndex;
    istaka.setDrawnDiscardTileId(hasDrawnDiscard ? state.drawnFromDiscard.tileId : null);

    if (state.state !== 'PLAYING') {
      roundStartedHandSorted = false;
    }

    // Update Istaka hand if viewer hand is provided
    const me = state.players[viewerSeatIndex];
    if (me && me.hand) {
      const isInitialDeal = !roundStartedHandSorted && state.state === 'PLAYING' && me.hand.length >= 21;
      if (isInitialDeal) {
        roundStartedHandSorted = true;
        istaka.setHand(me.hand, false);
        // Oyun ilk başladığında seri diz tuşuna bir kez basılmış gibi otomatik dizilsin
        istaka.autoSortRuns();
      } else {
        istaka.setHand(me.hand, true);
      }
    }

    // Turn change sound alert
    if (state.currentTurn === viewerSeatIndex && lastTurn !== viewerSeatIndex && state.state === 'PLAYING') {
      window.soundEngine.playYourTurn();
      ui.showToast('Sıra Sizde!', 'info', 2000);
    }
    lastTurn = state.currentTurn;

    // Check round over
    if ((state.state === 'ROUND_OVER' || state.state === 'GAME_OVER') && state.roundResults) {
      if (!window.roundResultModalActive) {
        window.roundResultModalActive = true;
        setTimeout(() => {
          ui.showRoundResultModal(state.roundResults, () => {
            window.roundResultModalActive = false;
            if (roomId) {
              socket.emit('leaveRoom', { roomId });
            }
            roomId = null;
            currentGameState = null;
            ui.showView('lobby');
          });
        }, 500);
      }
    } else if (state.state === 'PLAYING') {
      window.roundResultModalActive = false;
    }

    // Update Action Bar States
    updateActionBarUI();
  });

  // --- Action Bar & In-Game Controls ---
  const btnSortRuns = document.getElementById('btn-sort-runs');
  const btnSortPairs = document.getElementById('btn-sort-pairs');
  const btnOpenHand = document.getElementById('btn-open-hand');
  const btnOpenPairs = document.getElementById('btn-open-pairs');
  const btnDiscard = document.getElementById('btn-discard-tile');

  // Copy Room Code Button
  const btnCopyRoom = document.getElementById('btn-copy-room');
  if (btnCopyRoom) {
    btnCopyRoom.addEventListener('click', () => {
      if (roomId) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(roomId).then(() => {
            ui.showToast(`Oda kodu kopyalandı! (${roomId})`, 'success');
          }).catch(() => fallbackCopy(roomId));
        } else {
          fallbackCopy(roomId);
        }
      }
    });
  }

  function fallbackCopy(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    tempInput.remove();
    ui.showToast(`Oda kodu kopyalandı! (${text})`, 'success');
  }

  // Return Discard Tile Button (Taşı Geri Bırak)
  const btnReturnDiscard = document.getElementById('btn-return-discard');
  if (btnReturnDiscard) {
    btnReturnDiscard.addEventListener('click', () => {
      if (!currentGameState) return;
      socket.emit('returnDiscardTile', { roomId }, (res) => {
        if (res.success) {
          ui.showToast('Yandan alınan taş geri bırakıldı. Şimdi desteden taş çekebilirsiniz.', 'info');
          window.soundEngine.playTilePlace();
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  if (btnSortRuns) {
    btnSortRuns.addEventListener('click', () => {
      const isMyTurn = currentGameState && currentGameState.currentTurn === viewerSeatIndex;
      const requiredId = (isMyTurn && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;
      istaka.autoSortRuns(requiredId);
    });
  }

  if (btnSortPairs) {
    btnSortPairs.addEventListener('click', () => {
      const isMyTurn = currentGameState && currentGameState.currentTurn === viewerSeatIndex;
      const requiredId = (isMyTurn && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;
      istaka.autoSortPairs(requiredId);
    });
  }

  // Click on Center Deck / Discard directly
  const centerDeckEl = document.getElementById('center-deck-pile');
  if (centerDeckEl) centerDeckEl.addEventListener('click', () => handleDrawDeck());

  const leftDiscardEl = document.getElementById('discard-pile-left');
  if (leftDiscardEl) leftDiscardEl.addEventListener('click', () => handleDrawDiscard());

  const bottomDiscardEl = document.getElementById('discard-pile-bottom');
  if (bottomDiscardEl) {
    bottomDiscardEl.addEventListener('click', () => handleDiscardTile());

    // Drag and drop a tile to discard slot to discard
    bottomDiscardEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      bottomDiscardEl.classList.add('drag-over');
    });
    bottomDiscardEl.addEventListener('dragleave', () => {
      bottomDiscardEl.classList.remove('drag-over');
    });
    bottomDiscardEl.addEventListener('drop', (e) => {
      e.preventDefault();
      bottomDiscardEl.classList.remove('drag-over');
      const tileId = e.dataTransfer.getData('text/plain');
      if (tileId) {
        handleQuickDiscard({ id: tileId });
      }
    });
  }

  // Smart Open Hand Button
  if (btnOpenHand) {
    btnOpenHand.addEventListener('click', () => {
      if (!currentGameState) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      if (!isFirstOpen && viewerPlayer.openType === 'pairs') {
        ui.showToast('Çift açtığınız için yeni seri açamazsınız. Yalnızca yeni çiftler açabilir veya masadaki perlere taş işleyebilirsiniz.', 'error');
        return;
      }

      const minRequired = isFirstOpen ? (currentGameState.minOpenScore || 101) : 0;
      const requiredId = (isMyTurn && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;

      let meldIdArrays = [];

      // 1. Auto-detect valid melds from rack layout
      const rackAnalysis = istaka.analyzeRackMelds();
      const containsRequired = !requiredId || !isFirstOpen || rackAnalysis.validTileIds.has(requiredId);

      if (rackAnalysis.validMelds.length > 0 && rackAnalysis.totalScore >= minRequired && containsRequired) {
        meldIdArrays = rackAnalysis.validMelds.map(m => m.tiles.map(t => t.id));
      } else {
        // 2. Check best melds from entire hand
        const best = istaka.getBestHandMelds(isFirstOpen ? requiredId : null);
        if (best.melds && best.melds.length > 0 && (best.score >= minRequired || !isFirstOpen)) {
          istaka.autoSortRuns(isFirstOpen ? requiredId : null);
          meldIdArrays = best.melds.map(m => m.map(t => t.id));
        } else {
          if (requiredId && isFirstOpen) {
            ui.showToast(`Yandan aldığınız taş dahil edilerek en az ${minRequired} puanlık geçerli per oluşturulamıyor. Lütfen "Taşı Geri Bırak" butonuna basarak desteden çekiniz.`, 'error', 4000);
          } else if (isFirstOpen) {
            ui.showToast(`İlk kez el açmak için en az ${minRequired} puanlık geçerli per gereklidir. (Şu anki: ${best.score} Puan)`, 'error');
          } else {
            ui.showToast('Elinizde masaya açılabilecek en az 3 taşlık geçerli bir per (seri veya grup) bulunamadı.', 'error');
          }
          return;
        }
      }

      if (meldIdArrays.length === 0) {
        ui.showToast('Açılacak geçerli per bulunamadı.', 'error');
        return;
      }

      socket.emit('openHand', { roomId, melds: meldIdArrays }, (res) => {
        if (res.success) {
          if (isFirstOpen) {
            ui.showToast(`Tebrikler! ${res.score} puan ile el açtınız.`, 'success');
          } else {
            ui.showToast(`Yeni per masaya başarıyla açıldı! (+${res.score} Puan)`, 'success');
          }
          window.soundEngine.playOpenHand();
          istaka.clearSelection();
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Smart Open Pairs Button
  if (btnOpenPairs) {
    btnOpenPairs.addEventListener('click', () => {
      if (!currentGameState) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      // Rule: Seri açan oyuncu masada çift açmış bir oyuncu yoksa çift açamaz
      const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p.opened && p.openType === 'pairs');
      if (!isFirstOpen && viewerPlayer && viewerPlayer.openType === 'seri' && !hasPairsOnTable) {
        ui.showToast('Masada çift açmış bir oyuncu bulunmadığı sürece çift açamazsınız.', 'error');
        return;
      }

      const minPairs = isFirstOpen ? (currentGameState.minOpenPairs || 5) : 1;
      const requiredId = (isMyTurn && isFirstOpen && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;

      let pairIdArrays = [];

      // Find all pairs from hand with required discard tile
      const allPairs = ClientValidator.findAllPairs(istaka.getAllTiles(), currentGameState.indicator, isFirstOpen ? requiredId : null);
      const containsRequired = !requiredId || !isFirstOpen || allPairs.some(p => p[0].id === requiredId || p[1].id === requiredId);

      if (allPairs.length >= minPairs && containsRequired) {
        istaka.autoSortPairs(isFirstOpen ? requiredId : null);
        pairIdArrays = allPairs.map(p => [p[0].id, p[1].id]);
      }

      if (pairIdArrays.length < minPairs) {
        if (requiredId && isFirstOpen) {
          ui.showToast(`Yandan aldığınız taş ile ${minPairs} çift oluşturulamıyor. Lütfen "Taşı Geri Bırak" butonuna basınız.`, 'error', 3500);
        } else if (isFirstOpen) {
          ui.showToast(`İlk kez çift açmak için en az ${minPairs} çift (10 taş) açmalısınız.`, 'error');
        } else {
          ui.showToast('Masaya açılacak geçerli çift bulunamadı.', 'error');
        }
        return;
      }

      socket.emit('openPairs', { roomId, pairs: pairIdArrays }, (res) => {
        if (res.success) {
          if (isFirstOpen) {
            ui.showToast(`Tebrikler! ${res.count} çift açtınız.`, 'success');
          } else {
            ui.showToast(`Yeni çift masaya açıldı!`, 'success');
          }
          window.soundEngine.playOpenHand();
          istaka.clearSelection();
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  function handleDrawDeck() {
    if (!currentGameState) return;
    socket.emit('drawTile', { roomId, source: 'deck' }, (res) => {
      if (res.success) {
        window.soundEngine.playDraw();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleDrawDiscard() {
    if (!currentGameState) return;
    socket.emit('drawTile', { roomId, source: 'discard' }, (res) => {
      if (res.success) {
        window.soundEngine.playDraw();
        ui.showToast('Yandan taş aldınız! Bu taşı kullanarak el açmalı, işlemeli veya "Taşı Geri Bırak" ile iade etmelisiniz.', 'warning', 4000);
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleDiscardTile() {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    const hasDrawnDiscard = isMyTurn && currentGameState.turnState === 'DISCARD' && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;

    if (hasDrawnDiscard) {
      ui.showToast('Yandan aldığınız taşı el açarak veya masaya işleyerek kullanmak zorundasınız! Kullanmayacaksanız "Taşı Geri Bırak" butonuna basarak desteden çekiniz.', 'error', 4000);
      return;
    }

    const activeTile = istaka.activeTile;
    if (!activeTile) {
      ui.showToast('Atmak istediğiniz taşa tıklayın veya sürükleyip taş atma alanına bırakın.', 'error');
      return;
    }

    socket.emit('discardTile', { roomId, tileId: activeTile.id }, (res) => {
      if (res.success) {
        window.soundEngine.playTilePlace();
        istaka.clearSelection();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleQuickDiscard(tile) {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn || currentGameState.turnState !== 'DISCARD') {
      ui.showToast('Sıra sizde değilken veya taş çekmeden taş atamazsınız.', 'error');
      return;
    }

    const hasDrawnDiscard = currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    if (hasDrawnDiscard) {
      ui.showToast('Yandan aldığınız taşı el açarak veya masaya işleyerek kullanmak zorundasınız! Kullanmayacaksanız "Taşı Geri Bırak" butonuna basarak desteden çekiniz.', 'error', 4000);
      return;
    }

    socket.emit('discardTile', { roomId, tileId: tile.id }, (res) => {
      if (res.success) {
        window.soundEngine.playTilePlace();
        istaka.clearSelection();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleProcessTileById(tileId, targetMeldId) {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn || currentGameState.turnState !== 'DISCARD') {
      ui.showToast('Sıra sizde değilken veya taş çekmeden taş işleyemezsiniz.', 'error');
      return;
    }
    const viewerPlayer = currentGameState.players[viewerSeatIndex];
    if (!viewerPlayer || !viewerPlayer.opened) {
      ui.showToast('Taş işlemek için önce elinizi açmış olmalısınız.', 'error');
      return;
    }

    socket.emit('processTile', { roomId, tileId, targetMeldId }, (res) => {
      if (res.success) {
        if (res.okeyStolen) {
          ui.showToast('✨ Tebrikler! Perdeki Okey yerine taş işlediniz ve OKEY elinize geçti!', 'success', 4000);
          window.soundEngine.playVictory();
        } else {
          ui.showToast('Taş başarıyla pere işlendi!', 'success');
          window.soundEngine.playTilePlace();
        }
        istaka.clearSelection();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleProcessTileToMeld(targetMeldId) {
    if (!currentGameState) return;
    const activeTile = istaka.activeTile;
    if (!activeTile) {
      ui.showToast('İşlemek istediğiniz taşa ıstakanızdan tıklayıp masaya tıklayın veya taşı doğrudan pere sürükleyin.', 'error');
      return;
    }
    handleProcessTileById(activeTile.id, targetMeldId);
  }

  function updateActionBarUI() {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    const turnState = currentGameState.turnState;
    const viewerPlayer = currentGameState.players[viewerSeatIndex];

    const cannotOpenSeri = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'pairs';
    const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p.opened && p.openType === 'pairs');
    const cannotOpenPairs = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'seri' && !hasPairsOnTable;

    if (btnOpenHand) {
      btnOpenHand.disabled = !(isMyTurn && turnState === 'DISCARD') || cannotOpenSeri;
      btnOpenHand.title = cannotOpenSeri ? 'Çift açtığınız için seri açamazsınız' : '';
    }
    if (btnOpenPairs) {
      btnOpenPairs.disabled = !(isMyTurn && turnState === 'DISCARD') || cannotOpenPairs;
      btnOpenPairs.title = cannotOpenPairs ? 'Masada çift açmış bir oyuncu olmadığı için çift açamazsınız' : '';
    }

    // Show "Taşı Geri Bırak" only if viewer has drawn from discard and hasn't opened/discarded yet
    const hasDrawnFromDiscard = isMyTurn && turnState === 'DISCARD' && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    const btnReturnDiscard = document.getElementById('btn-return-discard');
    if (btnReturnDiscard) {
      btnReturnDiscard.classList.toggle('hidden', !hasDrawnFromDiscard);
    }
  }

  function handleIstakaStateChange(data) {
    const pointsBadge = document.getElementById('selected-points-badge');
    if (!pointsBadge || !currentGameState) return;

    const viewerPlayer = currentGameState.players[viewerSeatIndex];
    const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;
    const minScore = isFirstOpen ? (currentGameState.minOpenScore || 101) : 0;
    const { rackAnalysis } = data;
    const allTiles = istaka.getAllTiles();
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    const hasDrawnDiscard = isMyTurn && currentGameState.turnState === 'DISCARD' && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    const requiredId = (hasDrawnDiscard && isFirstOpen) ? currentGameState.drawnFromDiscard.tileId : null;

    // 1. Calculate Per Score from rack layout (Per puanı her zaman birinci önceliktir)
    const score = (rackAnalysis && rackAnalysis.validMelds && rackAnalysis.validMelds.length > 0) ? rackAnalysis.totalScore : 0;

    if (score > 0) {
      const includesRequired = !requiredId || rackAnalysis.validTileIds.has(requiredId);
      const isSufficient = score >= minScore && includesRequired;

      if (isFirstOpen) {
        pointsBadge.className = isSufficient ? 'points-badge points-valid' : 'points-badge points-pending';
        pointsBadge.innerHTML = `Per: <strong>${score}</strong> / ${minScore}`;
      } else {
        pointsBadge.className = 'points-badge points-valid';
        pointsBadge.innerHTML = `Per: <strong>${score}</strong> Puan`;
      }
      return;
    }

    // 2. If NO valid per on rack (score === 0), check if player can open 5+ Pairs
    const allPairs = ClientValidator.findAllPairs(allTiles, currentGameState.indicator, requiredId);
    const containsRequiredPair = !requiredId || allPairs.some(p => p[0].id === requiredId || p[1].id === requiredId);

    if (allPairs.length >= 5 && containsRequiredPair && isFirstOpen) {
      const pairedIds = new Set();
      for (let i = 0; i < 5; i++) {
        pairedIds.add(allPairs[i][0].id);
        pairedIds.add(allPairs[i][1].id);
      }
      const leftoverTiles = allTiles.filter(t => !pairedIds.has(t.id));
      const penaltyScore = leftoverTiles.reduce((sum, t) => {
        const p = ClientValidator.getTileProps(t, currentGameState.indicator);
        return sum + (p.isOkey ? 25 : (p.number || 0));
      }, 0);

      pointsBadge.className = 'points-badge points-penalty-active';
      pointsBadge.innerHTML = `💎 5 Çift (Kalan Ceza: <strong>${penaltyScore}</strong> Puan)`;
      return;
    }

    // 3. Default: Per is 0
    if (isFirstOpen) {
      pointsBadge.className = 'points-badge points-empty';
      pointsBadge.innerHTML = `Per: <strong>0</strong> / ${minScore}`;
    } else {
      pointsBadge.className = 'points-badge points-empty';
      pointsBadge.innerHTML = `Per: <strong>0</strong> Puan`;
    }
  }

  // --- Chat & Emoji Reactions ---
  const chatInput = document.getElementById('chat-input-text');
  const btnSendChat = document.getElementById('btn-send-chat');

  function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !roomId) return;
    const myName = currentGameState && currentGameState.players[viewerSeatIndex] ? currentGameState.players[viewerSeatIndex].name : 'Ben';
    socket.emit('sendChat', { roomId, sender: myName, text });
    chatInput.value = '';
  }

  if (btnSendChat) btnSendChat.addEventListener('click', sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  socket.on('chatMessage', (msg) => {
    ui.appendChatMessage(msg.sender, msg.text, msg.time);
  });

  // Quick Emoji reactions
  document.querySelectorAll('.btn-plus-emoji, .btn-quick-reaction').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!roomId) return;
      const emoji = btn.dataset.emoji;
      const label = btn.dataset.label;
      socket.emit('sendReaction', { roomId, seatIndex: viewerSeatIndex, emoji, label });
    });
  });

  socket.on('playerReaction', (data) => {
    const pos = table.getRelativePosition(data.seatIndex);
    ui.triggerReaction(pos, data.reaction, data.label);
  });

  // Sound toggle button
  const btnMute = document.getElementById('btn-toggle-sound');
  if (btnMute) {
    btnMute.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      btnMute.textContent = isMuted ? '🔇 Ses: Kapalı' : '🔊 Ses: Açık';
    });
  }
});
