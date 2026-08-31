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

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${type === 'error' ? '⚠️' : type === 'success' ? '🎉' : 'ℹ️'}</span>
        <span class="toast-text">${message}</span>
      </div>
    `;

    container.appendChild(toast);

    if (type === 'error') {
      window.soundEngine.playPenalty();
    }

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
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

    let html = `
      <div class="round-result-header">
        <h3>${results.finisher ? `🎉 ${results.finisher} Eli Bitirdi!` : `⏸️ ${results.reason || 'El Berabere Bitti'}`}</h3>
        ${results.isOkeyDiscard ? '<span class="badge-okey-discard">🔥 OKEY ATTI (2x CEZA)</span>' : ''}
        ${results.isPairsFinish ? '<span class="badge-pairs-finish">✨ ÇİFT BİTTİ (2x CEZA)</span>' : ''}
      </div>
    `;

    if (t1 && t2) {
      html += `
        <div class="team-results-box" style="background: rgba(0,0,0,0.6); border: 2px solid #f1c40f; border-radius: 14px; padding: 14px; margin: 14px 0; text-align: center;">
          <h4 style="color: #f1c40f; font-size: 16px; margin-bottom: 10px; letter-spacing: 0.5px;">🏆 EŞLİ MAÇ SKORU</h4>
          <div style="display: flex; justify-content: space-around; gap: 12px; font-size: 13px; font-weight: 800;">
            <div style="flex: 1; padding: 10px; border-radius: 10px; background: ${t1.isWinner ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.05)'}; border: 1.5px solid ${t1.isWinner ? '#2ecc71' : 'rgba(255,255,255,0.1)'};">
              <div style="color: #fff; font-size: 14px; font-weight: 900;">${t1.players.filter(Boolean).join(' & ')}</div>
              <div style="font-size: 16px; color: ${t1.isWinner ? '#2ecc71' : '#f1c40f'}; margin-top: 6px;">${t1.score} Ceza ${t1.isWinner ? '👑 KAZANDI' : ''}</div>
            </div>
            <div style="flex: 1; padding: 10px; border-radius: 10px; background: ${t2.isWinner ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255,255,255,0.05)'}; border: 1.5px solid ${t2.isWinner ? '#2ecc71' : 'rgba(255,255,255,0.1)'};">
              <div style="color: #fff; font-size: 14px; font-weight: 900;">${t2.players.filter(Boolean).join(' & ')}</div>
              <div style="font-size: 16px; color: ${t2.isWinner ? '#2ecc71' : '#f1c40f'}; margin-top: 6px;">${t2.score} Ceza ${t2.isWinner ? '👑 KAZANDI' : ''}</div>
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
            <th>Ceza Puanı</th>
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
        statusText = '🤝 Ortağı Bitti (0 Ceza)';
      } else if (rData.opened) {
        statusText = rData.openType === 'pairs' ? `Çift Açtı (2x: ${(rData.handSum || 0) * 2})` : `Açtı (${rData.handSum || 0} Kalan)`;
      } else {
        statusText = 'Açmadı (+202)';
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
      <div class="round-result-actions" style="margin-top: 14px; display: flex; justify-content: center;">
        <button id="btn-next-round" class="btn-plus-gold" style="padding: 10px 24px; width: 100%;">Yeni Maça Başla</button>
      </div>
    `;

    content.innerHTML = html;
    modal.classList.remove('hidden');

    const nextBtn = document.getElementById('btn-next-round');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (onNextRoundCallback) onNextRoundCallback();
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
