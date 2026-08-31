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

  // --- Auth Views & Tabs ---
  const authView = document.getElementById('auth-view');
  const lobbyView = document.getElementById('lobby-view');
  const gameView = document.getElementById('game-view');

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  function showLobby() {
    if (authView) authView.classList.add('hidden');
    if (gameView) gameView.classList.add('hidden');
    if (lobbyView) lobbyView.classList.remove('hidden');
    socket.emit('lobby:join');
  }

  function showAuth() {
    if (lobbyView) lobbyView.classList.add('hidden');
    if (gameView) gameView.classList.add('hidden');
    if (authView) authView.classList.remove('hidden');
  }

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      if (formLogin) formLogin.classList.remove('hidden');
      if (formRegister) formRegister.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      if (formRegister) formRegister.classList.remove('hidden');
      if (formLogin) formLogin.classList.add('hidden');
    });
  }

  function handleLoginSuccess(user, token) {
    currentUser = user;
    if (token) {
      localStorage.setItem('okey101_auth_token', token);
    }
    localStorage.setItem('okey101_user', JSON.stringify(user));
    currentActivePlayerName = user.displayName || user.username;
    updateDocumentTitle(false);

    // Update Lobby UI
    updateLobbyProfileUI();

    // Check if user was in an active game session (F5 reconnect)
    const savedActiveRoom = localStorage.getItem('okey101_active_room') || user.currentRoomId;
    if (savedActiveRoom) {
      socket.emit('reconnectRoom', { roomId: savedActiveRoom, userId: user.id }, (res) => {
        if (res.success) {
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

      const editName = document.getElementById('edit-display-name').value.trim();
      if (!editName) {
        ui.showToast('Lütfen geçerli bir isim girin.', 'error');
        return;
      }

      socket.emit('auth:updateProfile', {
        userId: currentUser.id,
        displayName: editName,
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

  // Login Form Submit
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      socket.emit('auth:login', { username, password }, (res) => {
        if (res.success) {
          ui.showToast(`Hoş geldin, ${res.user.displayName}!`, 'success');
          handleLoginSuccess(res.user, res.token);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Register Form Submit
  if (formRegister) {
    formRegister.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const displayName = document.getElementById('reg-nickname').value.trim();
      const password = document.getElementById('reg-password').value;
      const gender = (document.querySelector('input[name="reg-gender"]:checked') || {}).value || 'male';

      socket.emit('auth:register', { username, password, displayName, gender }, (res) => {
        if (res.success) {
          ui.showToast('Hesabınız başarıyla oluşturuldu!', 'success');
          handleLoginSuccess(res.user, res.token);
        } else {
          ui.showToast(res.reason, 'error');
        }
      });
    });
  }

  // Quick Guest Play
  const btnGuest = document.getElementById('btn-guest-play');
  if (btnGuest) {
    btnGuest.addEventListener('click', () => {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const username = `misafir_${randNum}`;
      const displayName = `Misafir ${randNum}`;
      const password = `guest_${randNum}_pwd`;

      socket.emit('auth:register', { username, password, displayName, gender: 'male' }, (res) => {
        if (res.success) {
          ui.showToast(`Misafir girişi yapıldı! (${displayName})`, 'success');
          handleLoginSuccess(res.user, res.token);
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
      localStorage.removeItem('okey101_auth_token');
      localStorage.removeItem('okey101_user');
      localStorage.removeItem('okey101_active_room');
      currentUser = null;
      showAuth();
      ui.showToast('Oturum kapatıldı.', 'info');
    });
  }

  // Auto-login on Page Load
  const storedToken = localStorage.getItem('okey101_auth_token');
  if (storedToken) {
    socket.emit('auth:autoLogin', { token: storedToken }, (res) => {
      if (res.success) {
        handleLoginSuccess(res.user, null);
      } else {
        localStorage.removeItem('okey101_auth_token');
        showAuth();
      }
    });
  } else {
    showAuth();
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

    const seatLabels = ['1. KOLTUĞA OTUR', 'SAĞA OTUR', 'KARŞIYA OTUR', 'SOLA OTUR'];

    [0, 1, 2, 3].forEach(seatIdx => {
      const podEl = document.getElementById(`lobby-seat-${seatIdx}`);
      if (!podEl) return;
      const seatInfo = tableData.seats ? tableData.seats[seatIdx] : null;

      if (seatInfo) {
        // Seat is occupied
        const isMe = (mySeatedIndex === seatIdx);
        const avatarSvg = (typeof window.getPlayerAvatarSVG === 'function')
          ? window.getPlayerAvatarSVG(seatInfo.name, seatInfo.gender, seatInfo.avatarIndex)
          : '👤';

        podEl.innerHTML = `
          <div class="lobby-occupied-card ${isMe ? 'is-me' : ''}">
            <div class="lobby-occupied-avatar">${avatarSvg}</div>
            <div class="lobby-occupied-info">
              <span class="lobby-occupied-name" title="${seatInfo.name}">${seatInfo.name}${isMe ? ' (Siz)' : ''}</span>
              <span class="lobby-occupied-badge">${seatInfo.isBot ? '🤖 Bot' : '🟢 Hazır'}</span>
            </div>
            ${isMe && tableData.state === 'WAITING' ? '<button class="btn-leave-seat-pill" title="Koltuktan Kalk">❌ Kalk</button>' : ''}
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
        localStorage.setItem('okey101_active_room', res.roomId);
        ui.showToast('Koltuğa oturdunuz. Diğer oyuncular bekleniyor...', 'info');
      } else {
        ui.showToast(res.reason, 'error');
      }
    });
  }

  socket.on('lobby:stateUpdate', (data) => {
    updateLobbyVirtualTable(data);
  });

  // Play vs Bots (Single Player Bot Practice)
  const btnPlayBots = document.getElementById('btn-play-bots');
  if (btnPlayBots) {
    btnPlayBots.addEventListener('click', () => {
      const name = getPlayerName();
      const userId = getUserId();
      const user = currentUser || {};

      socket.emit('createBotRoom', {
        playerName: name,
        userId,
        gender: user.gender,
        avatarIndex: user.avatarIndex
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

  const btnLobbyCopy = document.getElementById('btn-lobby-copy');
  if (btnLobbyCopy) {
    btnLobbyCopy.addEventListener('click', () => {
      if (roomId && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomId).then(() => {
          ui.showToast(`Oda kodu kopyalandı! (${roomId})`, 'success');
        });
      }
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
      localStorage.removeItem('okey101_active_room');
      if (roomId) {
        socket.emit('leaveRoom', { roomId, userId: getUserId() });
      }
      roomId = null;
      currentGameState = null;
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
    if (authView) authView.classList.add('hidden');
    if (lobbyView) lobbyView.classList.add('hidden');
    if (gameView) gameView.classList.remove('hidden');

    const codeEl = document.getElementById('display-room-code');
    if (codeEl) codeEl.textContent = roomId;
    const cardCode = document.getElementById('lobby-card-room-code');
    if (cardCode) cardCode.textContent = roomId;
    if (btnStartGame) btnStartGame.classList.toggle('hidden', !isHost);
  }

  // --- Socket.IO Game State Updates ---
  socket.on('gameStateUpdate', (state) => {
    currentGameState = state;

    // Transition from lobby to game table when round starts
    if (state.state === 'PLAYING') {
      const mySeat = state.players.findIndex(p => p && ((currentUser && p.userId === currentUser.id) || p.id === socket.id));
      if (mySeat !== -1) {
        viewerSeatIndex = mySeat;
        roomId = state.id || currentLobbyTableId;
        localStorage.setItem('okey101_active_room', roomId);
        table.setViewerSeatIndex(viewerSeatIndex);
        if (authView) authView.classList.add('hidden');
        if (lobbyView) lobbyView.classList.add('hidden');
        if (gameView) gameView.classList.remove('hidden');
      }
    }

    table.setViewerSeatIndex(viewerSeatIndex);
    istaka.setIndicator(state.indicator);

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

    // Turn change sound alert & dynamic title
    const isMyTurn = state.currentTurn === viewerSeatIndex && state.state === 'PLAYING';
    updateDocumentTitle(isMyTurn);

    if (isMyTurn && lastTurn !== viewerSeatIndex) {
      window.soundEngine.playYourTurn();
    }
    lastTurn = state.currentTurn;

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
          ui.showToast('Yandan çektiğiniz taşı kullanmalısınız veya geri bırakmalısınız.', 'error', 3500);
        }
        return;
      }

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
        window.soundEngine.playDraw();
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
        window.soundEngine.playDraw();
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
