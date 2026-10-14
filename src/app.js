/**
 * ZenSolitaire UI Controller & Event System
 */

(function () {
  'use strict';

  const Logic = window.SolitaireLogic;
  const Audio = new window.SolitaireAudio();

  let game = null;
  let timerInterval = null;
  let secondsElapsed = 0;
  let timerStarted = false;
  let selectedCard = null; // { type: 'waste' | 'tableau' | 'foundation', colIndex, cardIndex, fIndex }
  let currentTheme = 'classic';
  let isAutoFinishing = false;

  // DOM Elements
  const stockSlot = document.getElementById('stock-slot');
  const stockCountEl = document.getElementById('stock-count');
  const wasteSlot = document.getElementById('waste-slot');
  const foundations = [
    document.getElementById('foundation-0'),
    document.getElementById('foundation-1'),
    document.getElementById('foundation-2'),
    document.getElementById('foundation-3')
  ];
  const tableaus = [
    document.getElementById('tableau-0'),
    document.getElementById('tableau-1'),
    document.getElementById('tableau-2'),
    document.getElementById('tableau-3'),
    document.getElementById('tableau-4'),
    document.getElementById('tableau-5'),
    document.getElementById('tableau-6')
  ];

  const scoreVal = document.getElementById('score-val');
  const movesVal = document.getElementById('moves-val');
  const timeVal = document.getElementById('time-val');

  const drawModeBtn = document.getElementById('draw-mode-btn');
  const hintBtn = document.getElementById('hint-btn');
  const undoBtn = document.getElementById('undo-btn');
  const soundBtn = document.getElementById('sound-btn');
  const themeBtn = document.getElementById('theme-btn');
  const statsBtn = document.getElementById('stats-btn');
  const newGameBtn = document.getElementById('new-game-btn');

  const autoFinishBar = document.getElementById('auto-finish-bar');
  const autoFinishBtn = document.getElementById('auto-finish-btn');

  // Modals
  const winModal = document.getElementById('win-modal');
  const playAgainBtn = document.getElementById('play-again-btn');
  const winScoreEl = document.getElementById('win-score');
  const winTimeEl = document.getElementById('win-time');
  const winMovesEl = document.getElementById('win-moves');
  const winStreakEl = document.getElementById('win-streak');

  const statsModal = document.getElementById('stats-modal');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const closeStatsActionBtn = document.getElementById('close-stats-action-btn');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  let confettiCtx = null;
  let confettiParticles = [];
  let confettiAnimId = null;

  // Load Saved Preferences
  function loadPreferences() {
    try {
      const savedTheme = localStorage.getItem('zensolitaire_theme') || 'classic';
      setTheme(savedTheme);

      const savedSound = localStorage.getItem('zensolitaire_sound');
      if (savedSound !== null) {
        Audio.setMuted(savedSound === 'false');
        soundBtn.textContent = Audio.isMuted() ? '🔇' : '🔊';
      }
    } catch (e) {}
  }

  function setTheme(theme) {
    currentTheme = theme;
    if (theme === 'classic') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
    try {
      localStorage.setItem('zensolitaire_theme', theme);
    } catch (e) {}
  }

  function cycleTheme() {
    Audio.ensureContext();
    Audio.playCardPlace();
    const themes = ['classic', 'midnight', 'indigo', 'cherry'];
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }

  // Timer
  function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const mins = Math.floor(secondsElapsed / 60);
      const secs = secondsElapsed % 60;
      timeVal.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }, 1000);
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    secondsElapsed = 0;
    timerStarted = false;
    timeVal.textContent = '0:00';
  }

  // Statistics
  function getStats() {
    try {
      const raw = localStorage.getItem('zensolitaire_stats');
      return raw ? JSON.parse(raw) : {
        played: 0,
        won: 0,
        bestScore: 0,
        fewestMoves: null,
        bestTime: null,
        currentStreak: 0,
        bestStreak: 0
      };
    } catch (e) {
      return { played: 0, won: 0, bestScore: 0, fewestMoves: null, bestTime: null, currentStreak: 0, bestStreak: 0 };
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem('zensolitaire_stats', JSON.stringify(stats));
    } catch (e) {}
  }

  function updateStatsModal() {
    const stats = getStats();
    document.getElementById('stat-played').textContent = stats.played;
    document.getElementById('stat-won').textContent = stats.won;
    const rate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
    document.getElementById('stat-winrate').textContent = `${rate}%`;
    document.getElementById('stat-best-score').textContent = stats.bestScore || 0;
    document.getElementById('stat-fewest-moves').textContent = stats.fewestMoves !== null ? stats.fewestMoves : '-';

    if (stats.bestTime !== null) {
      const m = Math.floor(stats.bestTime / 60);
      const s = stats.bestTime % 60;
      document.getElementById('stat-best-time').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    } else {
      document.getElementById('stat-best-time').textContent = '-';
    }
  }

  function recordWin() {
    clearInterval(timerInterval);
    const stats = getStats();
    stats.won++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
    if (game.score > stats.bestScore) {
      stats.bestScore = game.score;
    }
    if (stats.fewestMoves === null || game.moves < stats.fewestMoves) {
      stats.fewestMoves = game.moves;
    }
    if (stats.bestTime === null || secondsElapsed < stats.bestTime) {
      stats.bestTime = secondsElapsed;
    }
    saveStats(stats);

    // Show Win Modal
    winScoreEl.textContent = game.score;
    const m = Math.floor(secondsElapsed / 60);
    const s = secondsElapsed % 60;
    winTimeEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    winMovesEl.textContent = game.moves;
    winStreakEl.textContent = stats.currentStreak;

    Audio.playWin();
    startConfetti();
    winModal.classList.add('active');
  }

  // Create Card Element
  function renderCardElement(card, isTop = false) {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? 'face-up' : 'face-down'}`;
    el.dataset.cardId = card.id;

    if (card.faceUp) {
      el.classList.add(card.color);
      el.innerHTML = `
        <div class="card-corner top">
          <span class="card-rank">${card.label}</span>
          <span class="card-suit-mini">${card.symbol}</span>
        </div>
        <div class="card-center">${card.symbol}</div>
        <div class="card-corner bottom">
          <span class="card-rank">${card.label}</span>
          <span class="card-suit-mini">${card.symbol}</span>
        </div>
      `;
    }
    return el;
  }

  // Render Table
  function render() {
    if (!game) return;

    // HUD
    scoreVal.textContent = game.score;
    movesVal.textContent = game.moves;
    drawModeBtn.textContent = `Draw ${game.drawMode}`;

    // Stock
    stockCountEl.textContent = game.stock.length;
    stockSlot.className = `card-slot ${game.stock.length === 0 ? 'empty' : ''}`;

    // Waste
    wasteSlot.innerHTML = '';
    if (game.waste.length > 0) {
      const topWaste = game.waste[game.waste.length - 1];
      const cardEl = renderCardElement(topWaste, true);
      if (selectedCard && selectedCard.type === 'waste') {
        cardEl.classList.add('selected');
      }
      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick({ type: 'waste' }, topWaste);
      });
      cardEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        handleCardDoubleClick({ type: 'waste' });
      });
      wasteSlot.appendChild(cardEl);
    }

    // Foundations
    for (let f = 0; f < 4; f++) {
      const fSlot = foundations[f];
      fSlot.innerHTML = '';
      const pile = game.foundations[f];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const cardEl = renderCardElement(topCard, true);
        if (selectedCard && selectedCard.type === 'foundation' && selectedCard.fIndex === f) {
          cardEl.classList.add('selected');
        }
        cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          handleCardClick({ type: 'foundation', fIndex: f }, topCard);
        });
        fSlot.appendChild(cardEl);
      }
    }

    // Tableau
    for (let c = 0; c < 7; c++) {
      const colEl = tableaus[c];
      colEl.innerHTML = '';
      const col = game.tableau[c];

      col.forEach((card, idx) => {
        const cardEl = renderCardElement(card, idx === col.length - 1);
        // Vertical cascading offset
        cardEl.style.top = `${idx * 24}px`;

        if (
          selectedCard &&
          selectedCard.type === 'tableau' &&
          selectedCard.colIndex === c &&
          idx >= selectedCard.cardIndex
        ) {
          cardEl.classList.add('selected');
        }

        if (card.faceUp) {
          cardEl.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCardClick({ type: 'tableau', colIndex: c, cardIndex: idx }, card);
          });
          cardEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            handleCardDoubleClick({ type: 'tableau', colIndex: c, cardIndex: idx });
          });
        }
        colEl.appendChild(cardEl);
      });
    }

    // Auto-finish readiness
    if (Logic.canAutoFinish(game) && !isAutoFinishing) {
      autoFinishBar.style.display = 'flex';
    } else {
      autoFinishBar.style.display = 'none';
    }

    // Check Win
    if (Logic.isWon(game)) {
      recordWin();
    }
  }

  // Clear Hints & Selection
  function clearSelection() {
    selectedCard = null;
    document.querySelectorAll('.card.hint-highlight').forEach(el => el.classList.remove('hint-highlight'));
    document.querySelectorAll('.card-slot.hint-highlight').forEach(el => el.classList.remove('hint-highlight'));
  }

  // Handle Card Click (Tap to Select or Move)
  function handleCardClick(sourceInfo, card) {
    Audio.ensureContext();
    startTimer();

    // If already selected, try to auto-move on second tap
    if (
      selectedCard &&
      selectedCard.type === sourceInfo.type &&
      selectedCard.colIndex === sourceInfo.colIndex &&
      selectedCard.cardIndex === sourceInfo.cardIndex &&
      selectedCard.fIndex === sourceInfo.fIndex
    ) {
      handleCardDoubleClick(sourceInfo);
      return;
    }

    // If something was already selected, attempt to move to clicked location
    if (selectedCard) {
      if (sourceInfo.type === 'tableau') {
        const moved = executeMove(selectedCard, { type: 'tableau', colIndex: sourceInfo.colIndex });
        if (moved) {
          clearSelection();
          render();
          return;
        }
      } else if (sourceInfo.type === 'foundation') {
        const moved = executeMove(selectedCard, { type: 'foundation', fIndex: sourceInfo.fIndex });
        if (moved) {
          clearSelection();
          render();
          return;
        }
      }
    }

    // Otherwise, select this card
    selectedCard = sourceInfo;
    Audio.playCardFlip();
    render();
  }

  // Handle Card Double-Click / Quick Double-Tap -> Auto Move
  function handleCardDoubleClick(sourceInfo) {
    Audio.ensureContext();
    startTimer();

    let moved = false;
    if (sourceInfo.type === 'waste') {
      const card = game.waste[game.waste.length - 1];
      const best = Logic.findBestMoveForCard(game, card, sourceInfo);
      if (best) {
        if (best.targetType === 'foundation') {
          moved = Logic.moveWasteToFoundation(game, best.targetIndex);
          if (moved) Audio.playFoundation(card.rank);
        } else {
          moved = Logic.moveWasteToTableau(game, best.targetIndex);
          if (moved) Audio.playCardPlace();
        }
      }
    } else if (sourceInfo.type === 'tableau') {
      const col = game.tableau[sourceInfo.colIndex];
      const card = col[sourceInfo.cardIndex];
      const best = Logic.findBestMoveForCard(game, card, sourceInfo);
      if (best) {
        if (best.targetType === 'foundation') {
          moved = Logic.moveTableauToFoundation(game, sourceInfo.colIndex, best.targetIndex);
          if (moved) Audio.playFoundation(card.rank);
        } else {
          moved = Logic.moveTableauToTableau(game, sourceInfo.colIndex, sourceInfo.cardIndex, best.targetIndex);
          if (moved) Audio.playCardPlace();
        }
      }
    }

    if (moved) {
      clearSelection();
      render();
    }
  }

  // Execute Move from Source to Target
  function executeMove(from, to) {
    let success = false;

    if (from.type === 'waste') {
      if (to.type === 'foundation') {
        const card = game.waste[game.waste.length - 1];
        success = Logic.moveWasteToFoundation(game, to.fIndex);
        if (success) Audio.playFoundation(card ? card.rank : 1);
      } else if (to.type === 'tableau') {
        success = Logic.moveWasteToTableau(game, to.colIndex);
        if (success) Audio.playCardPlace();
      }
    } else if (from.type === 'tableau') {
      if (to.type === 'foundation') {
        const col = game.tableau[from.colIndex];
        const card = col ? col[col.length - 1] : null;
        success = Logic.moveTableauToFoundation(game, from.colIndex, to.fIndex);
        if (success) Audio.playFoundation(card ? card.rank : 1);
      } else if (to.type === 'tableau') {
        success = Logic.moveTableauToTableau(game, from.colIndex, from.cardIndex, to.colIndex);
        if (success) Audio.playCardPlace();
      }
    } else if (from.type === 'foundation') {
      if (to.type === 'tableau') {
        success = Logic.moveFoundationToTableau(game, from.fIndex, to.colIndex);
        if (success) Audio.playCardPlace();
      }
    }

    return success;
  }

  // Start New Game
  function startNewGame(drawMode = 1) {
    Audio.ensureContext();
    Audio.playShuffle();
    clearSelection();
    resetTimer();

    const stats = getStats();
    stats.played++;
    saveStats(stats);

    game = Logic.createGame({ drawMode: drawMode });
    render();
  }

  // Stock Click
  stockSlot.addEventListener('click', () => {
    Audio.ensureContext();
    startTimer();
    clearSelection();

    const res = Logic.draw(game);
    if (res.action === 'draw') {
      Audio.playCardFlip();
    } else if (res.action === 'recycle') {
      Audio.playShuffle();
    }
    render();
  });

  // Empty Slot Click Handlers
  foundations.forEach((fSlot, fIdx) => {
    fSlot.addEventListener('click', () => {
      if (selectedCard) {
        const moved = executeMove(selectedCard, { type: 'foundation', fIndex: fIdx });
        if (moved) {
          clearSelection();
          render();
        }
      }
    });
  });

  tableaus.forEach((tSlot, tIdx) => {
    tSlot.addEventListener('click', (e) => {
      // Only handle if clicking empty column background
      if (e.target === tSlot && selectedCard) {
        const moved = executeMove(selectedCard, { type: 'tableau', colIndex: tIdx });
        if (moved) {
          clearSelection();
          render();
        }
      }
    });
  });

  // Header Buttons
  drawModeBtn.addEventListener('click', () => {
    const nextMode = game && game.drawMode === 1 ? 3 : 1;
    startNewGame(nextMode);
  });

  undoBtn.addEventListener('click', () => {
    Audio.ensureContext();
    clearSelection();
    if (game && Logic.undo(game)) {
      Audio.playUndo();
      render();
    }
  });

  hintBtn.addEventListener('click', () => {
    Audio.ensureContext();
    clearSelection();
    if (!game) return;

    const hint = Logic.getHint(game);
    if (hint) {
      Audio.playCardFlip();
      // Highlight source
      if (hint.from.type === 'waste') {
        const card = wasteSlot.querySelector('.card');
        if (card) card.classList.add('hint-highlight');
      } else if (hint.from.type === 'tableau') {
        const col = tableaus[hint.from.colIndex];
        const cards = col.querySelectorAll('.card');
        if (cards[hint.from.cardIndex]) {
          cards[hint.from.cardIndex].classList.add('hint-highlight');
        }
      }

      // Highlight target
      if (hint.to.type === 'foundation') {
        foundations[hint.to.index].classList.add('hint-highlight');
      } else if (hint.to.type === 'tableau') {
        tableaus[hint.to.colIndex].classList.add('hint-highlight');
      }

      setTimeout(() => {
        document.querySelectorAll('.hint-highlight').forEach(el => el.classList.remove('hint-highlight'));
      }, 2500);
    }
  });

  soundBtn.addEventListener('click', () => {
    const isMuted = !Audio.isMuted();
    Audio.setMuted(isMuted);
    soundBtn.textContent = isMuted ? '🔇' : '🔊';
    try {
      localStorage.setItem('zensolitaire_sound', String(!isMuted));
    } catch (e) {}
  });

  themeBtn.addEventListener('click', cycleTheme);

  statsBtn.addEventListener('click', () => {
    Audio.ensureContext();
    Audio.playCardPlace();
    updateStatsModal();
    statsModal.classList.add('active');
  });

  closeStatsBtn.addEventListener('click', () => {
    statsModal.classList.remove('active');
  });

  closeStatsActionBtn.addEventListener('click', () => {
    statsModal.classList.remove('active');
  });

  newGameBtn.addEventListener('click', () => {
    startNewGame(game ? game.drawMode : 1);
  });

  playAgainBtn.addEventListener('click', () => {
    winModal.classList.remove('active');
    stopConfetti();
    startNewGame(game ? game.drawMode : 1);
  });

  // Auto-Finish Execution
  autoFinishBtn.addEventListener('click', () => {
    if (isAutoFinishing || !game) return;
    isAutoFinishing = true;
    autoFinishBar.style.display = 'none';

    function runStep() {
      if (Logic.isWon(game)) {
        isAutoFinishing = false;
        render();
        return;
      }
      const finishedOne = Logic.autoFinishStep(game);
      if (finishedOne) {
        Audio.playFoundation(10);
        render();
        setTimeout(runStep, 100);
      } else {
        isAutoFinishing = false;
        render();
      }
    }
    runStep();
  });

  // Confetti Particle System
  function startConfetti() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCtx = confettiCanvas.getContext('2d');
    confettiParticles = [];

    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        rotSpeed: Math.random() * 10 - 5
      });
    }

    function animate() {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        if (p.y > confettiCanvas.height) {
          p.y = -10;
          p.x = Math.random() * confettiCanvas.width;
        }

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rot * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
      });
      confettiAnimId = requestAnimationFrame(animate);
    }
    animate();
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    if (confettiCtx && confettiCanvas) {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Initialize
  loadPreferences();
  startNewGame(1);
})();
