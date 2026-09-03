/**
 * UI Manager for 101 Okey
 * Handles Modals, Lobby, Scoreboards, Chat, Floating Reactions, Toasts
 */
class UIManager {
  constructor() {
    this.currentView = 'lobby'; // 'lobby' | 'game'
  }

  escapeHTML(value) {
    const el = document.createElement('div');
    el.textContent = String(value == null ? '' : value);
    return el.innerHTML;
  }

  showView(viewName) {
    this.currentView = viewName;
    const lobbyView = document.getElementById('lobby-view');
    const gameView = document.getElementById('game-view');

    if (viewName === 'lobby') {
      lobbyView.classList.remove('hidden');
      gameView.classList.add('hidden');
    } else {
      lobbyView.classList.add('hidden');
      gameView.classList.remove('hidden');
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Maximum 3 toasts: remove oldest when exceeding limit
    while (container.children.length >= 3) {
      container.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;
    toast.innerHTML = `
      <div class="toast-content" style="display: flex; align-items: center; gap: 8px;">
        <span class="toast-icon">${type === 'error' ? '⚠️' : type === 'success' ? '🎉' : 'ℹ️'}</span>
        <span class="toast-text">${this.escapeHTML(message)}</span>
      </div>
    `;

    container.appendChild(toast);

    if (type === 'error') {
      window.soundEngine.playPenalty();
    }

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-fade-out');
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 300);
      }
    }, duration);
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  showRoundResultModal(results, onNextRoundCallback) {
    const modal = document.getElementById('round-result-modal');
    if (!modal) return;

    const content = document.getElementById('round-result-content');
    if (!content) return;

    const t1 = results.teamResults ? results.teamResults.team1 : null;
    const t2 = results.teamResults ? results.teamResults.team2 : null;
    const roundScores = results.roundScores || {};

    const renderPlayerCard = (playerName) => {
      if (!playerName) return '';
      const pEntry = Object.values(roundScores).find(p => p.name === playerName) || {};
      const points = pEntry.points !== undefined ? pEntry.points : 0;
      const isFinisher = pEntry.isFinisher || points < 0;
      const isPartner = pEntry.isPartner;
      const penaltyPoints = pEntry.penaltyPoints || 0;
      const basePoints = pEntry.basePoints !== undefined ? pEntry.basePoints : points;

      let statusText = '';
      if (isFinisher) {
        if (results.isEldenBitme) {
          statusText = results.isOkeyDiscard ? '🚀🔥 Okey + Elden Bitti (-1212)' : '🚀 Elden Bitti (-606)';
        } else if (results.isOkeyDiscard) {
          statusText = '🔥 Okey ile Bitti (-202)';
        } else {
          statusText = '🏆 Bitti (-101)';
        }
      } else if (isPartner) {
        statusText = '🤝 Ortağı Bitti (0)';
      } else if (pEntry.opened) {
        if (pEntry.openType === 'pairs') {
          statusText = `Çift Açtı (Kalan x2: ${basePoints})`;
        } else {
          statusText = `Açtı (Kalan: ${basePoints})`;
        }
      } else {
        statusText = results.isEldenBitme ? `Açmadı (+${basePoints} Elden Bitme)` : `Açmadı (+202)`;
      }

      const pointStyle = points <= 0 ? 'color: #2ecc71; font-weight: 900;' : 'color: #f1c40f; font-weight: 800;';

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 10px;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #fff;">${playerName}</div>
            <div style="font-size: 11px; color: #bdc3c7; margin-top: 2px;">${statusText}</div>
            ${penaltyPoints > 0 ? `<div style="font-size: 10px; color: #ff7675; font-weight: 800; margin-top: 2px;">⚠️ Oyun İçi Hata Cezası: +${penaltyPoints}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; ${pointStyle}">${points > 0 ? '+' : ''}${points}</div>
          </div>
        </div>
      `;
    };

    const isDraw = Boolean(results.isDraw || (results.teamResults && results.teamResults.isDraw));

    let html = `
      <div class="round-result-header" style="text-align: center; margin-bottom: 16px;">
        <h2 style="font-family: 'Cinzel', serif; font-size: 24px; font-weight: 900; color: #f1c40f; letter-spacing: 2px; margin: 0 0 6px 0;">OYUN BİTTİ</h2>
        ${isDraw ? '<div style="font-size: 15px; font-weight: 900; color: #f39c12;">🤝 MAÇ BERABERE BİTTİ!</div>' : (results.finisher ? `<div style="font-size: 13px; font-weight: 700; color: #a8d5ba;">${results.isEldenBitme ? '🚀' : '🎉'} <strong>${results.finisher}</strong> ${results.isEldenBitme ? 'elden bitirdi (-606 puan)!' : 'oyunu bitirdi!'}</div>` : `<div style="font-size: 13px; font-weight: 700; color: #bdc3c7;">${results.reason || 'Oyun Tamamlandı'}</div>`)}
        ${results.isEldenBitme ? '<span class="badge-okey-discard" style="display:inline-block; margin-top: 4px; background: linear-gradient(135deg, #e67e22, #d35400);">🚀 ELDEN BİTME (-606)</span>' : ''}
        ${results.isOkeyDiscard ? '<span class="badge-okey-discard" style="display:inline-block; margin-top: 4px;">🔥 OKEY ATTI (2x CEZA)</span>' : ''}
        ${results.isPairsFinish ? '<span class="badge-pairs-finish" style="display:inline-block; margin-top: 4px;">✨ ÇİFT BİTTİ</span>' : ''}
      </div>

      <!-- 2 Side-by-Side Team Clusters -->
      <div class="team-clusters-wrapper" style="display: flex; gap: 14px; margin-bottom: 20px;">
        <!-- Left Cluster: Team 1 (Oyuncu 1 & 3) -->
        <div class="team-cluster-card ${t1 && t1.isWinner ? 'team-winner' : (isDraw ? 'team-draw' : '')}" style="flex: 1; border-radius: 18px; padding: 14px; background: ${t1 && t1.isWinner ? 'radial-gradient(ellipse at center, rgba(16, 102, 58, 0.6) 0%, rgba(7, 46, 26, 0.8) 100%)' : (isDraw ? 'rgba(243, 156, 18, 0.15)' : 'rgba(0, 0, 0, 0.45)')}; border: 2px solid ${t1 && t1.isWinner ? '#2ecc71' : (isDraw ? '#f39c12' : 'rgba(255, 255, 255, 0.12)')}; position: relative; box-shadow: ${t1 && t1.isWinner ? '0 0 25px rgba(46, 204, 113, 0.4), inset 0 0 15px rgba(46, 204, 113, 0.2)' : 'none'};">
          ${t1 && t1.isWinner ? '<div style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #2ecc71, #27ae60); color: #fff; font-size: 11px; font-weight: 900; padding: 3px 14px; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid #fff;">🏆 KAZANAN</div>' : (isDraw ? '<div style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; font-size: 11px; font-weight: 900; padding: 3px 14px; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid #fff;">🤝 BERABERE</div>' : '')}
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: ${(t1 && t1.isWinner) || isDraw ? '6px' : '0'};">
            ${renderPlayerCard(t1 ? t1.players[0] : null)}
            ${renderPlayerCard(t1 ? t1.players[1] : null)}
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 800;">
            <span style="color: #bdc3c7;">Takım Toplamı:</span>
            <span style="color: ${t1 && t1.isWinner ? '#2ecc71' : (isDraw ? '#f39c12' : '#f1c40f')}; font-size: 15px; font-weight: 900;">${t1 ? (t1.score > 0 ? `+${t1.score}` : `${t1.score}`) : 0}</span>
          </div>
        </div>

        <!-- Right Cluster: Team 2 (Oyuncu 2 & 4) -->
        <div class="team-cluster-card ${t2 && t2.isWinner ? 'team-winner' : (isDraw ? 'team-draw' : '')}" style="flex: 1; border-radius: 18px; padding: 14px; background: ${t2 && t2.isWinner ? 'radial-gradient(ellipse at center, rgba(16, 102, 58, 0.6) 0%, rgba(7, 46, 26, 0.8) 100%)' : (isDraw ? 'rgba(243, 156, 18, 0.15)' : 'rgba(0, 0, 0, 0.45)')}; border: 2px solid ${t2 && t2.isWinner ? '#2ecc71' : (isDraw ? '#f39c12' : 'rgba(255, 255, 255, 0.12)')}; position: relative; box-shadow: ${t2 && t2.isWinner ? '0 0 25px rgba(46, 204, 113, 0.4), inset 0 0 15px rgba(46, 204, 113, 0.2)' : 'none'};">
          ${t2 && t2.isWinner ? '<div style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #2ecc71, #27ae60); color: #fff; font-size: 11px; font-weight: 900; padding: 3px 14px; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid #fff;">🏆 KAZANAN</div>' : (isDraw ? '<div style="position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; font-size: 11px; font-weight: 900; padding: 3px 14px; border-radius: 12px; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid #fff;">🤝 BERABERE</div>' : '')}
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: ${(t2 && t2.isWinner) || isDraw ? '6px' : '0'};">
            ${renderPlayerCard(t2 ? t2.players[0] : null)}
            ${renderPlayerCard(t2 ? t2.players[1] : null)}
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 800;">
            <span style="color: #bdc3c7;">Takım Toplamı:</span>
            <span style="color: ${t2 && t2.isWinner ? '#2ecc71' : (isDraw ? '#f39c12' : '#f1c40f')}; font-size: 15px; font-weight: 900;">${t2 ? (t2.score > 0 ? `+${t2.score}` : `${t2.score}`) : 0}</span>
          </div>
        </div>
      </div>

      <div class="round-result-actions" style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
        <button id="btn-vote-rematch" class="btn-plus-gold" style="flex: 2; padding: 12px 18px; font-size: 14px; font-weight: 900;">
          🔄 Tekrar Oyna
        </button>
        <button id="btn-result-leave" class="btn-danger-action" style="flex: 1; padding: 12px 14px; font-size: 13px; font-weight: 800; border-radius: 14px; background: rgba(231,76,60,0.3); border: 1.5px solid #e74c3c; color: #ff7675; cursor: pointer;">
          🚪 Masadan Ayrıl
        </button>
      </div>
    `;

    content.innerHTML = html;
    modal.classList.remove('hidden');

    const rematchBtn = document.getElementById('btn-vote-rematch');
    const leaveBtn = document.getElementById('btn-result-leave');

    if (rematchBtn) {
      rematchBtn.addEventListener('click', () => {
        rematchBtn.disabled = true;
        rematchBtn.innerHTML = '⏳ Hazırsınız! Diğer Oyuncular Bekleniyor...';
        rematchBtn.style.opacity = '0.85';
        if (onNextRoundCallback) onNextRoundCallback('rematch');
      });
    }

    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (onNextRoundCallback) onNextRoundCallback('leave');
      });
    }

    try {
      if (window.soundEngine && typeof window.soundEngine.playVictory === 'function') {
        window.soundEngine.playVictory();
      }
    } catch (e) {}
  }

  showGameOverModal(totalScores) {
    const modal = document.getElementById('game-over-modal');
    if (!modal) return;

    const content = document.getElementById('game-over-content');
    if (!content) return;

    // Sort by lowest score (in 101 Okey lower score wins)
    const sorted = [...totalScores].sort((a, b) => a.score - b.score);
    const winner = sorted[0];

    let html = `
      <div class="game-over-header">
        <div class="trophy-icon">🏆</div>
        <h2>OYUN BİTTİ!</h2>
        <p class="winner-announce">Tebrikler <strong>${winner.name}</strong> Şampiyon Oldu!</p>
      </div>
      <div class="final-ranking">
    `;

    sorted.forEach((p, idx) => {
      html += `
        <div class="rank-item rank-${idx + 1}">
          <span class="rank-pos">#${idx + 1}</span>
          <span class="rank-name">${p.name}</span>
          <span class="rank-score">${p.score} Ceza Puanı</span>
        </div>
      `;
    });

    html += `
      </div>
      <div class="game-over-actions">
        <button onclick="window.location.reload()" class="btn-primary">Ana Menüye Dön</button>
      </div>
    `;

    content.innerHTML = html;
    modal.classList.remove('hidden');
    window.soundEngine.playVictory();
  }

  triggerReaction(seatPosition, emoji, label) {
    const seatEl = document.getElementById(`seat-${seatPosition}`);
    if (!seatEl) return;

    const bubble = document.createElement('div');
    bubble.className = 'reaction-bubble animate-bounce-float';
    const emojiEl = document.createElement('span');
    emojiEl.className = 'reaction-emoji';
    emojiEl.textContent = String(emoji || '');
    bubble.appendChild(emojiEl);
    if (label) {
      const labelEl = document.createElement('span');
      labelEl.className = 'reaction-label';
      labelEl.textContent = String(label);
      bubble.appendChild(labelEl);
    }

    seatEl.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 2500);
  }

  showSpeechBubble(seatPosition, text) {
    const seatEl = document.getElementById(`seat-${seatPosition}`);
    if (!seatEl) return;

    const bubbleHost = seatEl.querySelector('.avatar-ring-container') || seatEl;

    // Remove any previous speech bubble on this seat
    const prev = bubbleHost.querySelector('.chat-speech-bubble');
    if (prev) prev.remove();

    const bubble = document.createElement('div');
    bubble.className = 'chat-speech-bubble animate-pop-in';
    const textEl = document.createElement('span');
    textEl.className = 'speech-bubble-text';
    const fullText = String(text || '');
    textEl.textContent = fullText.length > 60 ? `${fullText.slice(0, 57)}...` : fullText;
    const pointer = document.createElement('div');
    pointer.className = 'speech-bubble-pointer';
    bubble.append(textEl, pointer);

    bubbleHost.appendChild(bubble);

    setTimeout(() => {
      if (bubble.parentNode) {
        bubble.classList.add('speech-bubble-fade-out');
        setTimeout(() => {
          if (bubble.parentNode) bubble.remove();
        }, 300);
      }
    }, 2500);
  }

  appendChatMessage(sender, text, time, isMe = false, isSystem = false) {
    const chatLogs = document.getElementById('chat-messages');
    if (!chatLogs) return;

    const welcome = chatLogs.querySelector('.chat-welcome-msg');
    if (welcome && chatLogs.children.length === 1) {
      welcome.remove();
    }

    const isSys = isSystem || sender === 'SİSTEM';
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message-item' + (isSys ? ' is-system-announcement' : (isMe ? ' is-me' : ''));
    msgEl.innerHTML = `
      <div class="chat-msg-header">
        <strong class="chat-sender">${isSys ? '📢 SİSTEM' : (isMe ? 'Siz' : this.escapeHTML(sender))}</strong>
        <span class="chat-time">${this.escapeHTML(time || '')}</span>
      </div>
      <span class="chat-text">${this.escapeHTML(text)}</span>
    `;

    chatLogs.appendChild(msgEl);
    chatLogs.scrollTop = chatLogs.scrollHeight;
  }
}

window.UIManager = UIManager;
