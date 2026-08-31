/**
 * UI Manager for 101 Okey
 * Handles Modals, Lobby, Scoreboards, Chat, Floating Reactions, Toasts
 */
class UIManager {
  constructor() {
    this.currentView = 'lobby'; // 'lobby' | 'game'
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
        <span class="toast-text">${message}</span>
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
    const currentRound = results.currentRound || 1;
    const targetRounds = results.targetRounds || 3;
    const hasNext = !!results.hasNextRound;

    let html = `
      <div class="round-result-header">
        <div style="font-size: 13px; font-weight: 800; color: #f1c40f; letter-spacing: 1px; margin-bottom: 4px;">
          ${hasNext ? `EL ${currentRound} / ${targetRounds} TAMAMLANDI` : `🏆 3. EL TAMAMLANDI (MAÇ BİTTİ)`}
        </div>
        <h3 style="font-size: 20px;">${results.finisher ? `🎉 ${results.finisher} Eli Bitirdi!` : `⏸️ ${results.reason || 'El Berabere Bitti'}`}</h3>
        ${results.isOkeyDiscard ? '<span class="badge-okey-discard">🔥 OKEY ATTI (2x CEZA)</span>' : ''}
        ${results.isPairsFinish ? '<span class="badge-pairs-finish">✨ ÇİFT BİTTİ (2x CEZA)</span>' : ''}
      </div>
    `;

    if (t1 && t2) {
      html += `
        <div class="team-results-box" style="background: rgba(0,0,0,0.6); border: 2px solid #f1c40f; border-radius: 14px; padding: 14px; margin: 14px 0; text-align: center;">
          <h4 style="color: #f1c40f; font-size: 15px; margin-bottom: 10px; letter-spacing: 0.5px;">🏆 TOPLAM EŞLİ SKOR</h4>
          <div style="display: flex; justify-content: space-around; gap: 12px; font-size: 13px; font-weight: 800;">
            <div style="flex: 1; padding: 10px; border-radius: 10px; background: ${t1.isWinner ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.05)'}; border: 1.5px solid ${t1.isWinner ? '#2ecc71' : 'rgba(255,255,255,0.1)'};">
              <div style="color: #fff; font-size: 14px; font-weight: 900;">${t1.players.filter(Boolean).join(' & ')}</div>
              <div style="font-size: 16px; color: ${t1.isWinner ? '#2ecc71' : '#f1c40f'}; margin-top: 6px;">${t1.score} Ceza ${t1.isWinner ? '👑 ÖNDE' : ''}</div>
            </div>
            <div style="flex: 1; padding: 10px; border-radius: 10px; background: ${t2.isWinner ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.05)'}; border: 1.5px solid ${t2.isWinner ? '#2ecc71' : 'rgba(255,255,255,0.1)'};">
              <div style="color: #fff; font-size: 14px; font-weight: 900;">${t2.players.filter(Boolean).join(' & ')}</div>
              <div style="font-size: 16px; color: ${t2.isWinner ? '#2ecc71' : '#f1c40f'}; margin-top: 6px;">${t2.score} Ceza ${t2.isWinner ? '👑 ÖNDE' : ''}</div>
            </div>
          </div>
        </div>
      `;
    }

    html += `
      <table class="scoreboard-table">
        <thead>
          <tr>
            <th>Sıra & Oyuncu</th>
            <th>Durum</th>
            <th>El Cezası</th>
          </tr>
        </thead>
        <tbody>
    `;

    const sortedEntries = Object.entries(results.roundScores || {}).sort(([, a], [, b]) => (a.points || 0) - (b.points || 0));
    const minPoint = sortedEntries.length > 0 ? (sortedEntries[0][1].points || 0) : 0;

    sortedEntries.forEach(([id, rData], idx) => {
      let statusText = '';
      const isWinner = (rData.points === minPoint);

      if (rData.points < 0) {
        statusText = '🏆 Bitti (-101)';
      } else if (rData.isPartner) {
        statusText = '🤝 Ortağı Bitti (0)';
      } else if (rData.opened) {
        statusText = rData.openType === 'pairs' ? `Çift (${(rData.handSum || 0) * 2})` : `Açtı (${rData.handSum || 0})`;
      } else {
        statusText = 'Açmadı (+202)';
      }

      if (rData.penaltyPoints && rData.penaltyPoints > 0) {
        statusText += ` <span style="color: #ff7675; font-weight: 900;">(+${rData.penaltyPoints} Ceza)</span>`;
      }

      if (isWinner && rData.points >= 0 && !rData.isPartner) {
        statusText += ' 👑';
      }

      html += `
        <tr class="${isWinner || rData.points < 0 || rData.isPartner ? 'winner-row' : ''}">
          <td class="player-col">
            <span style="font-weight: 800; color: ${isWinner ? '#2ecc71' : '#bdc3c7'}; margin-right: 6px;">#${idx + 1}</span>
            ${rData.name} ${isWinner ? '👑' : ''}
          </td>
          <td>${statusText}</td>
          <td class="points-col ${rData.points <= 0 ? 'negative-points' : ''}" style="${isWinner ? 'color: #2ecc71; font-weight: 900;' : ''}">${rData.points > 0 ? '+' : ''}${rData.points}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
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
    bubble.innerHTML = `
      <span class="reaction-emoji">${emoji}</span>
      ${label ? `<span class="reaction-label">${label}</span>` : ''}
    `;

    seatEl.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 2500);
  }

  appendChatMessage(sender, text, time, isMe = false) {
    const chatLogs = document.getElementById('chat-messages');
    if (!chatLogs) return;

    const welcome = chatLogs.querySelector('.chat-welcome-msg');
    if (welcome && chatLogs.children.length === 1) {
      welcome.remove();
    }

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message-item' + (isMe ? ' is-me' : '');
    msgEl.innerHTML = `
      <div class="chat-msg-header">
        <strong class="chat-sender">${isMe ? 'Siz' : sender}</strong>
        <span class="chat-time">${time || ''}</span>
      </div>
      <span class="chat-text">${text}</span>
    `;

    chatLogs.appendChild(msgEl);
    chatLogs.scrollTop = chatLogs.scrollHeight;
  }
}

window.UIManager = UIManager;
