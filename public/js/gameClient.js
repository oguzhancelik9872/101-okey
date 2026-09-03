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
  let lastHandSignature = '';
  let lastGameState = null;

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

  window.tableManager = table;
  window.istakaManager = istaka;

  // --- Dynamic Title, LocalStorage & Global UI State ---
  let currentActivePlayerName = 'Oyuncu';
  let titleBlinkInterval = null;
  let currentUser = null;
  let turnTimerLoop = null;
  let lastTickedSecond = null;
  let isUndoingTurn = false;
  let pendingTimeoutAnimationSeat = null;

  socket.on('timeoutActionSequence', (sequence) => {
    if (!sequence || !Array.isArray(sequence.actions)) return;
    pendingTimeoutAnimationSeat = sequence.playerIndex;

    // Let the immediately following authoritative state render, then animate
    // the timeout's physical actions through the engine's sequential queue.
    setTimeout(() => {
      const anim = window.tileAnimations;
      if (!anim) return;
      const seatPos = table.getRelativePosition(sequence.playerIndex);
      const isViewer = sequence.playerIndex === viewerSeatIndex;

      sequence.actions.forEach(action => {
        if (!action) return;
        if (action.type === 'returnDiscard') {
          const toPos = table.getRelativePosition(action.toSeat);
          anim.animateReturnDiscardFromSeat(seatPos, toPos, action.tile, isViewer);
        } else if (action.type === 'drawDeck') {
          anim.animateDrawFromDeck(seatPos, isViewer);
        } else if (action.type === 'discard') {
          anim.animateDiscard(seatPos, action.tile, isViewer);
        }
      });
    }, 0);
  });

  function updateDocumentTitle(isMyTurn = false) {
    if (titleBlinkInterval) {
      clearInterval(titleBlinkInterval);
      titleBlinkInterval = null;
    }

    if (isMyTurn) {
      let blink = false;
      document.title = `🎯 SIRA SİZDE! - ${currentActivePlayerName}`;
      titleBlinkInterval = setInterval(() => {
        blink = !blink;
        document.title = blink ? `🔔 SIRA SİZDE! (${currentActivePlayerName})` : `🎯 SIRA SİZDE! - ${currentActivePlayerName}`;
      }, 1000);
    } else {
      document.title = `101 - ${currentActivePlayerName}`;
    }
  }

  // --- Auth Views & Profile Picker ---
  const authView = document.getElementById('auth-view');
  const lobbyView = document.getElementById('lobby-view');
  const gameView = document.getElementById('game-view');

  function stopTurnTimerLoop() {
    if (turnTimerLoop) {
      clearInterval(turnTimerLoop);
      turnTimerLoop = null;
    }
    lastTickedSecond = null;
  }

  function clearChatMessages() {
    const chatLogs = document.getElementById('chat-messages');
    if (chatLogs) {
      chatLogs.innerHTML = '<div class="chat-welcome-msg">💬 Masa sohbetine hoş geldiniz!</div>';
    }
    const tableBadge = document.getElementById('table-chat-badge');
    const lobbyBadge = document.getElementById('lobby-chat-badge');
    if (tableBadge) tableBadge.classList.add('hidden');
    if (lobbyBadge) lobbyBadge.classList.add('hidden');
  }

  function closeAllDrawers() {
    const cDrawer = document.getElementById('chat-drawer');
    const sDrawer = document.getElementById('settings-drawer');
    const dBackdrop = document.getElementById('drawer-backdrop');
    if (cDrawer) cDrawer.classList.remove('open');
    if (sDrawer) sDrawer.classList.remove('open');
    if (dBackdrop) dBackdrop.classList.add('hidden');
  }

  function updateLobbyProfileUI() {
    if (!currentUser) return;
    const nameEl = document.getElementById('lobby-display-name');
    const tagEl = document.getElementById('lobby-username-tag');
    const avatarEl = document.getElementById('lobby-avatar-img');

    if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.username;
    if (tagEl) tagEl.textContent = '@' + currentUser.username;
    if (avatarEl && typeof window.getPlayerAvatarSVG === 'function') {
      avatarEl.innerHTML = window.getPlayerAvatarSVG(currentUser.displayName || currentUser.username, currentUser.gender, currentUser.avatarIndex);
    }
  }

  const DEFAULT_PROFILES = [
    { name: 'Akın', gender: 'male', avatarIndex: 0 },
    { name: 'Alperen', gender: 'male', avatarIndex: 1 },
    { name: 'Efe', gender: 'male', avatarIndex: 2 },
    { name: 'Furkan', gender: 'male', avatarIndex: 3 },
    { name: 'Memiş', gender: 'male', avatarIndex: 4 },
    { name: 'Oğuzhan', gender: 'male', avatarIndex: 5 },
    { name: 'Özkan', gender: 'male', avatarIndex: 6 },
    { name: 'Yekta', gender: 'male', avatarIndex: 7 }
  ];

  let selectedCharName = null;
  let availableProfilesMap = new Map();

  socket.on('auth:namesUpdate', (names) => {
    if (Array.isArray(names)) {
      availableProfilesMap.clear();
      names.forEach(n => availableProfilesMap.set(n.name.toLowerCase(), n));
      updateNamePickerUI();
    }
  });

  function updateNamePickerUI() {
    const grid = document.getElementById('name-picker-grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.name-card');
    cards.forEach(card => {
      const name = card.dataset.name || card.querySelector('.name-card-title')?.textContent?.trim();
      const isSelected = Boolean(selectedCharName && selectedCharName.toLowerCase() === (name || '').toLowerCase());

      card.classList.remove('occupied');
      card.classList.add('available');
      card.classList.toggle('selected', isSelected);

      const statusEl = card.querySelector('.name-card-status');
      if (statusEl) {
        if (isSelected) {
          statusEl.className = 'name-card-status status-selected';
          statusEl.textContent = '✨ Seçildi';
        } else {
          statusEl.className = 'name-card-status status-available';
          statusEl.textContent = '🟢 Seç';
        }
      }
    });
    updateEnterGameButton();
  }

  function updateEnterGameButton() {
    const btnEnter = document.getElementById('btn-enter-game');
    if (!btnEnter) return;

    if (selectedCharName) {
      btnEnter.classList.remove('disabled');
      btnEnter.removeAttribute('disabled');
      btnEnter.disabled = false;
      btnEnter.style.opacity = '1';
      btnEnter.style.cursor = 'pointer';
      btnEnter.style.pointerEvents = 'auto';
    } else {
      btnEnter.classList.add('disabled');
      btnEnter.setAttribute('disabled', 'true');
      btnEnter.disabled = true;
      btnEnter.style.opacity = '0.45';
      btnEnter.style.cursor = 'not-allowed';
    }
  }

  function doSelectNameAndEnterLobby(nameToSelect) {
    if (!nameToSelect) {
      ui.showToast('Lütfen oynamak için bir karakter seçin!', 'warning');
      return;
    }

    const clean = nameToSelect.trim();
    const fallbackUser = {
      id: `usr_${clean.toLowerCase()}`,
      username: clean.toLowerCase(),
      displayName: clean,
      gender: 'male',
      avatarIndex: 0
    };

    // Immediately show lobby so user never feels frozen or stuck
    handleLoginSuccess(fallbackUser, null, false);
    ui.showToast(`Hoş geldin, ${clean}!`, 'success');

    // Notify server to bind socket session
    socket.emit('auth:selectName', { name: clean }, (res) => {
      if (res && res.success && res.user) {
        currentUser = res.user;
        currentActivePlayerName = clean;
        if (res.token) {
          localStorage.setItem('okey101_auth_token', res.token);
        }
        localStorage.setItem('okey101_user', JSON.stringify(res.user));
        updateLobbyProfileUI();
      }
    });
  }

  function initNamePickerEvents() {
    const grid = document.getElementById('name-picker-grid');
    if (grid) {
      const cards = grid.querySelectorAll('.name-card');
      cards.forEach(card => {
        const charName = card.dataset.name || card.querySelector('.name-card-title')?.textContent?.trim();
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (charName) {
            selectedCharName = charName;
            updateNamePickerUI();
          }
        };
        card.ondblclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (charName) {
            selectedCharName = charName;
            updateNamePickerUI();
            doSelectNameAndEnterLobby(charName);
          }
        };
      });
    }

    const btnEnterGame = document.getElementById('btn-enter-game');
    if (btnEnterGame) {
      btnEnterGame.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedCharName) {
          doSelectNameAndEnterLobby(selectedCharName);
        } else {
          ui.showToast('Lütfen oynamak için bir karakter seçin!', 'warning');
        }
      };
    }
  }

  // Initial event binding
  initNamePickerEvents();

  function showLobby() {
    stopTurnTimerLoop();
    closeAllDrawers();
    clearChatMessages();
    const tc = document.querySelector('.plus-table-canvas');
    if (tc) tc.classList.remove('my-turn-focus');
    if (authView) {
      authView.classList.add('hidden');
      authView.style.setProperty('display', 'none', 'important');
    }
    if (gameView) {
      gameView.classList.add('hidden');
      gameView.style.setProperty('display', 'none', 'important');
    }
    if (lobbyView) {
      lobbyView.classList.remove('hidden');
      lobbyView.style.removeProperty('display');
      lobbyView.style.setProperty('display', 'flex', 'important');
    }
    socket.emit('lobby:join');
  }

  function showAuth() {
    stopTurnTimerLoop();
    currentUser = null;
    const tc = document.querySelector('.plus-table-canvas');
    if (tc) tc.classList.remove('my-turn-focus');
    if (lobbyView) {
      lobbyView.classList.add('hidden');
      lobbyView.style.setProperty('display', 'none', 'important');
    }
    if (gameView) {
      gameView.classList.add('hidden');
      gameView.style.setProperty('display', 'none', 'important');
    }
    if (authView) {
      authView.classList.remove('hidden');
      authView.style.removeProperty('display');
      authView.style.setProperty('display', 'flex', 'important');
    }
    selectedCharName = null;
    updateNamePickerUI();
    initNamePickerEvents();
  }

  function handleLoginSuccess(user, token, isReconnectCheck = false) {
    currentUser = user;
    if (token) {
      localStorage.setItem('okey101_auth_token', token);
    }
    localStorage.setItem('okey101_user', JSON.stringify(user));
    currentActivePlayerName = user.displayName || user.username;
    updateDocumentTitle(false);

    // Update Lobby Profile Card
    updateLobbyProfileUI();

    // Immediately reveal lobby so the screen is NEVER blank
    showLobby();

    // Check if user was in an active game session (Only for F5 reconnect checks)
    const savedActiveRoom = isReconnectCheck ? (localStorage.getItem('okey101_active_room') || user.currentRoomId) : null;
    if (savedActiveRoom) {
      socket.emit('reconnectRoom', { roomId: savedActiveRoom, userId: user.id }, (res) => {
        if (res && res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
          if (res.gameState) {
            table.update(res.gameState);
            const me = res.gameState.players[res.seatIndex];
            if (me && me.hand) {
              istaka.setHand(me.hand, true);
            }
          }
          ui.showToast('🎯 Masanıza geri bağlandınız!', 'success');
        } else {
          localStorage.removeItem('okey101_active_room');
        }
      });
    }
  }

  // --- Synchronous Instant View Initialization (Zero Flash) ---
  const savedUserRaw = localStorage.getItem('okey101_user');
  const savedToken = localStorage.getItem('okey101_auth_token');

  if (savedUserRaw) {
    try {
      const user = JSON.parse(savedUserRaw);
      handleLoginSuccess(user, savedToken, true);

      // Restore session in background on socket connect/reconnect
      socket.emit('auth:autoLogin', { token: savedToken, userId: user.id, username: user.username }, (res) => {
        if (res && res.success && res.user) {
          currentUser = res.user;
          updateLobbyProfileUI();
        }
      });
    } catch (e) {
      showAuth();
    }
  } else {
    showAuth();
  }



  // Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      const uId = getUserId();
      socket.emit('auth:logout', { userId: uId });
      if (roomId) {
        socket.emit('leaveRoom', { roomId, userId: uId });
      }
      socket.emit('lobby:leaveSeat', { userId: uId });

      localStorage.removeItem('okey101_auth_token');
      localStorage.removeItem('okey101_user');
      localStorage.removeItem('okey101_active_room');
      currentUser = null;
      roomId = null;
      currentGameState = null;
      mySeatedIndex = null;
      viewerSeatIndex = 0;
      isHost = false;
      showAuth();
      ui.showToast('Oturum kapatıldı.', 'info');
    });
  }

  function getPlayerName() {
    return currentUser ? (currentUser.displayName || currentUser.username) : 'Oyuncu';
  }

  function getUserId() {
    return currentUser ? currentUser.id : null;
  }

  // --- Interactive Virtual Lobby Table & Seat Selection ---
  let currentLobbyTableId = 'MASA-101';
  let mySeatedIndex = null;

  function updateLobbyVirtualTable(lobbyState) {
    if (!lobbyState || !lobbyState.publicTable) return;
    const tableData = lobbyState.publicTable;
    currentLobbyTableId = tableData.id || 'MASA-101';

    // Find if current user is seated
    const currentUserId = getUserId();
    mySeatedIndex = null;
    if (tableData.seats) {
      tableData.seats.forEach((s, idx) => {
        if (s && ((currentUserId && s.userId === currentUserId) || s.id === socket.id)) {
          mySeatedIndex = idx;
        }
      });
    }

    const statusEl = document.getElementById('lobby-table-status');
    const btnFillBots = document.getElementById('btn-lobby-fill-bots');

    if (statusEl) {
      if (tableData.state === 'PLAYING') {
        statusEl.textContent = '🎮 OYUN SÜRÜYOR (DOLU)';
        statusEl.style.borderColor = '#e67e22';
        statusEl.style.color = '#f39c12';
      } else {
        statusEl.textContent = `⏳ ${tableData.playerCount || 0}/4 OYUNCU`;
        statusEl.style.borderColor = '#2ecc71';
        statusEl.style.color = '#2ecc71';
      }
    }

    // Countdown banner handling
    const countdownBanner = document.getElementById('lobby-countdown-banner');
    const countdownNum = document.getElementById('lobby-countdown-num');
    const instructionEl = document.getElementById('lobby-table-instruction');
    const isCountingDown = tableData.countdown !== null && tableData.countdown !== undefined && tableData.countdown > 0;

    if (isCountingDown) {
      if (countdownBanner) countdownBanner.classList.remove('hidden');
      if (countdownNum) countdownNum.textContent = tableData.countdown;
      if (instructionEl) instructionEl.classList.add('hidden');
      if (btnFillBots) btnFillBots.classList.add('hidden');
      try {
        if (window.soundEngine && typeof window.soundEngine.playTileTouch === 'function') {
          window.soundEngine.playTileTouch();
        }
      } catch (e) {}
    } else {
      if (countdownBanner) countdownBanner.classList.add('hidden');
      if (instructionEl) instructionEl.classList.remove('hidden');
      if (btnFillBots) {
        if (mySeatedIndex !== null && tableData.state === 'WAITING' && (tableData.playerCount || 0) < 4) {
          btnFillBots.classList.remove('hidden');
        } else {
          btnFillBots.classList.add('hidden');
        }
      }
    }

    const seatLabels = ['1. KOLTUĞA OTUR', 'SAĞA OTUR', 'KARŞIYA OTUR', 'SOLA OTUR'];

    [0, 1, 2, 3].forEach(seatIdx => {
      const podEl = document.getElementById(`lobby-seat-${seatIdx}`);
      if (!podEl) return;
      const seatInfo = tableData.seats ? tableData.seats[seatIdx] : null;

      if (seatInfo) {
        // Seat is occupied
        const isMe = (mySeatedIndex === seatIdx) || (currentUser && seatInfo.userId === currentUser.id) || (seatInfo.id === socket.id);
        const avatarSvg = (typeof window.getPlayerAvatarSVG === 'function')
          ? window.getPlayerAvatarSVG(seatInfo.name, seatInfo.gender, seatInfo.avatarIndex, seatInfo.isBot, seatInfo.avatarFile)
          : '👤';

        podEl.innerHTML = `
          <div class="lobby-occupied-card ${isMe ? 'is-me' : ''}">
            <div class="lobby-occupied-avatar">${avatarSvg}</div>
            <div class="lobby-occupied-info">
              <span class="lobby-occupied-name" title="${seatInfo.name}">${seatInfo.name}${isMe ? ' (Siz)' : ''}</span>
              <span class="lobby-occupied-badge">${seatInfo.isBot ? '🤖 Bot' : (tableData.state === 'PLAYING' ? '🎮 Oynuyor' : '🟢 Hazır')}</span>
            </div>
            ${isMe && tableData.state === 'WAITING' ? '<button class="btn-leave-seat-pill" title="Koltuktan Kalk">❌ Kalk</button>' : ''}
            ${isMe && tableData.state === 'PLAYING' ? '<button class="btn-rejoin-seat-pill" title="Oyuna Geri Dön">🎯 Oyuna Dön</button>' : ''}
            ${!isMe && seatInfo.isBot && mySeatedIndex !== null && tableData.state === 'WAITING' ? `<button class="btn-remove-bot-pill" data-seat="${seatIdx}" title="Botu Kaldır">❌ Kaldır</button>` : ''}
          </div>
        `;

        if (isMe && tableData.state === 'WAITING') {
          const btnLeaveSeat = podEl.querySelector('.btn-leave-seat-pill');
          if (btnLeaveSeat) {
            btnLeaveSeat.addEventListener('click', (e) => {
              e.stopPropagation();
              socket.emit('lobby:leaveSeat', { userId: getUserId() }, (res) => {
                if (res.success) {
                  mySeatedIndex = null;
                  roomId = null;
                }
              });
            });
          }
        }

        if (isMe && tableData.state === 'PLAYING') {
          const btnRejoin = podEl.querySelector('.btn-rejoin-seat-pill');
          if (btnRejoin) {
            btnRejoin.addEventListener('click', (e) => {
              e.stopPropagation();
              socket.emit('reconnectRoom', { roomId: currentLobbyTableId, userId: getUserId() }, (res) => {
                if (res.success) {
                  setupGameRoom(res.roomId, res.seatIndex, res.isHost);
                  if (res.gameState) {
                    table.update(res.gameState);
                    const me = res.gameState.players[res.seatIndex];
                    if (me && me.hand) {
                      istaka.setHand(me.hand, true);
                    }
                  }
                  ui.showToast('🎯 Masanıza geri döndünüz!', 'success');
                } else {
                  ui.showToast(res.reason, 'error');
                }
              });
            });
          }
        }

        if (!isMe && seatInfo.isBot && mySeatedIndex !== null && tableData.state === 'WAITING') {
          const btnRemoveBot = podEl.querySelector('.btn-remove-bot-pill');
          if (btnRemoveBot) {
            btnRemoveBot.addEventListener('click', (e) => {
              e.stopPropagation();
              socket.emit('lobby:removeBot', { seatIndex: seatIdx, userId: getUserId() }, (res) => {
                if (!res.success) {
                  ui.showToast(res.reason, 'error');
                }
              });
            });
          }
        }
      } else {
        // Seat is empty
        if (tableData.state === 'PLAYING') {
          podEl.innerHTML = `
            <div class="lobby-seat-busy">
              <span class="busy-label">🔒 Dolu</span>
            </div>
          `;
        } else if (mySeatedIndex !== null) {
          // Seated player sees switch seat & add bot buttons
          podEl.innerHTML = `
            <div class="empty-seat-controls">
              <button class="btn-sit-seat" data-seat="${seatIdx}">
                <span class="sit-icon">➕</span>
                <span class="sit-label">BURAYA GEÇ</span>
              </button>
              <button class="btn-add-bot-pill" data-seat="${seatIdx}" title="Bu Koltuğa Bot Oturt">
                🤖 + Bot
              </button>
            </div>
          `;
          const btnSit = podEl.querySelector('.btn-sit-seat');
          if (btnSit) {
            btnSit.addEventListener('click', () => {
              socket.emit('lobby:switchSeat', { targetSeatIndex: seatIdx, userId: getUserId() }, (res) => {
                if (res.success) {
                  mySeatedIndex = res.seatIndex;
                } else {
                  ui.showToast(res.reason, 'error');
                }
              });
            });
          }
          const btnAddBot = podEl.querySelector('.btn-add-bot-pill');
          if (btnAddBot) {
            btnAddBot.addEventListener('click', () => {
              socket.emit('lobby:addBot', { seatIndex: seatIdx, userId: getUserId() }, (res) => {
                if (!res.success) {
                  ui.showToast(res.reason, 'error');
                }
              });
            });
          }
        } else {
          // Unseated viewer sees join seat button
          podEl.innerHTML = `
            <button class="btn-sit-seat" data-seat="${seatIdx}">
              <span class="sit-icon">➕</span>
              <span class="sit-label">${seatLabels[seatIdx]}</span>
            </button>
          `;
          const btnSit = podEl.querySelector('.btn-sit-seat');
          if (btnSit) {
            btnSit.addEventListener('click', () => {
              handleSitAtSeat(currentLobbyTableId, seatIdx);
            });
          }
        }
      }
    });
  }

  function handleSitAtSeat(roomIdToJoin, targetSeatIndex) {
    const name = getPlayerName();
    const userId = getUserId();
    const user = currentUser || {};

    socket.emit('joinRoom', {
      roomId: roomIdToJoin,
      playerName: name,
      userId,
      seatIndex: targetSeatIndex,
      gender: user.gender,
      avatarIndex: user.avatarIndex
    }, (res) => {
      if (res.success) {
        roomId = res.roomId;
        viewerSeatIndex = res.seatIndex;
        isHost = res.isHost;
        mySeatedIndex = res.seatIndex;
        ui.showToast('Koltuğa oturdunuz. Diğer oyuncular bekleniyor...', 'info');
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  socket.on('lobby:stateUpdate', (data) => {
    updateLobbyVirtualTable(data);
  });

  const btnLobbyFillBots = document.getElementById('btn-lobby-fill-bots');
  if (btnLobbyFillBots) {
    btnLobbyFillBots.addEventListener('click', () => {
      socket.emit('lobby:fillAllBots', { userId: getUserId() }, (res) => {
        if (res && !res.success) {
          ui.showToast(res.reason || 'Botlar eklenemedi.', 'error');
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
      const name = getPlayerName();
      const userId = getUserId();
      const user = currentUser || {};

      socket.emit('createRoom', {
        playerName: name,
        userId,
        gender: user.gender,
        avatarIndex: user.avatarIndex,
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
      const name = getPlayerName();
      const userId = getUserId();
      const user = currentUser || {};
      const codeEl = document.getElementById('input-room-code');
      const code = codeEl ? codeEl.value.trim().toUpperCase() : '';

      if (!code) {
        ui.showToast('Lütfen 6 haneli oda kodunu girin.', 'error');
        return;
      }

      socket.emit('joinRoom', {
        roomId: code,
        playerName: name,
        userId,
        gender: user.gender,
        avatarIndex: user.avatarIndex
      }, (res) => {
        ui.hideModal('modal-join-room');
        if (res.success) {
          setupGameRoom(res.roomId, res.seatIndex, res.isHost);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Start Game Handlers
  const handleStartGame = () => {
    if (!roomId) return;
    window.soundEngine.playDeal();
    const btnCenter = document.getElementById('btn-center-start-game');
    if (btnCenter) {
      btnCenter.textContent = '⏳ Oyun Başlatılıyor...';
      btnCenter.disabled = true;
    }
    socket.emit('startGame', { roomId }, (res) => {
      if (!res.success) {
        ui.showToast(res.reason, 'error');
        if (btnCenter) {
          btnCenter.textContent = '▶️ OYUNU BAŞLAT';
          btnCenter.disabled = false;
        }
      } else {
        const dropdownMenu = document.getElementById('dropdown-table-menu');
        if (dropdownMenu) dropdownMenu.classList.add('hidden');
      }
    });
  };

  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) btnStartGame.addEventListener('click', handleStartGame);

  const btnCenterStartGame = document.getElementById('btn-center-start-game');
  if (btnCenterStartGame) btnCenterStartGame.addEventListener('click', handleStartGame);

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
      localStorage.removeItem('okey101_active_room');
      if (roomId) {
        socket.emit('leaveRoom', { roomId, userId: getUserId() });
      }
      roomId = null;
      currentGameState = null;
      mySeatedIndex = null;
      viewerSeatIndex = 0;
      isHost = false;
      if (dropdownMenu) dropdownMenu.classList.add('hidden');
      updateDocumentTitle(false);
      showLobby();
      ui.showToast('Masadan ayrıldınız.', 'info');
    });
  }

  function setupGameRoom(rId, seatIdx, hostFlag) {
    roomId = rId;
    viewerSeatIndex = seatIdx;
    isHost = hostFlag;
    roundStartedHandSorted = false;
    localStorage.setItem('okey101_active_room', rId);
    clearChatMessages();

    table.setViewerSeatIndex(viewerSeatIndex);
    if (authView) {
      authView.classList.add('hidden');
      authView.style.setProperty('display', 'none', 'important');
    }
    if (lobbyView) {
      lobbyView.classList.add('hidden');
      lobbyView.style.setProperty('display', 'none', 'important');
    }
    if (gameView) {
      gameView.classList.remove('hidden');
      gameView.style.removeProperty('display');
      gameView.style.setProperty('display', 'flex', 'important');
    }

    const codeEl = document.getElementById('display-room-code');
    if (codeEl) codeEl.textContent = roomId;
    const cardCode = document.getElementById('lobby-card-room-code');
    if (cardCode) cardCode.textContent = roomId;
    if (btnStartGame) btnStartGame.classList.toggle('hidden', !isHost);
  }

  // --- Socket.IO Game State Updates ---
  socket.on('gameStateUpdate', (state) => {
    if (!state) return;
    const gameRoomId = state.id || state.gameId;

    // Transition from lobby to game table ONLY when round starts and user is seated in THIS room
    if (state.state === 'PLAYING') {
      const mySeat = state.players ? state.players.findIndex(p => p && ((currentUser && p.userId === currentUser.id) || p.id === socket.id)) : -1;
      if (mySeat !== -1 || (mySeatedIndex !== null && (roomId === gameRoomId || !roomId))) {
        const effectiveSeat = (mySeat !== -1) ? mySeat : (mySeatedIndex !== null ? mySeatedIndex : 0);
        viewerSeatIndex = effectiveSeat;
        roomId = gameRoomId;
        localStorage.setItem('okey101_active_room', roomId);
        table.setViewerSeatIndex(viewerSeatIndex);
        if (authView) {
          authView.classList.add('hidden');
          authView.style.display = 'none';
        }
        if (lobbyView) {
          lobbyView.classList.add('hidden');
          lobbyView.style.display = 'none';
        }
        if (gameView) {
          gameView.classList.remove('hidden');
          gameView.style.display = 'flex';
        }
      }
    }

    // If client is currently in lobby view, ignore game table rendering from background rooms
    if (lobbyView && !lobbyView.classList.contains('hidden')) {
      return;
    }

    currentGameState = state;
    table.setViewerSeatIndex(viewerSeatIndex);
    istaka.setIndicator(state.indicator);
    istaka.setTableMelds(state.tableMelds || []);

    // Waiting lobby overlay
    const waitingOverlay = document.getElementById('waiting-lobby-overlay');
    if (waitingOverlay) {
      const isWaiting = state.state === 'WAITING';
      waitingOverlay.classList.toggle('hidden', !isWaiting);
      const cardCode = document.getElementById('lobby-card-room-code');
      if (cardCode && roomId) cardCode.textContent = roomId;
    }

    // Detect pending discard and meld tiles before updating table DOM to prevent 1-frame pre-render flash
    window.pendingMeldTileIds = new Set();
    window.flyingDiscardSeatPos = null;

    if (lastGameState && lastGameState.state === 'PLAYING' && state.state === 'PLAYING') {
      const countDiscards = (s) => (s && s.discards) ? s.discards.reduce((acc, p) => acc + (p ? p.length : 0), 0) : 0;
      const lastDiscardCount = countDiscards(lastGameState);
      const currentDiscardCount = countDiscards(state);

      if (pendingTimeoutAnimationSeat === null && currentDiscardCount > lastDiscardCount && state.discards && lastGameState.discards) {
        for (let p = 0; p < 4; p++) {
          const curPile = state.discards[p] || [];
          const lastPile = lastGameState.discards[p] || [];
          if (curPile.length > lastPile.length) {
            const isViewer = (p === viewerSeatIndex);
            const isRecentManual = (Date.now() - (window.lastManualDragTime || 0)) < 3000;
            if (!isViewer || !isRecentManual) {
              window.flyingDiscardSeatPos = table.getRelativePosition(p);
            }
            break;
          }
        }
      }

      const lastMeldsCount = lastGameState.tableMelds ? lastGameState.tableMelds.length : 0;
      const currentMeldsCount = state.tableMelds ? state.tableMelds.length : 0;
      if (currentMeldsCount > lastMeldsCount) {
        const newMelds = state.tableMelds.slice(lastMeldsCount);
        newMelds.forEach(m => {
          if (m && m.tiles) {
            m.tiles.forEach(t => window.pendingMeldTileIds.add(t.id));
          }
        });
      }
    }

    // Update table components
    table.update(state);

    // Set drawn discard tile ID on istaka for highlighting and smart auto-sort
    const hasDrawnDiscard = state.drawnFromDiscard && state.drawnFromDiscard.playerIndex === viewerSeatIndex;
    istaka.setDrawnDiscardTileId(hasDrawnDiscard ? state.drawnFromDiscard.tileId : null);

    if (state.state !== 'PLAYING') {
      roundStartedHandSorted = false;
    }

    const isNewRoundStarting = (!lastGameState || lastGameState.state !== 'PLAYING' || lastGameState.currentRound !== state.currentRound);
    if (isNewRoundStarting && state.state === 'PLAYING') {
      roundStartedHandSorted = false;
    }

    if (state.state !== 'PLAYING') {
      roundStartedHandSorted = false;
    }

    // Update Istaka hand if viewer hand is provided
    const me = state.players[viewerSeatIndex];
    const lastMe = lastGameState && lastGameState.players ? lastGameState.players[viewerSeatIndex] : null;
    const isViewerJustOpened = me && me.opened && (!lastMe || !lastMe.opened);

    istaka.setViewerOpened(me ? me.opened : false);
    if (me && me.hand) {
      const isInitialDeal = (!roundStartedHandSorted && state.state === 'PLAYING' && me.hand.length >= 21);

      if (isUndoingTurn) {
        isUndoingTurn = false;
        istaka.restoreTurnSnapshot(me.hand);
      } else if (isInitialDeal) {
        roundStartedHandSorted = true;
        // Yalnızca oyun ilk başladığında veya yeni maçta bir kez otomatik seri dizilir
        istaka.setHand(me.hand, false, false);
        istaka.autoSortRuns();
      } else if (!isViewerJustOpened) {
        // Taş çekerken/atarken dizilim aynen korunur, asla otomatik dizilmez
        istaka.setHand(me.hand, true, false);
      }
    }

    // Audio and Visual Flying Tile Animations for Table Actions
    if (lastGameState && lastGameState.state === 'PLAYING' && state.state === 'PLAYING') {
      const anim = window.tileAnimations;

      // 1. Detect if someone discarded a tile
      const countDiscards = (s) => (s && s.discards) ? s.discards.reduce((acc, p) => acc + (p ? p.length : 0), 0) : 0;
      const lastDiscardCount = countDiscards(lastGameState);
      const currentDiscardCount = countDiscards(state);

      let islekDiscarded = false;
      let discardedByPlayer = null;
      let discardedTile = null;

      if (currentDiscardCount > lastDiscardCount && state.discards && lastGameState.discards) {
        for (let p = 0; p < 4; p++) {
          const curPile = state.discards[p] || [];
          const lastPile = lastGameState.discards[p] || [];
          if (curPile.length > lastPile.length) {
            discardedByPlayer = p;
            discardedTile = curPile[curPile.length - 1];
            if (discardedTile && window.ClientValidator && window.ClientValidator.isPlayableToTable(discardedTile, state.tableMelds || [], state.indicator)) {
              islekDiscarded = true;
            }
            break;
          }
        }
      }

      // 2. Open Melds Animation (Seri or Pairs) - Tile-by-tile flow onto exact grid spots!
      const lastMeldsCount = lastGameState.tableMelds ? lastGameState.tableMelds.length : 0;
      const currentMeldsCount = state.tableMelds ? state.tableMelds.length : 0;
      if (currentMeldsCount > lastMeldsCount) {
        window.soundEngine.playOpenHand();

        if (anim) {
          for (let p = 0; p < 4; p++) {
            const lastP = lastGameState.players ? lastGameState.players[p] : null;
            const newP = state.players ? state.players[p] : null;
            const justOpened = newP && newP.opened && (!lastP || !lastP.opened);
            if (justOpened) {
              const seatPos = table.getRelativePosition(p);
              const isViewer = (p === viewerSeatIndex);
              const playerMelds = state.tableMelds.filter(m => m.playerIndex === p);
              anim.animateOpenMelds(seatPos, playerMelds, newP.openType, isViewer, () => {
                if (isViewer && me && me.hand) {
                  istaka.setHand(me.hand, true, false);
                }
              });
            }
          }
        }
      } else if (lastGameState.tableMelds && state.tableMelds && anim) {
        // Check for tile processed into existing melds (İşleme - Seri veya Çifte Taş İşleme)
        for (let mIdx = 0; mIdx < state.tableMelds.length; mIdx++) {
          const lastM = lastGameState.tableMelds[mIdx];
          const curM = state.tableMelds[mIdx];
          if (lastM && curM && curM.tiles && lastM.tiles) {
            // Case 1: Tile appended to run or group meld
            if (curM.tiles.length > lastM.tiles.length) {
              const lastIds = new Set(lastM.tiles.map(t => t.id));
              const addedTile = curM.tiles.find(t => !lastIds.has(t.id)) || curM.tiles[curM.tiles.length - 1];
              const turnPlayer = (discardedByPlayer !== null) ? discardedByPlayer : state.currentTurn;
              const seatPos = table.getRelativePosition(turnPlayer);
              const isViewer = (turnPlayer === viewerSeatIndex);
              anim.animateProcessTile(seatPos, addedTile, isViewer);
              break;
            }
            // Case 2: Tile processed to a pair meld (e.g. replacing Okey Joker in pair)
            else if (curM.type === 'pairs') {
              const lastIds = new Set(lastM.tiles.map(t => t.id));
              const replacedTile = curM.tiles.find(t => !lastIds.has(t.id));
              if (replacedTile) {
                const turnPlayer = (discardedByPlayer !== null) ? discardedByPlayer : state.currentTurn;
                const seatPos = table.getRelativePosition(turnPlayer);
                const isViewer = (turnPlayer === viewerSeatIndex);
                anim.animateProcessTile(seatPos, replacedTile, isViewer);
                break;
              }
            }
          }
        }
      }

      // 3. Draw & Discard Orchestration
      if (anim) {
        const isTimeoutSequenceUpdate = pendingTimeoutAnimationSeat !== null;
        if (isTimeoutSequenceUpdate) pendingTimeoutAnimationSeat = null;
        const returnedDiscardPlayer = lastGameState.drawnFromDiscard
          ? lastGameState.drawnFromDiscard.playerIndex
          : null;
        const returnedDiscardPile = returnedDiscardPlayer !== null
          ? ((returnedDiscardPlayer + 3) % 4)
          : null;
        const isReturnDiscard = Boolean(
          lastGameState.drawnFromDiscard &&
          !state.drawnFromDiscard &&
          state.currentTurn === lastGameState.currentTurn &&
          state.turnState === 'DRAW' &&
          discardedByPlayer === returnedDiscardPile
        );

        const isRecentManualDrag = (Date.now() - (window.lastManualDragTime || 0)) < 3000;

        if (isTimeoutSequenceUpdate) {
          // timeoutActionSequence owns this update to avoid a duplicate discard.
        } else if (isReturnDiscard) {
          // Every viewer sees the tile travel from the returning player's hand/profile
          // back to the original discard pile, never as a fresh discard by its owner.
          const fromPos = table.getRelativePosition(returnedDiscardPlayer);
          const toPos = table.getRelativePosition(returnedDiscardPile);
          const isViewerReturning = returnedDiscardPlayer === viewerSeatIndex;
          anim.animateReturnDiscardFromSeat(fromPos, toPos, discardedTile, isViewerReturning);
        } else if (discardedByPlayer !== null && discardedByPlayer !== viewerSeatIndex) {
          // Other player / Bot discards a tile: Direct flight from player's profile avatar to corner box
          const seatPos = table.getRelativePosition(discardedByPlayer);
          anim.animateDiscard(seatPos, discardedTile, false);
        } else if (discardedByPlayer === viewerSeatIndex && discardedTile) {
          // Viewer discarded a tile
          const seatPos = table.getRelativePosition(viewerSeatIndex);
          if (isRecentManualDrag) {
            window.lastManualDragTime = 0;
            window.flyingDiscardSeatPos = null;
            table.renderDiscards();
          } else {
            anim.animateDiscard(seatPos, discardedTile, true);
          }
        } else {
          // Human or live player drawing during their turn
          const wasDraw = lastGameState.turnState === 'DRAW';
          const isDiscardNow = state.turnState === 'DISCARD';
          const sameTurnPlayer = lastGameState.currentTurn === state.currentTurn;

          if (wasDraw && isDiscardNow && sameTurnPlayer) {
            const turnPlayer = state.currentTurn;
            const seatPos = table.getRelativePosition(turnPlayer);
            const isViewer = (turnPlayer === viewerSeatIndex);

            if (isViewer && isRecentManualDrag) {
              window.lastManualDragTime = 0;
            } else {
              if (state.drawnFromDiscard && state.drawnFromDiscard.playerIndex === turnPlayer) {
                const fromSeat = (turnPlayer + 3) % 4;
                const fromPos = table.getRelativePosition(fromSeat);
                let drawnTile = state.drawnFromDiscard.tile;
                if (!drawnTile || (!drawnTile.color && !drawnTile.effectiveColor)) {
                  const leftPile = (lastGameState && lastGameState.discards) ? lastGameState.discards[fromSeat] : null;
                  if (leftPile && leftPile.length > 0) {
                    drawnTile = leftPile[leftPile.length - 1];
                  }
                }
                if (!drawnTile && isViewer && me && me.hand) {
                  drawnTile = me.hand.find(t => t.id === state.drawnFromDiscard.tileId);
                }
                anim.animateDrawFromDiscard(seatPos, fromPos, drawnTile, isViewer);
              } else {
                anim.animateDrawFromDeck(seatPos, isViewer);
              }
            }
          }
        }
      }

      // 4. Audio Feedback for Discards
      if (discardedByPlayer !== null) {
        window.soundEngine.playDiscard();
      }
    }
    lastGameState = state;

    // Turn change sound alert & dynamic title
    const isMyTurn = state.currentTurn === viewerSeatIndex && state.state === 'PLAYING';
    if (!isMyTurn || state.turnState !== 'DISCARD') {
      istaka.setDrawnTileId(null);
      istaka.clearTurnSnapshot();
    }
    updateDocumentTitle(isMyTurn);

    if (isMyTurn && lastTurn !== viewerSeatIndex) {
      window.soundEngine.playYourTurn();
    }
    lastTurn = state.currentTurn;

    // Start/Stop ambient cafe audio
    if (state.state === 'PLAYING') {
      window.soundEngine.startAmbient();
    }

    // Check round over / game over
    if ((state.state === 'ROUND_OVER' || state.state === 'GAME_OVER') && state.roundResults) {
      if (!window.roundResultModalActive) {
        window.roundResultModalActive = true;
        setTimeout(() => {
          ui.showRoundResultModal(state.roundResults, (action) => {
            if (action === 'rematch') {
              socket.emit('voteRematch', { roomId }, (res) => {
                if (res && res.restarted) {
                  ui.hideModal('round-result-modal');
                  window.roundResultModalActive = false;
                  istaka.clearSelection();
                } else if (res && !res.success) {
                  ui.showToast(res.reason || 'Yeniden başlatılamadı.', 'error');
                }
              });
            } else if (action === 'leave') {
              window.roundResultModalActive = false;
              localStorage.removeItem('okey101_active_room');
              if (roomId) {
                socket.emit('leaveRoom', { roomId, userId: getUserId() });
              }
              roomId = null;
              currentGameState = null;
              updateDocumentTitle(false);
              showLobby();
            }
          });
        }, 500);
      }
    } else if (state.state === 'PLAYING') {
      window.roundResultModalActive = false;
      ui.hideModal('round-result-modal');
      ui.hideModal('game-over-modal');
    }

    if (state.state === 'PLAYING') {
      startTurnTimerLoop();
    } else {
      stopTurnTimerLoop();
    }

    // Update Action Bar States
    updateActionBarUI();
  });

  // Rematch Vote Broadcast Update
  socket.on('rematchVoteUpdate', (data) => {
    const rematchBtn = document.getElementById('btn-vote-rematch');
    if (rematchBtn) {
      rematchBtn.innerHTML = `⏳ Oyuncular Bekleniyor (${data.votedCount}/${data.totalHumans})`;
    }
  });

  // Rematch Game Started
  socket.on('rematchStarted', () => {
    ui.hideModal('round-result-modal');
    ui.hideModal('game-over-modal');
    window.roundResultModalActive = false;
    roundStartedHandSorted = false;
    istaka.clearSelection();
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '<div class="chat-welcome-msg">💬 Sohbet yeni maç için temizlendi.</div>';
    }
    if (lobbyChatBadge) lobbyChatBadge.classList.add('hidden');
    if (tableChatBadge) tableChatBadge.classList.add('hidden');
    ui.showToast('🎮 Yeni Maç Başladı!', 'success', 2500);
  });

  // Turn Timer Animation Loop (30s clock with last 5s gentle countdown tick)
  function startTurnTimerLoop() {
    if (turnTimerLoop) return;
    lastTickedSecond = null;
    turnTimerLoop = setInterval(() => {
      if (!currentGameState || currentGameState.state !== 'PLAYING') {
        const topTimerBar = document.getElementById('top-turn-timer-bar');
        if (topTimerBar) topTimerBar.classList.add('hidden');
        return;
      }

      const turnStartTime = currentGameState.turnStartTime || Date.now();
      const turnDuration = currentGameState.turnDuration || 30000;
      const elapsed = Date.now() - turnStartTime;
      const progress = Math.max(0, Math.min(1, elapsed / turnDuration));
      const remainingRatio = Math.max(0, Math.min(1, 1 - progress));
      const remainingSeconds = Math.ceil((turnDuration - elapsed) / 1000);

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;

      // Full-Width Top Screen Turn Timer Progress Bar (Active on Viewer Turn)
      const topTimerBar = document.getElementById('top-turn-timer-bar');
      const topTimerFill = document.getElementById('top-turn-timer-fill');
      if (topTimerBar && topTimerFill) {
        if (isMyTurn) {
          topTimerBar.classList.remove('hidden');
          topTimerFill.style.width = (remainingRatio * 100) + '%';
          if (remainingSeconds <= 5) {
            topTimerFill.classList.add('urgent-pulse');
          } else {
            topTimerFill.classList.remove('urgent-pulse');
          }
        } else {
          topTimerBar.classList.add('hidden');
        }
      }

      // Süre azalırken farkındalık artıran nazik tik-tak ve son saniyelerde hızlanan uyarı tınısı
      if (isMyTurn && remainingSeconds <= 8 && remainingSeconds > 0) {
        if (lastTickedSecond !== remainingSeconds) {
          lastTickedSecond = remainingSeconds;
          window.soundEngine.playTimerTick(remainingSeconds);
        }
      } else if (!isMyTurn) {
        lastTickedSecond = null;
      }

      // All 4 Players (Bottom/Viewer, Top, Left, Right) Turn Progress Bars
      ['bottom', 'top', 'left', 'right'].forEach(pos => {
        const seatEl = document.getElementById('seat-' + pos);
        if (!seatEl) return;
        const fillEl = seatEl.querySelector('.player-turn-progress-fill');
        if (!fillEl) return;

        if (seatEl.classList.contains('active-turn')) {
          fillEl.style.width = (remainingRatio * 100) + '%';
        } else {
          fillEl.style.width = '100%';
        }
      });
    }, 100);
  }

  function stopTurnTimerLoop() {
    if (turnTimerLoop) {
      clearInterval(turnTimerLoop);
      turnTimerLoop = null;
    }
    const topTimerBar = document.getElementById('top-turn-timer-bar');
    if (topTimerBar) topTimerBar.classList.add('hidden');
  }

  // --- Action Bar & In-Game Controls ---
  const btnSortRuns = document.getElementById('btn-sort-runs');
  const btnSortPairs = document.getElementById('btn-sort-pairs');
  const btnOpenHand = document.getElementById('btn-open-hand');
  const btnOpenPairs = document.getElementById('btn-open-pairs');
  const btnDiscard = document.getElementById('btn-discard-tile');

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

  // Undo Turn Actions Button (Vazgeç)
  const btnUndoTurn = document.getElementById('btn-undo-turn');
  if (btnUndoTurn) {
    btnUndoTurn.addEventListener('click', () => {
      if (!roomId) return;
      socket.emit('undoTurn', { roomId }, (res) => {
        if (res.success) {
          isUndoingTurn = true;
          ui.showToast('↩️ Açılan perler ve işlenen taşlar geri alındı.', 'info', 2500);
          window.soundEngine.playTilePlace();
        } else {
          ui.showToast((res && res.reason) || 'Hamle geri alınamadı.', 'error', 2500);
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
  if (centerDeckEl) {
    centerDeckEl.addEventListener('click', () => {
      window.lastActionWasManualDrag = false;
      handleDrawDeck();
    });
  }

  const leftDiscardEl = document.getElementById('discard-pile-left');
  if (leftDiscardEl) {
    leftDiscardEl.addEventListener('click', () => {
      window.lastActionWasManualDrag = false;
      handleDrawDiscard();
    });
  }

  const bottomDiscardEl = document.getElementById('discard-pile-bottom');
  if (bottomDiscardEl) {
    bottomDiscardEl.addEventListener('click', () => {
      window.lastActionWasManualDrag = false;
      handleDiscardTile();
    });

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
      const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
      if (tileId && !tileId.startsWith('ACTION:')) {
        window.lastManualDragTime = Date.now();
        window.lastActionWasManualDrag = true;
        handleQuickDiscard({ id: tileId });
      }
    });
  }

  // Smart Open Hand Button (Oyuncunun ıstakaya kendi dizdiği perleri açar)
  if (btnOpenHand) {
    btnOpenHand.addEventListener('click', () => {
      if (!currentGameState || btnOpenHand.disabled) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      if (!isMyTurn) {
        ui.showToast('Sıra sizde değil.', 'error', 2500);
        return;
      }
      if (currentGameState.turnState !== 'DISCARD') {
        ui.showToast('Önce taş çekmelisiniz.', 'error', 2500);
        return;
      }

      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      if (!isFirstOpen && viewerPlayer.openType === 'pairs') {
        ui.showToast('Çift açtığınız için seri per açamazsınız.', 'error', 3000);
        return;
      }

      const minRequired = isFirstOpen ? (currentGameState.minOpenScore || 101) : 0;
      const requiredId = (isMyTurn && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;

      // 1. Detect valid melds from the player's own rack layout
      const rackAnalysis = istaka.analyzeRackMelds();

      if (rackAnalysis.validMelds.length === 0) {
        ui.showToast('Istakanızda açılacak geçerli bir per bulunamadı.', 'error', 3000);
        return;
      }

      const containsRequired = !requiredId || !isFirstOpen || rackAnalysis.validTileIds.has(requiredId);
      if (requiredId && isFirstOpen && !containsRequired) {
        ui.showToast('Yandan çektiğiniz taşı açtığınız perlerde kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
        return;
      }

      if (isFirstOpen && rackAnalysis.totalScore < minRequired) {
        const formattedScore = (window.formatOkeyScore && typeof window.formatOkeyScore === 'function')
          ? window.formatOkeyScore(minRequired)
          : `${minRequired}`;
        ui.showToast(`Dizdiğiniz perlerin toplamı ${rackAnalysis.totalScore} puan. Seri açmak için en az ${formattedScore} (${minRequired} puan) olmalıdır.`, 'error', 3500);
        return;
      }

      const meldIdArrays = rackAnalysis.validMelds.map(m => m.tiles.map(t => t.id));

      if (!istaka.hasTurnSnapshot()) {
        istaka.saveTurnSnapshot();
      }

      // Snapshot exact physical rack coordinates of all tiles being opened before server deletes them
      window.lastKnownRackCoords = window.lastKnownRackCoords || {};
      document.querySelectorAll('.istaka-slot').forEach(slot => {
        const tile = slot.querySelector('.okey-tile');
        if (tile && tile.dataset.id) {
          const rect = tile.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            window.lastKnownRackCoords[tile.dataset.id] = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: rect.width,
              height: rect.height
            };
          }
        }
      });

      socket.emit('openHand', { roomId, melds: meldIdArrays }, (res) => {
        if (res.success) {
          window.soundEngine.playOpenHand();
          istaka.clearSelection();
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Smart Open Pairs Button (Oyuncunun ıstakaya kendi dizdiği çiftleri açar)
  if (btnOpenPairs) {
    btnOpenPairs.addEventListener('click', () => {
      if (!currentGameState || btnOpenPairs.disabled) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p && p.opened && p.openType === 'pairs');
      if (!isFirstOpen && viewerPlayer && viewerPlayer.openType === 'seri' && !hasPairsOnTable) {
        return;
      }

      const minPairs = isFirstOpen ? (currentGameState.minOpenPairs || 5) : 1;
      const requiredId = (isMyTurn && isFirstOpen && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;

      // 1. Analyze 2-tile pair groups currently arranged on the istaka rack
      const rackPairs = istaka.analyzeRackPairs();

      if (rackPairs.validPairs.length < minPairs) {
        ui.showToast(`Çift açmak için ıstakanızda en az ${minPairs} çift dizili olmalıdır (Şu an: ${rackPairs.validPairs.length} çift).`, 'error', 3000);
        return;
      }

      const containsRequired = !requiredId || !isFirstOpen || rackPairs.validTileIds.has(requiredId);
      if (requiredId && isFirstOpen && !containsRequired) {
        ui.showToast('Yandan çektiğiniz taşı açtığınız çiftlerde kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
        return;
      }

      const pairIdArrays = rackPairs.validPairs.map(p => [p[0].id, p[1].id]);

      if (!istaka.hasTurnSnapshot()) {
        istaka.saveTurnSnapshot();
      }

      // Snapshot exact physical rack coordinates of all tiles being opened before server deletes them
      window.lastKnownRackCoords = window.lastKnownRackCoords || {};
      document.querySelectorAll('.istaka-slot').forEach(slot => {
        const tile = slot.querySelector('.okey-tile');
        if (tile && tile.dataset.id) {
          const rect = tile.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            window.lastKnownRackCoords[tile.dataset.id] = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: rect.width,
              height: rect.height
            };
          }
        }
      });

      socket.emit('openPairs', { roomId, pairs: pairIdArrays }, (res) => {
        if (res.success) {
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
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn) {
      ui.showToast('Sıra sizde değilken taş çekemezsiniz.', 'error');
      return;
    }
    socket.emit('drawTile', { roomId, source: 'deck' }, (res) => {
      if (res.success) {
        window.soundEngine.playDrawDeck();
        if (res.tile && res.tile.id) {
          istaka.setDrawnTileId(res.tile.id);
        }
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleDrawDiscard() {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn) {
      ui.showToast('Sıra sizde değilken taş çekemezsiniz.', 'error');
      return;
    }
    socket.emit('drawTile', { roomId, source: 'discard' }, (res) => {
      if (res.success) {
        window.soundEngine.playDrawDiscard();
        if (res.tile && res.tile.id) {
          istaka.setDrawnTileId(res.tile.id);
        }
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleDiscardTile() {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn) {
      ui.showToast('Sıra sizde değilken taş atamazsınız.', 'error');
      return;
    }
    if (currentGameState.turnState !== 'DISCARD') {
      ui.showToast('Taş çekmeden taş atamazsınız.', 'error');
      return;
    }

    const hasDrawnDiscard = currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    if (hasDrawnDiscard) {
      ui.showToast('Yandan çektiğiniz taşı kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
      return;
    }

    const activeTile = istaka.activeTile;
    if (!activeTile) {
      return;
    }

    istaka.setDrawnTileId(null);
    istaka.clearTurnSnapshot();
    socket.emit('discardTile', { roomId, tileId: activeTile.id }, (res) => {
      if (res.success) {
        istaka.clearSelection();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleQuickDiscard(tile) {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn) {
      ui.showToast('Sıra sizde değilken taş atamazsınız.', 'error');
      return;
    }
    if (currentGameState.turnState !== 'DISCARD') {
      ui.showToast('Taş çekmeden taş atamazsınız.', 'error');
      return;
    }

    const hasDrawnDiscard = currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    if (hasDrawnDiscard) {
      ui.showToast('Yandan çektiğiniz taşı kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
      return;
    }

    istaka.setDrawnTileId(null);
    istaka.clearTurnSnapshot();
    socket.emit('discardTile', { roomId, tileId: tile.id }, (res) => {
      if (res.success) {
        istaka.clearSelection();
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  function handleProcessTileById(tileId, targetMeldId) {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    if (!isMyTurn) {
      ui.showToast('Sıra sizde değilken taş işleyemezsiniz.', 'error');
      return;
    }
    if (currentGameState.turnState !== 'DISCARD') {
      ui.showToast('Taş çekmeden taş işleyemezsiniz.', 'error');
      return;
    }
    const viewerPlayer = currentGameState.players[viewerSeatIndex];
    if (!viewerPlayer || !viewerPlayer.opened) {
      ui.showToast('Taş işlemek için önce elinizi açmış olmalısınız.', 'error');
      return;
    }

    if (!istaka.hasTurnSnapshot()) {
      istaka.saveTurnSnapshot();
    }

    socket.emit('processTile', { roomId, tileId, targetMeldId }, (res) => {
      if (res.success) {
        if (res.okeyStolen) {
          ui.showToast('✨ Tebrikler! Perdeki Okey yerine taş işlediniz ve OKEY elinize geçti!', 'success', 3500);
          window.soundEngine.playVictory();
        } else {
          window.soundEngine.playDiscard();
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
      return;
    }
    handleProcessTileById(activeTile.id, targetMeldId);
  }

  function updateActionBarUI() {
    if (!currentGameState) return;
    const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
    const turnState = currentGameState.turnState;
    const viewerPlayer = currentGameState.players[viewerSeatIndex];
    const isPlayingGame = currentGameState.state === 'PLAYING';

    // Dynamic Turn Focus Mode: When it's viewer's turn in a live match, expand the oval table felt smoothly after discard lands!
    const tableCanvas = document.querySelector('.plus-table-canvas');
    if (tableCanvas) {
      const shouldFocus = Boolean(isMyTurn && isPlayingGame);
      if (shouldFocus) {
        const isAnimActive = window.tileAnimations && (window.tileAnimations.isAnimating || (window.tileAnimations.queue && window.tileAnimations.queue.length > 0));
        const delay = isAnimActive ? 500 : 0;
        setTimeout(() => {
          if (currentGameState && currentGameState.currentTurn === viewerSeatIndex && currentGameState.state === 'PLAYING') {
            tableCanvas.classList.add('my-turn-focus');
          }
        }, delay);
      } else {
        tableCanvas.classList.remove('my-turn-focus');
      }
    }

    const topTimerBar = document.getElementById('top-turn-timer-bar');
    if (topTimerBar) {
      topTimerBar.classList.toggle('hidden', !Boolean(isMyTurn && isPlayingGame));
    }

    const turnActionDock = document.getElementById('turn-action-dock');
    if (turnActionDock) {
      turnActionDock.classList.toggle('hidden', !Boolean(isMyTurn && isPlayingGame));
    }

    // Shared table indicator; personal opening validation still excludes the partner.
    const centerTargetBadge = document.getElementById('center-target-badge');
    const minOpenScore = (currentGameState.minOpenScore !== undefined && currentGameState.minOpenScore !== null)
      ? currentGameState.minOpenScore
      : 101;
    const minOpenPairs = (currentGameState.minOpenPairs !== undefined && currentGameState.minOpenPairs !== null)
      ? currentGameState.minOpenPairs
      : 5;
    const formattedScore = (window.formatOkeyScore && typeof window.formatOkeyScore === 'function')
      ? window.formatOkeyScore(currentGameState.tableMinOpenScore || 101)
      : `${currentGameState.tableMinOpenScore || 101}`;
    const tableMinOpenPairs = currentGameState.tableMinOpenPairs || 5;

    if (centerTargetBadge) {
      centerTargetBadge.innerHTML = `
        <div class="target-values">
          <span class="target-seri-line">${formattedScore}</span>
          <span class="target-divider">•</span>
          <span class="target-pairs-line">${tableMinOpenPairs} Çift</span>
        </div>
      `;
    }

    const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;
    const cannotOpenSeri = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'pairs';
    const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p && p.opened && p.openType === 'pairs');
    const cannotOpenPairs = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'seri' && !hasPairsOnTable;

    const hasDrawnFromDiscard = isMyTurn && turnState === 'DISCARD' && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    const canAttemptOpen = isMyTurn && turnState === 'DISCARD';

    // Anti-Cheat / Anti-Probe: Only enable Open buttons if player's arranged hand ACTUALLY qualifies to open
    let canActuallyOpenSeri = false;
    let canActuallyOpenPairs = false;

    if (canAttemptOpen && !cannotOpenSeri && typeof istaka !== 'undefined') {
      const rackAnalysis = istaka.analyzeRackMelds();
      const requiredId = hasDrawnFromDiscard ? currentGameState.drawnFromDiscard.tileId : null;
      const containsRequired = !requiredId || !isFirstOpen || rackAnalysis.validTileIds.has(requiredId);

      if (isFirstOpen) {
        canActuallyOpenSeri = Boolean(rackAnalysis.validMelds.length > 0 && rackAnalysis.totalScore >= minOpenScore && containsRequired);
      } else {
        canActuallyOpenSeri = Boolean(rackAnalysis.validMelds.length > 0);
      }
    }

    if (canAttemptOpen && !cannotOpenPairs && typeof istaka !== 'undefined') {
      const rackPairs = istaka.analyzeRackPairs();
      const requiredId = hasDrawnFromDiscard ? currentGameState.drawnFromDiscard.tileId : null;
      const containsRequired = !requiredId || !isFirstOpen || rackPairs.validTileIds.has(requiredId);

      if (isFirstOpen) {
        canActuallyOpenPairs = Boolean(rackPairs.validPairs.length >= minOpenPairs && containsRequired);
      } else {
        canActuallyOpenPairs = Boolean(rackPairs.validPairs.length >= 1);
      }
    }

    if (btnOpenHand) {
      btnOpenHand.disabled = !canActuallyOpenSeri;
      btnOpenHand.title = cannotOpenSeri
        ? 'Çift açtığınız için seri açamazsınız'
        : (canActuallyOpenSeri
            ? 'Dizdiğiniz perleri masaya açın'
            : (canAttemptOpen ? `Seri açmak için ıstakanıza en az ${minOpenScore} puanlık geçerli per dizmelisiniz` : 'Taş çektikten sonra el açabilirsiniz'));
    }
    if (btnOpenPairs) {
      btnOpenPairs.disabled = !canActuallyOpenPairs;
      btnOpenPairs.title = cannotOpenPairs
        ? 'Masada çift açmış bir oyuncu olmadığı için çift açamazsınız'
        : (canActuallyOpenPairs
            ? 'Dizdiğiniz çiftleri masaya açın'
            : (canAttemptOpen ? `Çift açmak için ıstakanıza en az ${minOpenPairs} çift dizmelisiniz` : 'Taş çektikten sonra çift açabilirsiniz'));
    }

    // Show "Taşı Geri Bırak" only if viewer has drawn from discard and hasn't opened/discarded yet
    const btnReturnDiscard = document.getElementById('btn-return-discard');
    if (btnReturnDiscard) {
      btnReturnDiscard.classList.toggle('hidden', !hasDrawnFromDiscard);
    }

    // Show "Vazgeç" button only if viewer has modified hand in this turn and can undo
    const btnUndoTurn = document.getElementById('btn-undo-turn');
    if (btnUndoTurn) {
      const canUndo = Boolean(currentGameState.canUndo && isMyTurn && turnState === 'DISCARD');
      btnUndoTurn.classList.toggle('hidden', !canUndo);
    }
  }

  function handleIstakaStateChange(data) {
    updateActionBarUI();
  }

  // =========================================================
  // SLIDING SIDE DRAWERS (CHAT & SETTINGS) & SOUND TOGGLE
  // =========================================================
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const chatDrawer = document.getElementById('chat-drawer');
  const settingsDrawer = document.getElementById('settings-drawer');

  const btnLobbyChat = document.getElementById('btn-lobby-chat');
  const btnTableChat = document.getElementById('btn-table-chat');
  const btnCloseChatDrawer = document.getElementById('btn-close-chat-drawer');

  const btnLobbySettings = document.getElementById('btn-lobby-settings');
  const btnTableSettings = document.getElementById('btn-table-settings');
  const btnCloseSettingsDrawer = document.getElementById('btn-close-settings-drawer');

  const lobbyChatBadge = document.getElementById('lobby-chat-badge');
  const tableChatBadge = document.getElementById('table-chat-badge');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');

  const btnToggleMasterAudio = document.getElementById('btn-toggle-master-audio');
  const labelMasterAudioIcon = document.getElementById('label-master-audio-icon');
  const labelMasterAudioText = document.getElementById('label-master-audio-text');
  const drawerInGameActions = document.getElementById('drawer-in-game-actions');
  const btnDrawerLeaveTable = document.getElementById('btn-drawer-leave-table');

  function openDrawer(drawer) {
    if (!drawer) return;
    window.soundEngine.init();
    closeAllDrawers();
    drawer.classList.add('open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('hidden');

    if (drawer === chatDrawer) {
      if (lobbyChatBadge) lobbyChatBadge.classList.add('hidden');
      if (tableChatBadge) tableChatBadge.classList.add('hidden');
      if (chatInput) {
        setTimeout(() => chatInput.focus(), 150);
      }
      const chatLogs = document.getElementById('chat-messages');
      if (chatLogs) chatLogs.scrollTop = chatLogs.scrollHeight;
    } else if (drawer === settingsDrawer) {
      syncSettingsDrawer();
    }
  }

  if (btnLobbyChat) btnLobbyChat.addEventListener('click', () => openDrawer(chatDrawer));
  if (btnTableChat) btnTableChat.addEventListener('click', () => openDrawer(chatDrawer));
  if (btnCloseChatDrawer) btnCloseChatDrawer.addEventListener('click', closeAllDrawers);

  if (btnLobbySettings) btnLobbySettings.addEventListener('click', () => openDrawer(settingsDrawer));
  if (btnTableSettings) btnTableSettings.addEventListener('click', () => openDrawer(settingsDrawer));
  if (btnCloseSettingsDrawer) btnCloseSettingsDrawer.addEventListener('click', closeAllDrawers);

  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeAllDrawers);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDrawers();
  });

  // --- Live Chat Message Handling (In-Game Only) ---
  function sendChatMessage(customText = null) {
    if (!roomId) {
      ui.showToast('Sohbet yalnızca oyun masasında kullanılabilir.', 'info');
      return;
    }

    const text = (customText !== null) ? customText.trim() : (chatInput ? chatInput.value.trim() : '');
    if (!text) return;

    const myName = currentActivePlayerName || (currentUser ? currentUser.displayName : 'Oyuncu');

    socket.emit('sendChat', {
      roomId,
      sender: myName,
      text
    });

    if (chatInput && customText === null) {
      chatInput.value = '';
      chatInput.focus();
    }
  }

  if (btnSendChat) btnSendChat.addEventListener('click', () => sendChatMessage());
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  socket.on('chatMessage', (msg) => {
    const isMe = (msg.sender === currentActivePlayerName) || (currentUser && msg.sender === currentUser.displayName);
    const isSys = Boolean(msg.isSystem || msg.sender === 'SİSTEM');
    ui.appendChatMessage(msg.sender, msg.text, msg.time, isMe, isSys);

    if (isSys) {
      ui.showToast(msg.text, 'info', 4500);
    } else {
      // In-game floating speech bubble over player avatar (lasts 2.5 seconds, no timestamp)
      let targetSeatPosition = null;
      if (msg.senderSeatIndex !== undefined && msg.senderSeatIndex !== null && typeof table !== 'undefined') {
        targetSeatPosition = table.getRelativePosition(msg.senderSeatIndex);
      } else if (currentGameState && currentGameState.players) {
        const foundIdx = currentGameState.players.findIndex(p => p && p.name === msg.sender);
        if (foundIdx !== -1 && typeof table !== 'undefined') {
          targetSeatPosition = table.getRelativePosition(foundIdx);
        }
      }
      if (targetSeatPosition) {
        ui.showSpeechBubble(targetSeatPosition, msg.text);
      }
    }

    // If chat is closed and message is from someone else, show unread badge
    const isChatOpen = chatDrawer && chatDrawer.classList.contains('open');
    if (!isChatOpen && !isMe) {
      if (lobbyChatBadge) lobbyChatBadge.classList.remove('hidden');
      if (tableChatBadge) tableChatBadge.classList.remove('hidden');
    }
  });

  // --- Master Sound Toggle & Settings Drawer Sync ---
  function syncSettingsDrawer() {
    const isMuted = window.soundEngine.isMuted();
    if (btnToggleMasterAudio) {
      btnToggleMasterAudio.className = 'btn-sound-main-toggle ' + (isMuted ? 'muted' : 'active');
      if (labelMasterAudioIcon) labelMasterAudioIcon.textContent = isMuted ? '🔇' : '🔊';
      if (labelMasterAudioText) labelMasterAudioText.textContent = isMuted ? 'SES: KAPALI' : 'SES: AÇIK';
    }

    if (drawerInGameActions) {
      if (roomId) {
        drawerInGameActions.classList.remove('hidden');
      } else {
        drawerInGameActions.classList.add('hidden');
      }
    }
  }

  if (btnToggleMasterAudio) {
    btnToggleMasterAudio.addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      syncSettingsDrawer();
      if (!isMuted) {
        window.soundEngine.playDiscard();
      }
    });
  }

  if (btnDrawerLeaveTable) {
    btnDrawerLeaveTable.addEventListener('click', () => {
      closeAllDrawers();
      if (roomId) {
        socket.emit('leaveRoom', { roomId, userId: getUserId() }, () => {
          roomId = null;
          showLobby();
          ui.showToast('Masadan ayrıldınız.', 'info');
        });
      }
    });
  }

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

  // Initialize Sound UI on load
  syncSettingsDrawer();
});
