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

  // --- Dynamic Title & LocalStorage Sync ---
  let currentActivePlayerName = 'Oyuncu';
  let titleBlinkInterval = null;
  let currentUser = null;

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

  let availableProfiles = [];

  function renderNamePicker(list) {
    if (list) availableProfiles = list;
    const grid = document.getElementById('name-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Sort alphabetically in Turkish
    const sorted = [...availableProfiles].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    sorted.forEach((item, idx) => {
      const card = document.createElement('div');
      const isOnline = item.isOnline && !item.isSelf;
      card.className = 'name-card' + (isOnline ? ' occupied' : ' available');

      const avatarSvg = (typeof window.getPlayerAvatarSVG === 'function')
        ? window.getPlayerAvatarSVG(item.displayName || item.name, item.gender || 'male', (item.avatarIndex !== undefined && item.avatarIndex !== null) ? item.avatarIndex : idx % 8)
        : '👤';

      card.innerHTML = `
        <div class="name-card-avatar">${avatarSvg}</div>
        <div class="name-card-info">
          <span class="name-card-title">${item.name}</span>
          <span class="name-card-status ${isOnline ? 'status-occupied' : 'status-available'}">
            ${isOnline ? '🔴 Çevrimiçi' : '🟢 Giriş Yap'}
          </span>
        </div>
      `;

      if (!isOnline) {
        card.addEventListener('click', () => {
          socket.emit('auth:selectName', { name: item.name }, (res) => {
            if (res.success && res.user) {
              ui.showToast(`Hoş geldin, ${res.user.displayName || res.user.username}!`, 'success');
              handleLoginSuccess(res.user, res.token, false);
            } else {
              ui.showToast(res.reason || 'Giriş yapılamadı.', 'error');
            }
          });
        });
      }

      grid.appendChild(card);
    });
  }

  socket.on('auth:namesUpdate', (names) => {
    renderNamePicker(names);
  });

  function showLobby() {
    stopTurnTimerLoop();
    if (authView) {
      authView.classList.add('hidden');
      authView.style.display = 'none';
    }
    if (gameView) {
      gameView.classList.add('hidden');
      gameView.style.display = 'none';
    }
    if (lobbyView) {
      lobbyView.classList.remove('hidden');
      lobbyView.style.display = 'flex';
    }
    socket.emit('lobby:join');
  }

  function showAuth() {
    stopTurnTimerLoop();
    if (lobbyView) {
      lobbyView.classList.add('hidden');
      lobbyView.style.display = 'none';
    }
    if (gameView) {
      gameView.classList.add('hidden');
      gameView.style.display = 'none';
    }
    if (authView) {
      authView.classList.remove('hidden');
      authView.style.display = 'flex';
    }
    socket.emit('auth:getAvailableNames', (list) => {
      renderNamePicker(list);
    });
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
          showLobby();
        }
      });
    } else {
      showLobby();
    }
  }

  // Auto-Login with saved token on page load
  const savedToken = localStorage.getItem('okey101_auth_token');
  if (savedToken) {
    socket.emit('auth:autoLogin', { token: savedToken }, (res) => {
      if (res && res.success && res.user) {
        handleLoginSuccess(res.user, savedToken, true);
      } else {
        localStorage.removeItem('okey101_auth_token');
        localStorage.removeItem('okey101_user');
        showAuth();
      }
    });
  } else {
    showAuth();
  }

  // --- Profile Settings Modal & Avatar Picker ---
  let selectedProfileAvatarIndex = 0;
  let selectedProfileGender = 'male';

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

  function renderAvatarPicker() {
    const grid = document.getElementById('avatar-picker-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = (selectedProfileGender === 'female') ? (window.femaleAvatars || []) : (window.maleAvatars || []);
    list.forEach((svgHtml, idx) => {
      const item = document.createElement('div');
      item.className = 'avatar-pick-item' + (selectedProfileAvatarIndex === idx ? ' selected' : '');
      item.innerHTML = svgHtml;
      item.addEventListener('click', () => {
        selectedProfileAvatarIndex = idx;
        renderAvatarPicker();
      });
      grid.appendChild(item);
    });
  }

  function openProfileModal() {
    if (!currentUser) return;
    const editNameInput = document.getElementById('edit-display-name');
    if (editNameInput) editNameInput.value = currentUser.displayName || currentUser.username;

    selectedProfileGender = currentUser.gender || 'male';
    selectedProfileAvatarIndex = (currentUser.avatarIndex !== undefined && currentUser.avatarIndex !== null) ? currentUser.avatarIndex : 0;

    const maleRadio = document.getElementById('gender-male');
    const femaleRadio = document.getElementById('gender-female');
    if (maleRadio) maleRadio.checked = (selectedProfileGender === 'male');
    if (femaleRadio) femaleRadio.checked = (selectedProfileGender === 'female');

    renderAvatarPicker();
    ui.showModal('modal-profile-settings');
  }

  const btnOpenProfile = document.getElementById('btn-open-profile');
  if (btnOpenProfile) btnOpenProfile.addEventListener('click', openProfileModal);

  const btnEditAvatar = document.getElementById('btn-edit-avatar-trigger');
  if (btnEditAvatar) btnEditAvatar.addEventListener('click', openProfileModal);

  const btnCloseProfile = document.getElementById('btn-close-profile-modal');
  if (btnCloseProfile) {
    btnCloseProfile.addEventListener('click', () => {
      ui.hideModal('modal-profile-settings');
    });
  }

  // Gender change in profile modal
  const genderRadios = document.querySelectorAll('input[name="edit-gender"]');
  genderRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedProfileGender = e.target.value;
      renderAvatarPicker();
    });
  });

  // Profile Settings Form Submit
  const formProfile = document.getElementById('form-profile-settings');
  if (formProfile) {
    formProfile.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentUser) return;

      socket.emit('auth:updateProfile', {
        userId: currentUser.id,
        gender: selectedProfileGender,
        avatarIndex: selectedProfileAvatarIndex
      }, (res) => {
        if (res.success) {
          currentUser = res.user;
          localStorage.setItem('okey101_user', JSON.stringify(currentUser));
          currentActivePlayerName = currentUser.displayName || currentUser.username;
          updateDocumentTitle(false);
          updateLobbyProfileUI();
          ui.hideModal('modal-profile-settings');
          ui.showToast('Profiliniz güncellendi!', 'success');
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
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

    const titleEl = document.getElementById('lobby-table-title');
    const statusEl = document.getElementById('lobby-table-status');
    if (titleEl) titleEl.textContent = `MASA #${currentLobbyTableId}`;
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

    if (tableData.countdown !== null && tableData.countdown !== undefined && tableData.countdown > 0) {
      if (countdownBanner) countdownBanner.classList.remove('hidden');
      if (countdownNum) countdownNum.textContent = tableData.countdown;
      if (instructionEl) instructionEl.classList.add('hidden');
      try {
        if (window.soundEngine && typeof window.soundEngine.playTileTouch === 'function') {
          window.soundEngine.playTileTouch();
        }
      } catch (e) {}
    } else {
      if (countdownBanner) countdownBanner.classList.add('hidden');
      if (instructionEl) instructionEl.classList.remove('hidden');
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
          ? window.getPlayerAvatarSVG(seatInfo.name, seatInfo.gender, seatInfo.avatarIndex, seatInfo.isBot)
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
    istaka.setViewerOpened(me ? me.opened : false);
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

    // Audio events for table actions
    if (lastGameState && lastGameState.state === 'PLAYING' && state.state === 'PLAYING') {
      // 1. Someone opened hand (tableMelds count increased)
      const lastMeldsCount = lastGameState.tableMelds ? lastGameState.tableMelds.length : 0;
      const currentMeldsCount = state.tableMelds ? state.tableMelds.length : 0;
      if (currentMeldsCount > lastMeldsCount) {
        window.soundEngine.playOpenHand();
      }

      // 2. Someone discarded a tile (discards pile total count increased)
      const countDiscards = (s) => (s && s.discards) ? s.discards.reduce((acc, p) => acc + (p ? p.length : 0), 0) : 0;
      const lastDiscardCount = countDiscards(lastGameState);
      const currentDiscardCount = countDiscards(state);
      if (currentDiscardCount > lastDiscardCount) {
        // Check if the discarded tile is playable to the table (işlek taş)
        let islekDiscarded = false;
        let discardedByPlayer = null;
        if (state.discards && lastGameState.discards) {
          for (let p = 0; p < 4; p++) {
            const curPile = state.discards[p] || [];
            const lastPile = lastGameState.discards[p] || [];
            if (curPile.length > lastPile.length) {
              discardedByPlayer = p;
              const newTile = curPile[curPile.length - 1];
              if (newTile && window.ClientValidator && window.ClientValidator.isPlayableToTable(newTile, state.tableMelds || [], state.indicator)) {
                islekDiscarded = true;
              }
              break;
            }
          }
        }

        if (islekDiscarded) {
          window.soundEngine.playIslekFail();
          if (discardedByPlayer === viewerSeatIndex) {
            ui.showToast('⚠️ İşlek Taş Attınız! (Masaya işlenebilecek taştı)', 'error', 3500);
          }
        } else {
          window.soundEngine.playDiscard();
        }
      }
    }
    lastGameState = state;

    // Turn change sound alert & dynamic title
    const isMyTurn = state.currentTurn === viewerSeatIndex && state.state === 'PLAYING';
    updateDocumentTitle(isMyTurn);

    if (isMyTurn && lastTurn !== viewerSeatIndex) {
      window.soundEngine.playYourTurn();
    }
    lastTurn = state.currentTurn;

    // Start/Stop ambient cafe audio
    if (state.state === 'PLAYING') {
      window.soundEngine.startAmbient();
    } else {
      window.soundEngine.stopAmbient();
    }

    // Check round over
    if ((state.state === 'ROUND_OVER' || state.state === 'GAME_OVER') && state.roundResults) {
      if (!window.roundResultModalActive) {
        window.roundResultModalActive = true;
        setTimeout(() => {
          ui.showRoundResultModal(state.roundResults, () => {
            window.roundResultModalActive = false;
            localStorage.removeItem('okey101_active_room');
            if (roomId) {
              socket.emit('leaveRoom', { roomId, userId: getUserId() });
            }
            roomId = null;
            currentGameState = null;
            updateDocumentTitle(false);
            showLobby();
          });
        }, 500);
      }
    } else if (state.state === 'PLAYING') {
      window.roundResultModalActive = false;
    }

    if (state.state === 'PLAYING') {
      startTurnTimerLoop();
    } else {
      stopTurnTimerLoop();
    }

    // Update Action Bar States
    updateActionBarUI();
  });

  // Turn Timer Animation Loop (30s clock with last 5s gentle countdown tick)
  let turnTimerLoop = null;
  let lastTickedSecond = null;
  function startTurnTimerLoop() {
    if (turnTimerLoop) return;
    lastTickedSecond = null;
    turnTimerLoop = setInterval(() => {
      if (!currentGameState || currentGameState.state !== 'PLAYING') {
        const myTimerBar = document.getElementById('my-turn-timer-bar');
        if (myTimerBar) myTimerBar.classList.add('hidden');
        return;
      }

      const turnStartTime = currentGameState.turnStartTime || Date.now();
      const turnDuration = currentGameState.turnDuration || 30000;
      const elapsed = Date.now() - turnStartTime;
      const progress = Math.max(0, Math.min(1, elapsed / turnDuration));
      const remainingRatio = Math.max(0, Math.min(1, 1 - progress));
      const remainingSeconds = Math.ceil((turnDuration - elapsed) / 1000);

      // 1. My Turn Timer Flow Bar (Between Green Felt Canvas & Brown Istaka)
      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const myTimerBar = document.getElementById('my-turn-timer-bar');
      const myTimerFill = document.getElementById('my-turn-timer-fill');

      if (myTimerBar && myTimerFill) {
        if (isMyTurn) {
          myTimerBar.classList.remove('hidden');
          // Smooth flow from left to right: expands across width as turn progresses
          myTimerFill.style.width = (progress * 100) + '%';
          if (progress >= 0.75) {
            myTimerBar.classList.add('warning');
          } else {
            myTimerBar.classList.remove('warning');
          }

          // Son 5 saniye nazik uyarı tınısı (Yalnızca sıra bendeyken ve son 5 saniyede)
          if (remainingSeconds <= 5 && remainingSeconds > 0) {
            if (lastTickedSecond !== remainingSeconds) {
              lastTickedSecond = remainingSeconds;
              window.soundEngine.playTimerTick(remainingSeconds);
            }
          }
        } else {
          myTimerBar.classList.add('hidden');
          myTimerBar.classList.remove('warning');
          lastTickedSecond = null;
        }
      }

      // 2. Other Players Turn Progress Bars
      ['top', 'left', 'right'].forEach(pos => {
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
    lastTickedSecond = null;
    const myTimerBar = document.getElementById('my-turn-timer-bar');
    if (myTimerBar) {
      myTimerBar.classList.add('hidden');
      myTimerBar.classList.remove('warning');
    }
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
      if (!currentGameState || btnOpenHand.disabled) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      if (!isFirstOpen && viewerPlayer.openType === 'pairs') {
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
            ui.showToast('Yandan çektiğiniz taşı kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
          }
          return;
        }
      }

      if (meldIdArrays.length === 0) {
        return;
      }

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

  // Smart Open Pairs Button
  if (btnOpenPairs) {
    btnOpenPairs.addEventListener('click', () => {
      if (!currentGameState || btnOpenPairs.disabled) return;

      const isMyTurn = currentGameState.currentTurn === viewerSeatIndex;
      const viewerPlayer = currentGameState.players[viewerSeatIndex];
      const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;

      const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p.opened && p.openType === 'pairs');
      if (!isFirstOpen && viewerPlayer && viewerPlayer.openType === 'seri' && !hasPairsOnTable) {
        return;
      }

      const minPairs = isFirstOpen ? (currentGameState.minOpenPairs || 5) : 1;
      const requiredId = (isMyTurn && isFirstOpen && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex) ? currentGameState.drawnFromDiscard.tileId : null;

      // Analyze 2-tile pair groups currently arranged on the istaka rack
      const rackPairs = istaka.analyzeRackPairs();
      const containsRequired = !requiredId || !isFirstOpen || rackPairs.validTileIds.has(requiredId);

      if (rackPairs.validPairs.length < minPairs || !containsRequired) {
        const allPairsInHand = ClientValidator.findAllPairs(istaka.getAllTiles(), currentGameState.indicator, isFirstOpen ? requiredId : null);
        const containsRequiredInHand = !requiredId || !isFirstOpen || allPairsInHand.some(p => p[0].id === requiredId || p[1].id === requiredId);

        if (allPairsInHand.length >= minPairs && containsRequiredInHand) {
          ui.showToast(`Çift açmak için en az ${minPairs} çifti ıstakanızda 2'şerli kümeler halinde dizmelisiniz (veya 'Çift Diz' butonunu kullanınız).`, 'warning', 4000);
        } else if (requiredId && isFirstOpen && !containsRequired) {
          ui.showToast('Yandan çektiğiniz taşı açtığınız çiftlerde kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
        } else {
          ui.showToast(`Çift açmak için en az ${minPairs} çiftiniz olmalıdır. (Dizili: ${rackPairs.validPairs.length})`, 'error', 3000);
        }
        return;
      }

      const pairIdArrays = rackPairs.validPairs.map(p => [p[0].id, p[1].id]);

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
    const isFirstOpen = viewerPlayer ? !viewerPlayer.opened : true;
    const minScore = isFirstOpen ? (currentGameState.minOpenScore || 101) : 0;
    const minPairs = isFirstOpen ? (currentGameState.minOpenPairs || 5) : 1;

    const cannotOpenSeri = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'pairs';
    const hasPairsOnTable = currentGameState.tableMelds.some(m => m.type === 'pairs') || currentGameState.players.some(p => p.opened && p.openType === 'pairs');
    const cannotOpenPairs = viewerPlayer && viewerPlayer.opened && viewerPlayer.openType === 'seri' && !hasPairsOnTable;

    const hasDrawnFromDiscard = isMyTurn && turnState === 'DISCARD' && currentGameState.drawnFromDiscard && currentGameState.drawnFromDiscard.playerIndex === viewerSeatIndex;
    const requiredId = (hasDrawnFromDiscard && isFirstOpen) ? currentGameState.drawnFromDiscard.tileId : null;

    let canOpenSeri = false;
    let canOpenPairs = false;

    if (isMyTurn && turnState === 'DISCARD' && !cannotOpenSeri) {
      const rackAnalysis = istaka.analyzeRackMelds();
      const containsRequired = !requiredId || !isFirstOpen || rackAnalysis.validTileIds.has(requiredId);
      if (rackAnalysis.validMelds.length > 0 && rackAnalysis.totalScore >= minScore && containsRequired) {
        canOpenSeri = true;
      } else {
        const best = istaka.getBestHandMelds(isFirstOpen ? requiredId : null);
        if (best && best.melds && best.melds.length > 0 && (best.score >= minScore || !isFirstOpen)) {
          canOpenSeri = true;
        }
      }
    }

    if (isMyTurn && turnState === 'DISCARD' && !cannotOpenPairs) {
      const rackPairs = istaka.analyzeRackPairs();
      const containsRequiredPair = !requiredId || !isFirstOpen || rackPairs.validTileIds.has(requiredId);
      if (rackPairs.validPairs.length >= minPairs && containsRequiredPair) {
        canOpenPairs = true;
      }
    }

    if (btnOpenHand) {
      btnOpenHand.disabled = !canOpenSeri;
      btnOpenHand.title = cannotOpenSeri
        ? 'Çift açtığınız için seri açamazsınız'
        : (canOpenSeri ? 'Elinizi seri olarak açın' : (isFirstOpen ? `Seri açmak için en az ${minScore} puanlık per oluşturmalısınız` : 'Geçerli bir per oluşturmalısınız'));
    }
    if (btnOpenPairs) {
      btnOpenPairs.disabled = !canOpenPairs;
      btnOpenPairs.title = cannotOpenPairs
        ? 'Masada çift açmış bir oyuncu olmadığı için çift açamazsınız'
        : (canOpenPairs ? 'Dizili çiftlerinizi açın' : (isFirstOpen ? `Çift açmak için en az ${minPairs} çifti 2'şerli kümeler halinde dizmelisiniz` : '2\'li çift kümesi oluşturmalısınız'));
    }

    // Show "Taşı Geri Bırak" only if viewer has drawn from discard and hasn't opened/discarded yet
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

    // Calculate total sum of remaining tiles in hand (Okey = 25, others = number)
    const handSum = allTiles.reduce((sum, t) => {
      const p = ClientValidator.getTileProps(t, currentGameState.indicator);
      return sum + (p.isOkey ? 25 : (p.number || 0));
    }, 0);

    // CASE 1: Player ALREADY OPENED with PAIRS (Çift Açmış Oyuncu)
    if (!isFirstOpen && viewerPlayer && viewerPlayer.openType === 'pairs') {
      pointsBadge.className = 'points-badge points-penalty-active';
      pointsBadge.innerHTML = `💎 Çift Açıldı (Kalan Ceza: <strong>${handSum}</strong> Puan)`;
      updateActionBarUI();
      return;
    }

    // CASE 2: Player ALREADY OPENED with SERI (Seri Açmış Oyuncu)
    if (!isFirstOpen && viewerPlayer && viewerPlayer.openType === 'seri') {
      const score = (rackAnalysis && rackAnalysis.validMelds && rackAnalysis.validMelds.length > 0) ? rackAnalysis.totalScore : 0;
      if (score > 0) {
        pointsBadge.className = 'points-badge points-valid';
        pointsBadge.innerHTML = `Açılacak Per: <strong>${score}</strong> Puan`;
      } else {
        pointsBadge.className = 'points-badge points-penalty-active';
        pointsBadge.innerHTML = `Kalan Ceza: <strong>${handSum}</strong> Puan`;
      }
      updateActionBarUI();
      return;
    }

    // CASE 3: Player has NOT OPENED YET (İlk Açılış Aşaması)
    // 3A. Check Per Score on rack
    const score = (rackAnalysis && rackAnalysis.validMelds && rackAnalysis.validMelds.length > 0) ? rackAnalysis.totalScore : 0;
    if (score > 0) {
      const includesRequired = !requiredId || rackAnalysis.validTileIds.has(requiredId);
      const isSufficient = score >= minScore && includesRequired;

      pointsBadge.className = isSufficient ? 'points-badge points-valid' : 'points-badge points-pending';
      pointsBadge.innerHTML = `Per: <strong>${score}</strong> / ${minScore}`;
      updateActionBarUI();
      return;
    }

    // 3B. Check Pairs arranged on rack
    const rackPairs = istaka.analyzeRackPairs();
    const containsRequiredPair = !requiredId || rackPairs.validTileIds.has(requiredId);

    if (rackPairs.validPairs.length >= 5 && containsRequiredPair) {
      const pairedIds = rackPairs.validTileIds;
      const leftoverTiles = allTiles.filter(t => !pairedIds.has(t.id));
      const penaltyScore = leftoverTiles.reduce((sum, t) => {
        const p = ClientValidator.getTileProps(t, currentGameState.indicator);
        return sum + (p.isOkey ? 25 : (p.number || 0));
      }, 0);

      pointsBadge.className = 'points-badge points-penalty-active';
      pointsBadge.innerHTML = `💎 ${rackPairs.validPairs.length} Çift (Kalan Ceza: <strong>${penaltyScore}</strong> Puan)`;
      updateActionBarUI();
      return;
    }

    // 3C. Default: Per is 0
    pointsBadge.className = 'points-badge points-empty';
    pointsBadge.innerHTML = `Per: <strong>0</strong> / ${minScore}`;
    updateActionBarUI();
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

  // Sound Settings Modal & Controls (Synchronized between Lobby & Table)
  const soundModal = document.getElementById('sound-settings-modal');
  const btnCloseSound = document.getElementById('btn-close-sound-settings');
  const btnSaveSound = document.getElementById('btn-save-sound-settings');

  const sliderMaster = document.getElementById('slider-master-volume');
  const labelMaster = document.getElementById('label-master-volume');
  const btnMasterMute = document.getElementById('btn-toggle-master-mute');

  const sliderSfx = document.getElementById('slider-sfx-volume');
  const labelSfx = document.getElementById('label-sfx-volume');
  const btnToggleSfx = document.getElementById('btn-toggle-sfx');

  const sliderAmbient = document.getElementById('slider-ambient-volume');
  const labelAmbient = document.getElementById('label-ambient-volume');
  const btnToggleAmbient = document.getElementById('btn-toggle-ambient');

  const btnToggleTimerTick = document.getElementById('btn-toggle-timer-tick');

  const btnMute = document.getElementById('btn-toggle-sound');
  const btnLobbyMute = document.getElementById('btn-lobby-toggle-sound');
  const lobbySoundIcon = document.getElementById('lobby-sound-icon');
  const lobbySoundText = document.getElementById('lobby-sound-text');

  function updateSoundUI(isMuted) {
    if (btnMute) {
      btnMute.innerHTML = isMuted ? '<span>🔇 Ses Ayarları (Kapalı)</span>' : '<span>🔊 Ses Ayarları</span>';
    }
    if (lobbySoundIcon) {
      lobbySoundIcon.textContent = isMuted ? '🔇' : '🔊';
    }
    if (lobbySoundText) {
      lobbySoundText.textContent = isMuted ? 'Ses: Kapalı' : 'Ses Ayarları';
    }
  }

  function syncSoundSettingsModal() {
    const s = window.soundEngine.settings;
    if (sliderMaster) {
      sliderMaster.value = Math.round(s.masterVolume * 100);
      if (labelMaster) labelMaster.textContent = `${sliderMaster.value}%`;
    }
    if (btnMasterMute) {
      btnMasterMute.textContent = s.muted ? 'Kapalı' : 'Açık';
      btnMasterMute.className = 'btn-sound-toggle ' + (s.muted ? 'muted' : 'active');
    }

    if (sliderSfx) {
      sliderSfx.value = Math.round(s.sfxVolume * 100);
      if (labelSfx) labelSfx.textContent = `${sliderSfx.value}%`;
    }
    if (btnToggleSfx) {
      btnToggleSfx.textContent = s.sfxEnabled ? 'Açık' : 'Kapalı';
      btnToggleSfx.className = 'btn-sound-toggle ' + (s.sfxEnabled ? 'active' : 'muted');
    }

    if (sliderAmbient) {
      sliderAmbient.value = Math.round(s.ambientVolume * 100);
      if (labelAmbient) labelAmbient.textContent = `${sliderAmbient.value}%`;
    }
    if (btnToggleAmbient) {
      btnToggleAmbient.textContent = s.ambientEnabled ? 'Açık' : 'Kapalı';
      btnToggleAmbient.className = 'btn-sound-toggle ' + (s.ambientEnabled ? 'active' : 'muted');
    }

    if (btnToggleTimerTick) {
      btnToggleTimerTick.textContent = s.timerAlertEnabled ? 'Açık' : 'Kapalı';
      btnToggleTimerTick.className = 'btn-sound-toggle ' + (s.timerAlertEnabled ? 'active' : 'muted');
    }

    updateSoundUI(s.muted);
  }

  function openSoundSettingsModal() {
    window.soundEngine.init();
    syncSoundSettingsModal();
    if (soundModal) soundModal.classList.remove('hidden');
  }

  function closeSoundSettingsModal() {
    if (soundModal) soundModal.classList.add('hidden');
  }

  if (sliderMaster) {
    sliderMaster.addEventListener('input', () => {
      window.soundEngine.settings.masterVolume = parseInt(sliderMaster.value) / 100;
      if (labelMaster) labelMaster.textContent = `${sliderMaster.value}%`;
      window.soundEngine.saveSettings();
      window.soundEngine.updateAmbientVolume();
    });
    sliderMaster.addEventListener('change', () => {
      window.soundEngine.playDiscard();
    });
  }

  if (btnMasterMute) {
    btnMasterMute.addEventListener('click', () => {
      window.soundEngine.toggleMute();
      syncSoundSettingsModal();
      if (!window.soundEngine.settings.muted) {
        window.soundEngine.playDiscard();
      }
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener('input', () => {
      window.soundEngine.settings.sfxVolume = parseInt(sliderSfx.value) / 100;
      if (labelSfx) labelSfx.textContent = `${sliderSfx.value}%`;
      window.soundEngine.saveSettings();
    });
    sliderSfx.addEventListener('change', () => {
      window.soundEngine.playDiscard();
    });
  }

  if (btnToggleSfx) {
    btnToggleSfx.addEventListener('click', () => {
      window.soundEngine.settings.sfxEnabled = !window.soundEngine.settings.sfxEnabled;
      window.soundEngine.saveSettings();
      syncSoundSettingsModal();
      if (window.soundEngine.settings.sfxEnabled) {
        window.soundEngine.playDiscard();
      }
    });
  }

  if (sliderAmbient) {
    sliderAmbient.addEventListener('input', () => {
      window.soundEngine.settings.ambientVolume = parseInt(sliderAmbient.value) / 100;
      if (labelAmbient) labelAmbient.textContent = `${sliderAmbient.value}%`;
      window.soundEngine.saveSettings();
      window.soundEngine.updateAmbientVolume();
    });
    sliderAmbient.addEventListener('change', () => {
      window.soundEngine._playTeaTinkle();
    });
  }

  if (btnToggleAmbient) {
    btnToggleAmbient.addEventListener('click', () => {
      window.soundEngine.settings.ambientEnabled = !window.soundEngine.settings.ambientEnabled;
      window.soundEngine.saveSettings();
      if (window.soundEngine.settings.ambientEnabled && !window.soundEngine.settings.muted) {
        window.soundEngine.startAmbient();
        window.soundEngine._playTeaTinkle();
      } else {
        window.soundEngine.stopAmbient();
      }
      syncSoundSettingsModal();
    });
  }

  if (btnToggleTimerTick) {
    btnToggleTimerTick.addEventListener('click', () => {
      window.soundEngine.settings.timerAlertEnabled = !window.soundEngine.settings.timerAlertEnabled;
      window.soundEngine.saveSettings();
      syncSoundSettingsModal();
      if (window.soundEngine.settings.timerAlertEnabled) {
        window.soundEngine.playTimerTick(10);
      }
    });
  }

  if (btnCloseSound) btnCloseSound.addEventListener('click', closeSoundSettingsModal);
  if (btnSaveSound) btnSaveSound.addEventListener('click', closeSoundSettingsModal);
  if (soundModal) {
    soundModal.addEventListener('click', (e) => {
      if (e.target === soundModal) closeSoundSettingsModal();
    });
  }

  if (btnMute) btnMute.addEventListener('click', openSoundSettingsModal);
  if (btnLobbyMute) btnLobbyMute.addEventListener('click', openSoundSettingsModal);

  // Initialize Sound UI on load
  syncSoundSettingsModal();
});
