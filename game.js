(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const DENOMS = [10, 20, 30, 50, 100, 200];
  const CLAW_COST = 50;
  const SAVE_KEY = 'goldenArcade.v2';
  const BONUS_AMOUNT = 200;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = document.getElementById('stage');
  const $ = (id) => document.getElementById(id);

  const ui = {
    balance: $('balance'),
    walletPop: $('walletPop'),
    soundBtn: $('soundBtn'),
    openVault: $('openVault'),
    openVaultMobile: $('openVaultMobile'),
    vaultModal: $('vaultModal'),
    closeVault: $('closeVault'),
    modalGrid: $('modalGrid'),
    modalEmpty: $('modalEmpty'),
    modalWon: $('modalWon'),
    modalBest: $('modalBest'),
    modalPlays: $('modalPlays'),
    statWon: $('statWon'),
    statBest: $('statBest'),
    statPlays: $('statPlays'),
    statPrizes: $('statPrizes'),
    luckText: $('luckText'),
    luckFill: $('luckFill'),
    prizeShelf: $('prizeShelf'),
    vaultEmpty: $('vaultEmpty'),
    vaultCount: $('vaultCount'),
    denomStrip: $('denomStrip'),
    clawStrip: $('clawStrip'),
    denomButtons: Array.from(document.querySelectorAll('.denom')),
    actionBtn: $('actionBtn'),
    actionMain: $('actionMain'),
    actionCost: $('actionCost'),
    metaLabel: $('metaLabel'),
    metaValue: $('metaValue'),
    metaSub: $('metaSub'),
    stageBadge: $('stageBadge'),
    aimReadout: $('aimReadout'),
    ticker: $('ticker'),
    hint: $('hint'),
    hintText: $('hintText'),
    toastStack: $('toastStack'),
    bigWin: $('bigWin'),
    bigWinKicker: $('bigWinKicker'),
    bigWinAmount: $('bigWinAmount'),
    bigWinSub: $('bigWinSub'),
    dockEyebrow: $('dockEyebrow'),
    dockHint: $('dockHint'),
    tipMark: $('tipMark'),
    tipKicker: $('tipKicker'),
    tipTitle: $('tipTitle'),
    tipBody: $('tipBody'),
    freeCoins: $('freeCoins'),
    tabs: Array.from(document.querySelectorAll('.mode-tab'))
  };

  const state = {
    mode: 'pusher',
    coins: 1000,
    totalWon: 0,
    bestWin: 0,
    plays: 0,
    collection: [],
    denom: 50,
    muted: false
  };

  const view = {
    w: 0,
    h: 0,
    dpr: 1,
    pusher: null,
    claw: null
  };

  const pusher = {
    phase: 0.4,
    p: 0.24,
    coins: [],
    aimX: 0,
    dropCooldown: 0,
    dropsSinceBonus: 0,
    totalValue: 0,
    pressure: 0,
    landingRings: []
  };

  const claw = {
    prizes: [],
    aim: { x: 0.5, y: 0.66 },
    carriageX: 0.5,
    phase: 'idle',
    t: 0,
    target: { x: 0.5, y: 0.66 },
    held: null,
    success: false,
    resolved: false,
    credit: false,
    close: 0,
    candidate: null,
    slip: false,
    restockTimer: 0
  };

  const fx = {
    particles: [],
    floats: [],
    rings: [],
    confetti: []
  };

  let lastTime = 0;
  let clock = 0;
  let saveTimer = 0;
  let walletTimer = 0;
  let metaTimer = 0;
  let tickerTimer = 0;
  let hintTimer = 0;
  let audioCtx = null;
  let masterGain = null;
  let lastCoinSound = 0;
  let lastFrameCollected = 0;

  const COIN_META = {
    10: { top: '#ffd4a8', mid: '#d98547', low: '#85420f', rim: '#ffc28a', ink: '#69340b', stack: 1.0 },
    20: { top: '#f3f8ff', mid: '#b7c3d3', low: '#687689', rim: '#eaf3ff', ink: '#4a586b', stack: 1.25 },
    30: { top: '#fff3b1', mid: '#f0c047', low: '#98640b', rim: '#ffe27a', ink: '#6f4500', stack: 1.55 },
    50: { top: '#ffd6c9', mid: '#e58d78', low: '#91412e', rim: '#ffb6a3', ink: '#6e2d20', stack: 1.85 },
    100: { top: '#c4ffe7', mid: '#55d6a6', low: '#107157', rim: '#8ef4ce', ink: '#075340', stack: 2.3 },
    200: { top: '#eadcff', mid: '#a98ae8', low: '#52318f', rim: '#d3baff', ink: '#402275', stack: 2.75 }
  };

  const PRIZE_TYPES = {
    candy: { id: 'candy', name: 'Sour Star', value: 10, emoji: '🍬', grip: 0.92, size: 0.78, bg: 'rgba(255,120,180,.16)', c1: '#ff83b3', c2: '#b91f64', accent: '#ffe08a' },
    frog: { id: 'frog', name: 'Lucky Frog', value: 20, emoji: '🐸', grip: 0.89, size: 0.96, bg: 'rgba(104,235,138,.16)', c1: '#7be38e', c2: '#278c48', accent: '#ffef9d' },
    bunny: { id: 'bunny', name: 'Cloud Bunny', value: 30, emoji: '🐰', grip: 0.86, size: 1.04, bg: 'rgba(255,226,237,.14)', c1: '#fff0f5', c2: '#e8a8bf', accent: '#ff8fbd' },
    ghost: { id: 'ghost', name: 'Boo Buddy', value: 30, emoji: '👻', grip: 0.9, size: 1.0, bg: 'rgba(170,180,255,.15)', c1: '#dfe4ff', c2: '#8c91d8', accent: '#ffd8f0' },
    donut: { id: 'donut', name: 'Sprinkle Ring', value: 40, emoji: '🍩', grip: 0.84, size: 0.9, bg: 'rgba(255,190,130,.15)', c1: '#ffb27a', c2: '#b95d39', accent: '#ff7aa8' },
    bear: { id: 'bear', name: 'Honey Bear', value: 50, emoji: '🧸', grip: 0.8, size: 1.1, bg: 'rgba(255,190,120,.16)', c1: '#e9b06f', c2: '#9c5e2b', accent: '#ffd9a1' },
    star: { id: 'star', name: 'Super Star', value: 50, emoji: '⭐', grip: 0.79, size: 0.95, bg: 'rgba(255,226,100,.17)', c1: '#ffe26e', c2: '#c98612', accent: '#fff8c9' },
    moon: { id: 'moon', name: 'Moon Plush', value: 100, emoji: '🌙', grip: 0.72, size: 0.96, bg: 'rgba(200,180,255,.16)', c1: '#f4e7a5', c2: '#9b7c25', accent: '#fff7d0' },
    gem: { id: 'gem', name: 'Prism Gem', value: 100, emoji: '💎', grip: 0.66, size: 0.84, bg: 'rgba(110,231,249,.16)', c1: '#a8f4ff', c2: '#1b8da6', accent: '#e9feff' },
    crown: { id: 'crown', name: 'Royal Crown', value: 200, emoji: '👑', grip: 0.6, size: 0.94, bg: 'rgba(255,209,102,.18)', c1: '#ffe57b', c2: '#b57805', accent: '#ff7fa8' },
    golden: { id: 'golden', name: 'Golden Bear', value: 500, emoji: '🌈', grip: 0.52, size: 1.2, bg: 'rgba(255,209,102,.24)', c1: '#ffd76e', c2: '#b57600', accent: '#ff79ae' }
  };

  const PRIZE_POOL = [
    ['candy', 12], ['frog', 18], ['bunny', 16], ['ghost', 14], ['donut', 11],
    ['bear', 12], ['star', 10], ['moon', 7], ['gem', 6], ['crown', 3], ['golden', 1]
  ];
  const PRIZE_POOL_TOTAL = PRIZE_POOL.reduce((sum, item) => sum + item[1], 0);

  const TIPS = {
    pusher: {
      mark: '01',
      kicker: 'HOW TO PLAY',
      title: 'Feed the pusher.',
      body: 'Pick a 10–200 coin and drop it onto the moving plate. The blade nudges the pile toward the glowing lip — anything that falls is yours.'
    },
    claw: {
      mark: '02',
      kicker: 'AIM FOR VALUE',
      title: 'The claw is hungry.',
      body: 'Drag inside the glass to line up the claw, then drop. Plush toys are easy. Gems and crowns are heavy — line up perfectly to keep your grip.'
    }
  };

  const TICKERS = {
    pusher: [
      'THE PUSHER NEVER SLEEPS',
      'BIG COINS PUSH HARDER',
      'THE PILE IS GETTING RESTLESS',
      'ANYTHING OVER THE LIP IS YOURS',
      'A 200 COIN MAKES A LOUD ENTRANCE'
    ],
    claw: [
      'THE CLAW IS WATCHING',
      'HEAVY PRIZES NEED A CLEAN GRIP',
      'THAT GOLDEN BEAR IS OUT THERE',
      'DRAG TO AIM · DROP TO WIN',
      'EVERY PRIZE CONVERTS TO COINS'
    ]
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeInOut = (t) => {
    const x = clamp(t, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function polygon(c, points) {
    c.beginPath();
    c.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
    c.closePath();
  }

  function weightedPrize() {
    let roll = Math.random() * PRIZE_POOL_TOTAL;
    for (const [id, weight] of PRIZE_POOL) {
      roll -= weight;
      if (roll <= 0) return PRIZE_TYPES[id];
    }
    return PRIZE_TYPES.frog;
  }

  // ---------- Audio ----------

  function initAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = state.muted ? 0 : 0.6;
      masterGain.connect(audioCtx.destination);
    } catch {
      audioCtx = null;
    }
  }

  function tone(freq, dur, type = 'sine', vol = 0.04, slide = 0, delay = 0) {
    if (!audioCtx || state.muted) return;
    const t = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noise(dur = 0.05, vol = 0.03, freq = 1800, delay = 0) {
    if (!audioCtx || state.muted) return;
    const length = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime + delay;
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(t);
  }

  const sfx = {
    click() {
      tone(520, 0.05, 'square', 0.018, 60);
    },
    drop() {
      tone(1120, 0.13, 'sine', 0.035, -760);
      noise(0.035, 0.018, 2400, 0.02);
    },
    land() {
      tone(1480, 0.045, 'triangle', 0.022, -380);
      noise(0.028, 0.012, 3200);
    },
    coin() {
      const now = performance.now();
      if (now - lastCoinSound < 55) return;
      lastCoinSound = now;
      tone(1180, 0.06, 'triangle', 0.026, 440);
      tone(1770, 0.055, 'sine', 0.014, 300, 0.035);
    },
    prize() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.035, 0, i * 0.075));
    },
    jackpot() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.26, 'triangle', 0.04, 0, i * 0.08));
      [261, 392, 523].forEach((f, i) => tone(f, 0.4, 'sine', 0.025, 0, i * 0.16));
    },
    motor() {
      tone(92, 0.22, 'sawtooth', 0.016, -18);
      tone(61, 0.2, 'square', 0.008, 8, 0.02);
    },
    grab() {
      noise(0.1, 0.025, 900);
      tone(180, 0.16, 'square', 0.02, 120);
    },
    slip() {
      tone(360, 0.22, 'sawtooth', 0.028, -240);
      noise(0.1, 0.018, 700, 0.04);
    },
    free() {
      [660, 880, 1100].forEach((f, i) => tone(f, 0.16, 'sine', 0.03, 0, i * 0.07));
    }
  };

  // ---------- Persistence ----------

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.coins === 'number') state.coins = Math.max(0, Math.floor(data.coins));
      if (typeof data.totalWon === 'number') state.totalWon = Math.max(0, Math.floor(data.totalWon));
      if (typeof data.bestWin === 'number') state.bestWin = Math.max(0, Math.floor(data.bestWin));
      if (typeof data.plays === 'number') state.plays = Math.max(0, Math.floor(data.plays));
      if (Array.isArray(data.collection)) state.collection = data.collection.slice(0, 40);
      if (DENOMS.includes(data.denom)) state.denom = data.denom;
      if (typeof data.muted === 'boolean') state.muted = data.muted;
    } catch {
      // A blocked localStorage should never stop the arcade from opening.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: state.coins,
        totalWon: state.totalWon,
        bestWin: state.bestWin,
        plays: state.plays,
        collection: state.collection.slice(0, 40),
        denom: state.denom,
        muted: state.muted
      }));
    } catch {
      // Ignore private-mode storage failures.
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 250);
  }

  // ---------- UI ----------

  function updateWallet(delta = 0) {
    ui.balance.textContent = fmt(state.coins);
    if (delta) {
      ui.walletPop.textContent = (delta > 0 ? '+' : '') + fmt(delta);
      ui.walletPop.style.color = delta > 0 ? 'var(--green)' : 'var(--pink)';
      ui.walletPop.classList.remove('is-live');
      void ui.walletPop.offsetWidth;
      ui.walletPop.classList.add('is-live');
      clearTimeout(walletTimer);
      walletTimer = setTimeout(() => ui.walletPop.classList.remove('is-live'), 850);
    }
  }

  function updateStats() {
    ui.statWon.textContent = fmt(state.totalWon);
    ui.statBest.textContent = fmt(state.bestWin);
    ui.statPlays.textContent = fmt(state.plays);
    ui.statPrizes.textContent = fmt(state.collection.length);
    ui.modalWon.textContent = fmt(state.totalWon);
    ui.modalBest.textContent = fmt(state.bestWin);
    ui.modalPlays.textContent = fmt(state.plays);
    const luck = clamp(14 + (state.totalWon / 7000) * 82, 14, 97);
    ui.luckFill.style.width = luck + '%';
    ui.luckText.textContent = luck > 82 ? 'Golden hot' : luck > 58 ? 'Red hot' : luck > 34 ? 'Feeling lucky' : 'Warming up';
    ui.vaultCount.textContent = state.collection.length + (state.collection.length === 1 ? ' ITEM' : ' ITEMS');
    ui.freeCoins.hidden = state.coins >= CLAW_COST;
  }

  function renderShelf() {
    ui.prizeShelf.querySelectorAll('.shelf-item').forEach((el) => el.remove());
    ui.vaultEmpty.hidden = state.collection.length > 0;
    const recent = state.collection.slice(0, 4);
    recent.forEach((item, index) => {
      const type = PRIZE_TYPES[item.type] || PRIZE_TYPES.frog;
      const el = document.createElement('div');
      el.className = 'shelf-item';
      el.style.animationDelay = index * 0.04 + 's';
      el.innerHTML =
        '<span class="shelf-icon" style="--prize-bg:' + type.bg + '">' + type.emoji + '</span>' +
        '<span class="shelf-copy"><span class="shelf-name">' + type.name + '</span>' +
        '<span class="shelf-value"><i class="mini-coin">★</i>' + fmt(item.value) + '</span></span>';
      ui.prizeShelf.appendChild(el);
    });
  }

  function renderModal() {
    ui.modalGrid.innerHTML = '';
    ui.modalEmpty.style.display = state.collection.length ? 'none' : 'flex';
    state.collection.slice(0, 32).forEach((item) => {
      const type = PRIZE_TYPES[item.type] || PRIZE_TYPES.frog;
      const el = document.createElement('div');
      el.className = 'modal-item';
      el.innerHTML =
        '<span class="modal-item-icon" style="--prize-bg:' + type.bg + '">' + type.emoji + '</span>' +
        '<b>' + type.name + '</b><span>+ ' + fmt(item.value) + ' coins</span>';
      ui.modalGrid.appendChild(el);
    });
  }

  function openVault() {
    renderModal();
    ui.vaultModal.hidden = false;
    document.body.style.overflow = 'hidden';
    ui.closeVault.focus({ preventScroll: true });
    sfx.click();
  }

  function closeVault() {
    ui.vaultModal.hidden = true;
    document.body.style.overflow = '';
    sfx.click();
  }

  function syncControls() {
    const isPusher = state.mode === 'pusher';
    if (isPusher && state.coins < state.denom) {
      const affordable = DENOMS.filter((value) => value <= state.coins).pop();
      if (affordable && affordable !== state.denom) {
        state.denom = affordable;
        scheduleSave();
      }
    }
    ui.denomStrip.hidden = !isPusher;
    ui.clawStrip.hidden = isPusher;
    ui.denomButtons.forEach((btn) => {
      const value = Number(btn.dataset.value);
      btn.classList.toggle('is-selected', value === state.denom);
      btn.classList.toggle('is-poor', state.coins < value);
      btn.setAttribute('aria-pressed', String(value === state.denom));
    });

    const busy = !isPusher && claw.phase !== 'idle';
    const cost = isPusher ? state.denom : CLAW_COST;
    const poor = state.coins < cost;
    ui.actionBtn.disabled = busy;
    ui.actionBtn.classList.toggle('is-busy', busy);
    ui.actionBtn.classList.toggle('is-poor', poor && !busy);
    if (busy) {
      ui.actionMain.textContent = 'Claw busy';
      ui.actionCost.textContent = 'HANG TIGHT';
    } else if (poor) {
      ui.actionMain.textContent = 'Claim free coins';
      ui.actionCost.textContent = '+100 COIN BOOST';
    } else if (isPusher) {
      ui.actionMain.textContent = 'Drop ' + state.denom;
      ui.actionCost.textContent = fmt(state.denom) + ' COINS';
    } else {
      ui.actionMain.textContent = 'Drop claw';
      ui.actionCost.textContent = fmt(CLAW_COST) + ' COINS';
    }
    ui.metaLabel.textContent = isPusher ? 'TABLE VALUE' : 'PRIZES LEFT';
    ui.metaSub.textContent = isPusher ? 'coins in play' : 'inside the glass';
    updateMeta();
    updateAimReadout();
    updateWallet();
    updateStats();
  }

  function updateMeta() {
    if (state.mode === 'pusher') {
      let total = 0;
      for (const coin of pusher.coins) total += coin.value;
      pusher.totalValue = total;
      ui.metaValue.textContent = fmt(total);
    } else {
      ui.metaValue.textContent = fmt(claw.prizes.length);
    }
  }

  function updateAimReadout() {
    if (state.mode === 'pusher') {
      ui.aimReadout.textContent = 'AIM ' + Math.round(((pusher.aimX + 1) / 2) * 100) + '%';
    } else {
      ui.aimReadout.textContent = 'AIM ' + Math.round(claw.aim.x * 100) + ' · ' + Math.round(claw.aim.y * 100);
    }
  }

  function setTicker(text) {
    ui.ticker.textContent = text;
  }

  function dismissHint() {
    ui.hint.classList.add('is-hidden');
    clearTimeout(hintTimer);
  }

  function setHint(text) {
    ui.hintText.textContent = text;
    ui.hint.classList.remove('is-hidden');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => ui.hint.classList.add('is-hidden'), 9000);
  }

  function toast(text, kind = 'gold', icon = '★') {
    while (ui.toastStack.children.length >= 3) ui.toastStack.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'pink' ? ' toast--pink' : kind === 'cyan' ? ' toast--cyan' : '');
    el.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + text + '</span>';
    ui.toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-out');
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  function showBigWin(kicker, amount, sub) {
    ui.bigWinKicker.textContent = kicker;
    ui.bigWinAmount.textContent = '+' + fmt(amount);
    ui.bigWinSub.textContent = sub;
    ui.bigWin.classList.remove('is-live');
    void ui.bigWin.offsetWidth;
    ui.bigWin.classList.add('is-live');
  }

  function setMode(mode) {
    if (!TIPS[mode] || state.mode === mode) return;
    state.mode = mode;
    document.body.dataset.mode = mode;
    ui.tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    ui.stageBadge.textContent = mode === 'pusher' ? 'COIN PUSHER' : 'CLAW MACHINE';
    const tip = TIPS[mode];
    ui.tipMark.textContent = tip.mark;
    ui.tipKicker.textContent = tip.kicker;
    ui.tipTitle.textContent = tip.title;
    ui.tipBody.textContent = tip.body;
    if (mode === 'pusher') {
      ui.dockEyebrow.textContent = 'AIM & DROP';
      ui.dockHint.innerHTML = 'Move across the table. Tap or press <kbd>Space</kbd> to release a coin.';
      setHint('Tap the table to drop a ' + state.denom + ' coin');
      setTicker('THE PUSHER IS WARMING UP');
    } else {
      ui.dockEyebrow.textContent = 'AIM & GRAB';
      ui.dockHint.innerHTML = 'Drag inside the glass to aim. Press <kbd>Space</kbd> or hit Drop Claw.';
      setHint('Drag inside the glass to aim the claw');
      setTicker('THE CLAW IS WATCHING');
    }
    positionOverlays();
    syncControls();
    sfx.click();
  }

  // ---------- Layout ----------

  function positionOverlays() {
    const L = state.mode === 'pusher' ? view.pusher : view.claw;
    if (!L) return;
    // Keep notifications clear of the marquee on every screen size.
    ui.toastStack.style.top = Math.round(L.marquee.y + L.marquee.h + 12) + 'px';
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    view.w = Math.max(1, rect.width);
    view.h = Math.max(1, rect.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = view.w + 'px';
    canvas.style.height = view.h + 'px';
    view.pusher = computePusherLayout();
    view.claw = computeClawLayout();
    positionOverlays();
  }

  function computePusherLayout() {
    const w = view.w;
    const h = view.h;
    const cx = w / 2;
    const top = h * 0.255;
    const bottom = h * 0.855;
    const tableH = bottom - top;
    const frontHalf = Math.min(w * 0.43, tableH * 1.1);
    const backHalf = Math.min(w * 0.295, frontHalf * 0.7);
    const cabW = Math.min(w * 0.975, frontHalf * 2 + 120);
    const cabL = cx - cabW / 2;
    const marqueeH = Math.min(h * 0.135, 94);
    return {
      w, h, cx, top, bottom, tableH, frontHalf, backHalf, cabW, cabL,
      marquee: { x: cx - cabW * 0.41, y: h * 0.047, w: cabW * 0.82, h: marqueeH },
      coinBase: clamp(tableH * 0.036, 7, 18),
      trayY: bottom + h * 0.026,
      trayH: Math.max(30, h * 0.07)
    };
  }

  function computeClawLayout() {
    const w = view.w;
    const h = view.h;
    const cx = w / 2;
    const compact = h < 360;
    const caseW = Math.min(w * 0.9, 830);
    const caseH = Math.min(h * (compact ? 0.55 : 0.63), 530);
    const caseTop = h * (compact ? 0.21 : 0.2);
    const caseBottom = caseTop + caseH;
    const caseL = cx - caseW / 2;
    const field = {
      l: caseL + caseW * 0.07,
      r: caseL + caseW * 0.93,
      t: caseTop + caseH * 0.14,
      b: caseBottom - caseH * 0.09
    };
    field.w = field.r - field.l;
    field.h = field.b - field.t;
    return {
      w, h, cx, caseW, caseH, caseTop, caseBottom, caseL,
      cabW: Math.min(w * 0.98, caseW + 80),
      field,
      prizeBase: clamp(Math.min(caseW * 0.065, caseH * 0.16), 12, 56),
      chuteX: 0.075,
      hoverY: caseTop + caseH * 0.285,
      railY: caseTop + caseH * 0.085,
      marquee: { x: cx - Math.min(caseW + 30, w * 0.94) * 0.41, y: h * 0.04, w: Math.min(caseW + 30, w * 0.94) * 0.82, h: Math.min(h * 0.12, 84) }
    };
  }

  function projectPusher(x, y, z = 0) {
    const L = view.pusher;
    const t = clamp(y, 0, 1.07);
    const half = L.backHalf + (L.frontHalf - L.backHalf) * Math.pow(t, 0.92);
    return {
      x: L.cx + x * half,
      y: L.top + (L.bottom - L.top) * t - z * L.tableH * 0.31 * (0.72 + 0.48 * t),
      half,
      t,
      scale: 0.7 + 0.5 * t
    };
  }

  function screenToPusher(px, py) {
    const L = view.pusher;
    const t = clamp((py - L.top) / (L.bottom - L.top), 0, 1);
    const half = L.backHalf + (L.frontHalf - L.backHalf) * Math.pow(t, 0.92);
    return { x: clamp((px - L.cx) / half, -0.92, 0.92), y: t };
  }

  function clawPrizePoint(prize) {
    const L = view.claw;
    return {
      x: L.field.l + prize.x * L.field.w,
      y: L.field.t + prize.y * L.field.h,
      scale: 0.66 + prize.y * 0.46
    };
  }

  function clawPrizeSize(prize) {
    const L = view.claw;
    const p = clawPrizePoint(prize);
    return L.prizeBase * prize.type.size * p.scale;
  }

  // ---------- Coin pusher ----------

  function coinValueRoll() {
    const table = [[10, 26], [20, 21], [30, 18], [50, 15], [100, 8], [200, 4]];
    let roll = Math.random() * 100;
    for (const [value, weight] of table) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return 10;
  }

  function makeCoin(x, y, value, extra = {}) {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      r: 0.035,
      value,
      rot: rand(0, TAU),
      spin: rand(-2.5, 2.5),
      z: 0,
      vz: 0,
      bonus: false,
      ...extra
    };
  }

  function seedPusher() {
    pusher.coins = [];
    let attempts = 0;
    while (pusher.coins.length < 150 && attempts < 9000) {
      attempts++;
      const y = rand(0.44, 0.997);
      const x = rand(-0.86, 0.86);
      let clear = true;
      for (const other of pusher.coins) {
        const dx = x - other.x;
        const dy = (y - other.y) * 0.86;
        if (dx * dx + dy * dy < 0.058 * 0.058) {
          clear = false;
          break;
        }
      }
      if (clear) pusher.coins.push(makeCoin(x, y, coinValueRoll()));
    }
    for (let i = 0; i < 2; i++) {
      const y = rand(0.54, 0.84);
      pusher.coins.push(makeCoin(rand(-0.55, 0.55), y, 200, { bonus: true, rot: rand(0, TAU) }));
    }
    pusher.totalValue = pusher.coins.reduce((sum, c) => sum + c.value, 0);
  }

  function dropCoin(value) {
    if (pusher.dropCooldown > 0 || state.mode !== 'pusher') return;
    if (state.coins < value) {
      claimFreeCoins();
      return;
    }
    initAudio();
    state.coins -= value;
    state.plays += 1;
    pusher.dropCooldown = 0.12;
    pusher.dropsSinceBonus += 1;
    pusher.pressure = Math.min(1.6, pusher.pressure + 0.09);

    pusher.coins.push(makeCoin(pusher.aimX, 0.445, value, {
      z: 1.08,
      vz: 0.12,
      spin: rand(-4, 4)
    }));

    sfx.drop();
    updateWallet(-value);
    updateStats();
    syncControls();
    dismissHint();
    setTicker('A ' + fmt(value) + ' COIN DROPS IN');
    scheduleSave();

    if (pusher.dropsSinceBonus >= 8) {
      pusher.dropsSinceBonus = 0;
      pusher.bonusDelay = 0.55;
    }
  }

  function addBonusCoin() {
    pusher.coins.push(makeCoin(rand(-0.52, 0.52), rand(0.5, 0.66), BONUS_AMOUNT, {
      bonus: true,
      z: 1.05,
      vz: 0.2,
      spin: rand(-5, 5)
    }));
    toast('<b>BONUS 200 COIN</b> just hit the table', 'cyan', '✦');
    sfx.prize();
    setTicker('BONUS COIN · 200 ON THE TABLE');
  }

  function collectPusherCoin(coin) {
    const pos = projectPusher(coin.x, 1.02);
    spawnBurst(pos.x, pos.y, [COIN_META[coin.value].rim, '#fff3bd', coin.bonus ? '#8ff4ce' : '#ffd166'], coin.bonus ? 22 : 8, coin.bonus ? 150 : 70);
    spawnFloat(pos.x, pos.y - 10, '+' + fmt(coin.value), coin.bonus ? '#8ff4ce' : '#ffd166', coin.bonus ? 18 : 13);
    fx.rings.push({ x: pos.x, y: pos.y, r: 8, max: coin.bonus ? 52 : 26, life: 0.55, maxLife: 0.55, color: coin.bonus ? '110,231,249' : '255,209,102' });
    if (coin.bonus) {
      toast('<b>200 coin</b> over the lip!', 'cyan', '★');
      showBigWin('BONUS COIN', 200, 'ADDED TO YOUR BANK');
      sfx.jackpot();
    } else if (coin.value >= 200) {
      toast('<b>200 coin</b> collected', 'gold', '★');
      sfx.prize();
    } else {
      sfx.coin();
    }
  }

  function updatePusher(dt) {
    pusher.dropCooldown = Math.max(0, pusher.dropCooldown - dt);
    const previousP = pusher.p;
    pusher.phase += dt * 1.3;
    pusher.p = 0.24 + 0.09 * (1 - Math.cos(pusher.phase));
    const pushSpeed = (pusher.p - previousP) / Math.max(dt, 0.0001);
    const advancing = pushSpeed > 0.004;
    pusher.pressure = Math.max(0, pusher.pressure - dt * 0.075);
    const pileDrive = advancing && pusher.pressure > 0
      ? 0.045 * pusher.pressure * clamp(pushSpeed / 0.1, 0, 1)
      : 0;

    if (pusher.bonusDelay > 0) {
      pusher.bonusDelay -= dt;
      if (pusher.bonusDelay <= 0) addBonusCoin();
    }

    let collected = 0;
    let frameBest = 0;

    for (let i = pusher.coins.length - 1; i >= 0; i--) {
      const coin = pusher.coins[i];

      if (coin.z > 0) {
        coin.vz -= 8.4 * dt;
        coin.z += coin.vz * dt;
        if (coin.z <= 0) {
          coin.z = 0;
          coin.vz = 0;
          const pos = projectPusher(coin.x, coin.y);
          fx.rings.push({ x: pos.x, y: pos.y, r: 3, max: 18, life: 0.35, maxLife: 0.35, color: '255,209,102' });
          sfx.land();
        }
        continue;
      }

      if (advancing && coin.y < pusher.p + coin.r && coin.y > pusher.p - 0.26) {
        coin.y = pusher.p + coin.r;
        coin.vy = Math.max(coin.vy, pushSpeed * 1.2 + 0.024);
      }

      // The whole pile carries pressure when the player feeds the machine.
      // This keeps the front row moving instead of letting a sparse pile stall.
      coin.vy += pileDrive * dt;

      const drag = Math.exp(-2.6 * dt);
      coin.vx *= drag;
      coin.vy *= Math.exp(-1.75 * dt);
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.rot += coin.spin * dt;

      if (coin.x < -0.935) {
        coin.x = -0.935;
        coin.vx = Math.abs(coin.vx) * 0.18;
      } else if (coin.x > 0.935) {
        coin.x = 0.935;
        coin.vx = -Math.abs(coin.vx) * 0.18;
      }

      if (coin.y < 0.17) {
        coin.y = 0.17;
        coin.vy = Math.abs(coin.vy) * 0.15;
      }

      if (coin.y > 1.018) {
        pusher.coins.splice(i, 1);
        collected += coin.value;
        frameBest = Math.max(frameBest, coin.value);
        collectPusherCoin(coin);
      }
    }

    // Resolve the pile. Positional separation is what lets the blade
    // transfer its motion through a crowd of coins.
    for (let i = 0; i < pusher.coins.length; i++) {
      const a = pusher.coins[i];
      if (a.z > 0.02) continue;
      for (let j = i + 1; j < pusher.coins.length; j++) {
        const b = pusher.coins[j];
        if (b.z > 0.02) continue;
        let dx = b.x - a.x;
        let dy = (b.y - a.y) * 0.92;
        let dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r;
        if (dist >= minDist) continue;
        if (dist < 0.0001) {
          dx = rand(-1, 1);
          dy = rand(-1, 1);
          dist = Math.hypot(dx, dy) || 1;
        }
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= (ny * overlap * 0.5) / 0.92;
        b.x += nx * overlap * 0.5;
        b.y += (ny * overlap * 0.5) / 0.92;
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const impulse = (-(1.16) * vn) / 2;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }

    if (collected > 0) {
      state.coins += collected;
      state.totalWon += collected;
      state.bestWin = Math.max(state.bestWin, frameBest);
      updateWallet(collected);
      updateStats();
      syncControls();
      scheduleSave();
    }
  }

  // ---------- Claw machine ----------

  function makePrize(type, x, y) {
    return {
      uid: Math.random().toString(36).slice(2),
      type,
      x,
      y,
      wobble: rand(0, TAU)
    };
  }

  function findPrizeSpot(type, avoid = []) {
    for (let attempt = 0; attempt < 240; attempt++) {
      const x = rand(0.14, 0.91);
      const y = rand(0.15, 0.89);
      let clear = true;
      for (const p of claw.prizes.concat(avoid)) {
        const dx = (x - p.x) * 1.08;
        const dy = (y - p.y) * 0.72;
        if (Math.hypot(dx, dy) < 0.17) {
          clear = false;
          break;
        }
      }
      if (clear) return { x, y };
    }
    return { x: rand(0.16, 0.9), y: rand(0.2, 0.88) };
  }

  function addPrizeToCase(type) {
    const spot = findPrizeSpot(type);
    claw.prizes.push(makePrize(type, spot.x, spot.y));
  }

  function restockClaw(full = false) {
    if (full) claw.prizes = [];
    let guard = 0;
    while (claw.prizes.length < 10 && guard < 16) {
      addPrizeToCase(weightedPrize());
      guard++;
    }
    if (!claw.prizes.some((p) => p.type.value >= 100)) {
      const spot = findPrizeSpot(PRIZE_TYPES.crown);
      claw.prizes.push(makePrize(PRIZE_TYPES.crown, spot.x, spot.y));
    }
  }

  function findClawCandidate(target) {
    let best = null;
    let bestDist = Infinity;
    const L = view.claw;
    if (!L) return null;
    for (const prize of claw.prizes) {
      const point = clawPrizePoint(prize);
      const dx = point.x - (L.field.l + target.x * L.field.w);
      const dy = (point.y - (L.field.t + target.y * L.field.h)) * 0.72;
      const dist = Math.hypot(dx, dy);
      const reach = clawPrizeSize(prize) * 1.32;
      if (dist < reach && dist < bestDist) {
        bestDist = dist;
        best = { prize, dist, reach, precision: 1 - dist / reach };
      }
    }
    return best;
  }

  function startClaw() {
    if (claw.phase !== 'idle') return;
    if (state.coins < CLAW_COST) {
      claimFreeCoins();
      return;
    }
    initAudio();
    state.coins -= CLAW_COST;
    state.plays += 1;
    claw.phase = 'descend';
    claw.t = 0;
    claw.target = { x: claw.aim.x, y: claw.aim.y };
    claw.held = null;
    claw.success = false;
    claw.resolved = false;
    claw.credit = false;
    claw.slip = false;
    claw.close = 0;
    claw.candidate = findClawCandidate(claw.target);
    sfx.motor();
    updateWallet(-CLAW_COST);
    updateStats();
    syncControls();
    dismissHint();
    setTicker('CLAW DESCENDING · HOLD YOUR BREATH');
    scheduleSave();
  }

  function resolveGrab() {
    claw.resolved = true;
    const found = findClawCandidate(claw.target);
    claw.candidate = found;
    if (!found) {
      claw.success = false;
      claw.slip = false;
      toast('Nothing in the claw. Line it up closer.', 'pink', '×');
      sfx.slip();
      setTicker('EMPTY CLAW · ADJUST YOUR AIM');
      return;
    }
    const chance = clamp(found.prize.type.grip + found.precision * 0.14, 0.3, 0.97);
    if (Math.random() < chance) {
      claw.success = true;
      claw.held = found.prize;
      claw.prizes = claw.prizes.filter((p) => p.uid !== found.prize.uid);
      sfx.grab();
      setTicker('GOT IT · ' + found.prize.type.name.toUpperCase());
    } else {
      claw.success = false;
      claw.slip = true;
      toast('<b>' + found.prize.type.name + '</b> slipped away!', 'pink', '!');
      sfx.slip();
      setTicker('SLIPPED · HEAVY PRIZE');
    }
  }

  function creditPrize(prize) {
    state.coins += prize.type.value;
    state.totalWon += prize.type.value;
    state.bestWin = Math.max(state.bestWin, prize.type.value);
    state.collection.unshift({
      type: prize.type.id,
      name: prize.type.name,
      value: prize.type.value,
      ts: Date.now()
    });
    state.collection = state.collection.slice(0, 40);
    claw.credit = true;
    claw.held = null;

    const L = view.claw;
    const x = L.field.l + L.chuteX * L.field.w;
    const y = L.hoverY;
    spawnFloat(x, y - 24, '+' + fmt(prize.type.value), '#ffd166', 20);
    spawnBurst(x, y, ['#ffd166', '#ff5d8f', '#6ee7f9', '#78f2b1'], 34, 190);
    for (let i = 0; i < 18; i++) {
      fx.confetti.push({
        x: x + rand(-16, 16), y: y + rand(-8, 8),
        vx: rand(-130, 130), vy: rand(-260, -90),
        rot: rand(0, TAU), spin: rand(-8, 8), size: rand(3, 7),
        color: pick(['#ffd166', '#ff5d8f', '#6ee7f9', '#78f2b1']),
        life: 1.6, maxLife: 1.6
      });
    }

    if (prize.type.value >= 500) {
      showBigWin('JACKPOT', prize.type.value, 'THE GOLDEN BEAR IS YOURS');
      sfx.jackpot();
      toast('<b>JACKPOT!</b> Golden Bear +500 coins', 'pink', '★');
    } else if (prize.type.value >= 200) {
      showBigWin('MEGA PRIZE', prize.type.value, 'COINS ADDED TO YOUR BANK');
      sfx.jackpot();
      toast('<b>' + prize.type.name + '</b> +' + prize.type.value + ' coins', 'cyan', '★');
    } else {
      sfx.prize();
      toast('<b>' + prize.type.name + '</b> +' + prize.type.value + ' coins', 'gold', prize.type.emoji);
    }

    renderShelf();
    updateWallet(prize.type.value);
    updateStats();
    scheduleSave();
  }

  function updateClaw(dt) {
    if (claw.phase === 'idle') {
      const follow = 1 - Math.exp(-9 * dt);
      claw.carriageX = lerp(claw.carriageX, claw.aim.x, follow);
      claw.close = Math.max(0, claw.close - dt * 3);
      if (claw.restockTimer > 0) {
        claw.restockTimer -= dt;
        if (claw.restockTimer <= 0 && claw.prizes.length < 7) {
          restockClaw();
          toast('Fresh prizes loaded into the glass', 'cyan', '✦');
          setTicker('PRIZE REFILL · ' + claw.prizes.length + ' IN THE GLASS');
        }
      }
      return;
    }

    claw.t += dt;

    if (claw.phase === 'descend') {
      claw.carriageX = claw.target.x;
      if (claw.t >= 0.82) {
        claw.phase = 'grab';
        claw.t = 0;
      }
      return;
    }

    if (claw.phase === 'grab') {
      claw.close = easeOut(claw.t / 0.26);
      if (!claw.resolved && claw.t > 0.23) resolveGrab();
      if (claw.t >= 0.52) {
        claw.phase = 'lift';
        claw.t = 0;
      }
      return;
    }

    if (claw.phase === 'lift') {
      claw.close = 1;
      if (claw.t >= 0.72) {
        claw.phase = 'return';
        claw.t = 0;
      }
      return;
    }

    if (claw.phase === 'return') {
      claw.carriageX = lerp(claw.target.x, view.claw.chuteX, easeInOut(claw.t / 0.78));
      if (claw.t >= 0.78) {
        claw.phase = 'release';
        claw.t = 0;
      }
      return;
    }

    if (claw.phase === 'release') {
      claw.carriageX = view.claw.chuteX;
      claw.close = 1 - easeOut(clamp((claw.t - 0.08) / 0.28, 0, 1));
      if (claw.success && !claw.credit && claw.t > 0.22) creditPrize(claw.held || claw.candidate.prize);
      if (claw.t >= 0.74) {
        claw.phase = 'idle';
        claw.t = 0;
        claw.held = null;
        claw.close = 0;
        claw.success = false;
        claw.resolved = false;
        claw.slip = false;
        if (claw.prizes.length < 7) claw.restockTimer = 0.45;
        syncControls();
      }
    }
  }

  function claimFreeCoins() {
    if (state.coins >= CLAW_COST) return;
    state.coins += 100;
    updateWallet(100);
    updateStats();
    syncControls();
    scheduleSave();
    initAudio();
    sfx.free();
    toast('<b>100 free coins</b> added to your bank', 'cyan', '✦');
    setTicker('FREE COIN BOOST · BACK IN THE GAME');
  }

  function setDenomination(value) {
    if (!DENOMS.includes(value)) return;
    state.denom = value;
    syncControls();
    scheduleSave();
    sfx.click();
    if (state.mode === 'pusher') setHint('Tap the table to drop a ' + value + ' coin');
  }

  // ---------- Drawing helpers ----------

  const BOKEH = Array.from({ length: 13 }, () => ({
    x: Math.random(),
    y: Math.random() * 0.72,
    r: rand(18, 85),
    hue: pick(['255,93,143', '110,231,249', '255,209,102', '150,120,255']),
    a: rand(0.02, 0.075),
    speed: rand(0.25, 1.1),
    phase: rand(0, TAU)
  }));

  function starPath(c, x, y, outer, inner = outer * 0.45, points = 5) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  }

  function drawBackground() {
    const w = view.w;
    const h = view.h;
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, Math.max(w, h) * 0.72);
    bg.addColorStop(0, '#16172a');
    bg.addColorStop(0.45, '#0c0e18');
    bg.addColorStop(1, '#05060b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (const b of BOKEH) {
      const x = b.x * w + Math.sin(clock * b.speed + b.phase) * 16;
      const y = b.y * h + Math.cos(clock * b.speed * 0.8 + b.phase) * 11;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, 'rgba(' + b.hue + ',' + b.a + ')');
      g.addColorStop(1, 'rgba(' + b.hue + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, TAU);
      ctx.fill();
    }

    // Faint carpet perspective beneath the cabinet.
    ctx.save();
    ctx.globalAlpha = 0.16;
    const horizon = h * 0.78;
    const vpx = w / 2;
    ctx.strokeStyle = 'rgba(255,209,102,0.18)';
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(vpx + i * 12, horizon);
      ctx.lineTo(vpx + i * w * 0.18, h * 1.08);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const y = horizon + Math.pow(i / 6, 1.7) * h * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, w * 0.5);
    glow.addColorStop(0, 'rgba(255,176,42,0.04)');
    glow.addColorStop(1, 'rgba(255,176,42,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  function drawMachineShell(L, accent) {
    const x = L.cabL;
    const y = L.h * 0.018;
    const w = L.cabW;
    const h = L.h * 0.965;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    roundRect(ctx, x, y, w, h, Math.min(30, w * 0.03));
    const shell = ctx.createLinearGradient(x, y, x + w, y + h);
    shell.addColorStop(0, '#201a26');
    shell.addColorStop(0.3, '#11121c');
    shell.addColorStop(0.72, '#0b0c14');
    shell.addColorStop(1, '#17131d');
    ctx.fillStyle = shell;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = accent === 'pink' ? 'rgba(255,93,143,0.26)' : 'rgba(255,209,102,0.24)';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const inner = ctx.createLinearGradient(x, y, x, y + h);
    inner.addColorStop(0, 'rgba(255,255,255,0.07)');
    inner.addColorStop(0.2, 'rgba(255,255,255,0)');
    inner.addColorStop(0.85, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = inner;
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.min(29, w * 0.029));
    ctx.fill();
    ctx.restore();

    // Side neon tubes.
    const tube = accent === 'pink' ? '255,93,143' : '255,209,102';
    for (const side of [x + 9, x + w - 9]) {
      const grad = ctx.createLinearGradient(0, y + 30, 0, y + h - 30);
      grad.addColorStop(0, 'rgba(' + tube + ',0)');
      grad.addColorStop(0.25, 'rgba(' + tube + ',0.5)');
      grad.addColorStop(0.75, 'rgba(' + tube + ',0.5)');
      grad.addColorStop(1, 'rgba(' + tube + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(side, y + 30, 2, h - 60);
    }
  }

  function drawMarquee(L, opts) {
    const m = L.marquee;
    const isPink = opts.accent === 'pink';
    const accent = isPink ? '255,93,143' : '255,183,43';

    ctx.save();
    ctx.shadowColor = 'rgba(' + accent + ',0.28)';
    ctx.shadowBlur = 28;
    roundRect(ctx, m.x, m.y, m.w, m.h, Math.min(17, m.h * 0.22));
    const panel = ctx.createLinearGradient(m.x, m.y, m.x + m.w, m.y + m.h);
    panel.addColorStop(0, isPink ? '#331326' : '#2c1d0d');
    panel.addColorStop(0.48, isPink ? '#1b1020' : '#17120e');
    panel.addColorStop(1, isPink ? '#301226' : '#2b1c0b');
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(' + accent + ',0.7)';
    ctx.stroke();

    const inset = Math.min(7, m.h * 0.13);
    roundRect(ctx, m.x + inset, m.y + inset, m.w - inset * 2, m.h - inset * 2, Math.min(12, m.h * 0.14));
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + accent + ',0.25)';
    ctx.stroke();

    // Chasing bulbs.
    const bulbs = Math.max(8, Math.floor(m.w / 42));
    for (let i = 0; i < bulbs; i++) {
      const t = bulbs === 1 ? 0.5 : i / (bulbs - 1);
      const bx = m.x + inset + t * (m.w - inset * 2);
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(clock * 5 + i * 0.9));
      for (const by of [m.y + 3, m.y + m.h - 3]) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + accent + ',' + (0.22 + pulse * 0.7) + ')';
        ctx.arc(bx, by, Math.max(1.5, m.h * 0.024), 0, TAU);
        ctx.fill();
        if (pulse > 0.62) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + accent + ',0.08)';
          ctx.arc(bx, by, Math.max(5, m.h * 0.075), 0, TAU);
          ctx.fill();
        }
      }
    }

    const titleSize = clamp(m.w * 0.071, 17, 43);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 ' + titleSize + 'px "Arial Black", "Trebuchet MS", sans-serif';
    const titleGrad = ctx.createLinearGradient(0, m.y + m.h * 0.2, 0, m.y + m.h * 0.78);
    titleGrad.addColorStop(0, isPink ? '#ffe6f1' : '#fff9d5');
    titleGrad.addColorStop(0.48, isPink ? '#ff9fc0' : '#ffd166');
    titleGrad.addColorStop(1, isPink ? '#ff4c89' : '#f2a216');
    ctx.fillStyle = titleGrad;
    ctx.shadowColor = 'rgba(' + accent + ',0.55)';
    ctx.shadowBlur = 16;
    ctx.fillText(opts.title, L.cx, m.y + m.h * 0.49);
    ctx.shadowColor = 'transparent';

    ctx.font = '900 ' + clamp(m.w * 0.015, 6, 9) + 'px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(' + accent + ',0.7)';
    ctx.fillText(opts.sub, L.cx, m.y + m.h * 0.78);
    ctx.restore();
  }

  // ---------- Pusher drawing ----------

  function drawPusher() {
    const L = view.pusher;
    drawMachineShell(L, 'gold');
    drawMarquee(L, { title: 'GOLD RUSH', sub: 'DROP · PUSH · COLLECT', accent: 'gold' });
    drawPusherTable(L);

    const p = pusher.p;
    const behind = pusher.coins.filter((c) => c.y < p - 0.004).sort((a, b) => a.y - b.y);
    const front = pusher.coins.filter((c) => c.y >= p - 0.004).sort((a, b) => a.y - b.y);
    behind.forEach(drawCoin);
    drawPusherPlate(L);
    front.forEach(drawCoin);
    drawPusherLip(L);
    drawPusherAim(L);
    drawPusherTray(L);
  }

  function drawPusherTable(L) {
    const rimBackL = projectPusher(-1.035, -0.015);
    const rimBackR = projectPusher(1.035, -0.015);
    const rimFrontR = projectPusher(1.035, 1.025);
    const rimFrontL = projectPusher(-1.035, 1.025);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    polygon(ctx, [[rimBackL.x, rimBackL.y], [rimBackR.x, rimBackR.y], [rimFrontR.x, rimFrontR.y], [rimFrontL.x, rimFrontL.y]]);
    ctx.fillStyle = '#22160d';
    ctx.fill();
    ctx.restore();

    const backL = projectPusher(-1, 0);
    const backR = projectPusher(1, 0);
    const frontR = projectPusher(1, 1);
    const frontL = projectPusher(-1, 1);

    ctx.save();
    polygon(ctx, [[backL.x, backL.y], [backR.x, backR.y], [frontR.x, frontR.y], [frontL.x, frontL.y]]);
    const felt = ctx.createLinearGradient(0, backL.y, 0, frontL.y);
    felt.addColorStop(0, '#173438');
    felt.addColorStop(0.35, '#0e2a2e');
    felt.addColorStop(0.75, '#0a2025');
    felt.addColorStop(1, '#07171b');
    ctx.fillStyle = felt;
    ctx.fill();
    ctx.clip();

    const spot = ctx.createRadialGradient(L.cx, L.top + L.tableH * 0.38, 0, L.cx, L.top + L.tableH * 0.38, L.frontHalf * 1.25);
    spot.addColorStop(0, 'rgba(101,218,205,0.12)');
    spot.addColorStop(0.55, 'rgba(41,138,131,0.04)');
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, L.top, L.w, L.tableH);

    // Faint depth grid.
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const y = i / 10;
      const a = projectPusher(-1, y);
      const b = projectPusher(1, y);
      ctx.strokeStyle = 'rgba(130,238,222,' + (0.018 + y * 0.02) + ')';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let i = -4; i <= 4; i++) {
      const x = i / 4;
      const a = projectPusher(x, 0);
      const b = projectPusher(x, 1);
      ctx.strokeStyle = 'rgba(130,238,222,0.018)';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();

    // Rails and rim.
    ctx.save();
    ctx.lineCap = 'round';
    const rimGrad = ctx.createLinearGradient(0, backL.y, 0, frontL.y);
    rimGrad.addColorStop(0, '#8e6428');
    rimGrad.addColorStop(0.5, '#ffd166');
    rimGrad.addColorStop(1, '#8b520c');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = clamp(L.w * 0.004, 2, 5);
    polygon(ctx, [[backL.x, backL.y], [backR.x, backR.y], [frontR.x, frontR.y], [frontL.x, frontL.y]]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,246,200,0.45)';
    ctx.lineWidth = 1;
    polygon(ctx, [[backL.x, backL.y + 1], [backR.x, backR.y + 1], [frontR.x, frontR.y - 1], [frontL.x, frontL.y - 1]]);
    ctx.stroke();

    // Side walls.
    ctx.strokeStyle = 'rgba(255,193,58,0.32)';
    ctx.lineWidth = clamp(L.w * 0.009, 4, 11);
    ctx.beginPath();
    ctx.moveTo(backL.x - 2, backL.y);
    ctx.lineTo(frontL.x - 4, frontL.y);
    ctx.moveTo(backR.x + 2, backR.y);
    ctx.lineTo(frontR.x + 4, frontR.y);
    ctx.stroke();

    // Rivets on the rails.
    for (let i = 0; i < 7; i++) {
      const y = 0.05 + i * 0.145;
      for (const side of [-1, 1]) {
        const p = projectPusher(side * 1.015, y);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,224,144,0.55)';
        ctx.arc(p.x, p.y, Math.max(1.1, L.w * 0.0016), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    // Chute at the back of the table.
    const chute = projectPusher(0, 0.025);
    const chuteW = clamp(L.w * 0.12, 42, 108);
    ctx.save();
    roundRect(ctx, chute.x - chuteW / 2, chute.y - chuteW * 0.16, chuteW, chuteW * 0.32, chuteW * 0.1);
    const chuteGrad = ctx.createLinearGradient(0, chute.y - chuteW * 0.16, 0, chute.y + chuteW * 0.16);
    chuteGrad.addColorStop(0, '#04070a');
    chuteGrad.addColorStop(1, '#1e2a2c');
    ctx.fillStyle = chuteGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = '900 ' + clamp(L.w * 0.012, 5, 8) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,209,102,0.8)';
    ctx.fillText('COIN DROP', chute.x, chute.y - chuteW * 0.01);
    ctx.restore();
  }

  function drawCoin(coin) {
    const L = view.pusher;
    const meta = COIN_META[coin.value] || COIN_META[10];
    const pos = projectPusher(coin.x, coin.y, coin.z);
    const rx = L.coinBase * pos.scale * (1 + (meta.stack - 1) * 0.035);
    const ry = rx * 0.52;
    const stack = Math.max(1.2, rx * 0.12 * meta.stack);
    const ground = projectPusher(coin.x, coin.y, 0);
    const lift = Math.max(0, ground.y - pos.y);

    ctx.save();
    if (coin.z > 0.02) {
      ctx.globalAlpha = clamp(1 - coin.z * 0.35, 0.35, 0.85);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.ellipse(ground.x + 2, ground.y + 3, rx * 0.95, ry * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (coin.bonus) {
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rx * 2.8);
      glow.addColorStop(0, 'rgba(110,231,249,0.32)');
      glow.addColorStop(0.5, 'rgba(255,209,102,0.12)');
      glow.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rx * 2.8, 0, TAU);
      ctx.fill();
    }

    ctx.translate(pos.x, pos.y);
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.ellipse(1.5, ry * 0.75 + stack + 2, rx, ry, 0, 0, TAU);
    ctx.fill();

    // Side wall.
    ctx.beginPath();
    ctx.fillStyle = meta.low;
    ctx.ellipse(0, stack, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillRect(-rx, 0, rx * 2, stack);
    ctx.beginPath();
    ctx.fillStyle = meta.mid;
    ctx.ellipse(0, stack, rx * 0.97, ry * 0.96, 0, 0, TAU);
    ctx.fill();

    // Top face.
    ctx.beginPath();
    const face = ctx.createLinearGradient(-rx, -ry, rx, ry);
    face.addColorStop(0, meta.top);
    face.addColorStop(0.38, meta.mid);
    face.addColorStop(0.7, meta.rim);
    face.addColorStop(1, meta.low);
    ctx.fillStyle = face;
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(0.7, rx * 0.08);
    ctx.strokeStyle = meta.rim;
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(50,30,0,0.28)';
    ctx.lineWidth = Math.max(0.6, rx * 0.06);
    ctx.ellipse(0, 0, rx * 0.72, ry * 0.72, 0, 0, TAU);
    ctx.stroke();

    // Face mark.
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(coin.rot);
    ctx.fillStyle = meta.ink;
    ctx.globalAlpha = 0.78;
    if (coin.value >= 100) {
      starPath(ctx, 0, 0, rx * 0.4, rx * 0.18);
      ctx.fill();
    } else {
      ctx.font = '900 ' + Math.max(4, rx * 0.54) + 'px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(coin.value), 0, 0.5);
    }
    ctx.restore();

    // Glint.
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(0.7, rx * 0.06);
    ctx.arc(0, 0, rx * 0.82, Math.PI * 1.08, Math.PI * 1.5);
    ctx.stroke();

    if (coin.z > 0.02) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,246,194,0.7)';
      ctx.arc(rx * 0.35, -ry * 0.35, Math.max(0.8, rx * 0.09), 0, TAU);
      ctx.fill();
    }

    if (lift > 0) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.strokeStyle = meta.rim;
      ctx.lineWidth = 1;
      ctx.moveTo(0, ry + stack);
      ctx.lineTo(0, ry + stack + lift);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPusherPlate(L) {
    const p = pusher.p;
    const backY = Math.max(0.015, p - 0.2);
    const a = projectPusher(-0.865, backY);
    const b = projectPusher(0.865, backY);
    const c = projectPusher(0.865, p);
    const d = projectPusher(-0.865, p);

    ctx.save();
    // Cast shadow.
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#000';
    polygon(ctx, [
      [a.x + 4, a.y + 10], [b.x + 4, b.y + 10], [c.x + 4, c.y + 16], [d.x + 4, d.y + 16]
    ]);
    ctx.fill();
    ctx.globalAlpha = 1;

    polygon(ctx, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]]);
    const metal = ctx.createLinearGradient(0, a.y, 0, c.y);
    metal.addColorStop(0, '#5d6877');
    metal.addColorStop(0.18, '#c3d0dd');
    metal.addColorStop(0.36, '#8997a7');
    metal.addColorStop(0.62, '#dce7f0');
    metal.addColorStop(0.82, '#7d8b9b');
    metal.addColorStop(1, '#b3c0ce');
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.stroke();

    // Top sheen.
    ctx.globalAlpha = 0.32;
    polygon(ctx, [
      [lerp(a.x, d.x, 0.1), lerp(a.y, d.y, 0.1)],
      [lerp(b.x, c.x, 0.1), lerp(b.y, c.y, 0.1)],
      [lerp(b.x, c.x, 0.29), lerp(b.y, c.y, 0.29)],
      [lerp(a.x, d.x, 0.29), lerp(a.y, d.y, 0.29)]
    ]);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.globalAlpha = 1;

    // Recessed steel panel.
    const inset = (t, side) => side === 'l'
      ? [lerp(a.x, d.x, t) + (b.x - a.x) * 0.08, lerp(a.y, d.y, t) + (b.y - a.y) * 0.08]
      : [lerp(b.x, c.x, t) - (b.x - a.x) * 0.08, lerp(b.y, c.y, t) - (b.y - a.y) * 0.08];
    const ia = inset(0.18, 'l');
    const ib = inset(0.18, 'r');
    const ic = inset(0.84, 'r');
    const id = inset(0.84, 'l');
    polygon(ctx, [ia, ib, ic, id]);
    const insetGrad = ctx.createLinearGradient(0, ia[1], 0, ic[1]);
    insetGrad.addColorStop(0, 'rgba(40,48,60,0.42)');
    insetGrad.addColorStop(0.48, 'rgba(212,225,236,0.16)');
    insetGrad.addColorStop(1, 'rgba(33,40,52,0.48)');
    ctx.fillStyle = insetGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,37,48,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Panel seams.
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const left = [lerp(ia[0], id[0], t), lerp(ia[1], id[1], t)];
      const right = [lerp(ib[0], ic[0], t), lerp(ib[1], ic[1], t)];
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(35,43,55,0.36)';
      ctx.lineWidth = 1;
      ctx.moveTo(left[0], left[1]);
      ctx.lineTo(right[0], right[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.moveTo(left[0], left[1] + 1);
      ctx.lineTo(right[0], right[1] + 1);
      ctx.stroke();
    }

    // Gold corner bolts and center chevrons.
    for (const pt of [ia, ib, ic, id]) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,209,102,0.75)';
      ctx.arc(pt[0], pt[1], Math.max(1.1, L.w * 0.0018), 0, TAU);
      ctx.fill();
    }
    const midY = (ia[1] + ic[1]) / 2;
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#fff8d9';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(L.cx + i * L.w * 0.035 - L.w * 0.018, midY - 5);
      ctx.lineTo(L.cx + i * L.w * 0.035 + L.w * 0.012, midY);
      ctx.lineTo(L.cx + i * L.w * 0.035 - L.w * 0.018, midY + 5);
      ctx.stroke();
    }
    ctx.restore();

    // Front face thickness.
    const d2 = projectPusher(-0.865, p + 0.015);
    const c2 = projectPusher(0.865, p + 0.015);
    polygon(ctx, [[d.x, d.y], [c.x, c.y], [c2.x, c2.y], [d2.x, d2.y]]);
    const edge = ctx.createLinearGradient(0, d.y, 0, d2.y);
    edge.addColorStop(0, '#6e7887');
    edge.addColorStop(1, '#202733');
    ctx.fillStyle = edge;
    ctx.fill();

    // Blade lights.
    for (let i = 0; i < 7; i++) {
      const t = 0.1 + (i / 6) * 0.8;
      const x = lerp(d.x, c.x, t);
      const y = lerp(d.y, c.y, t) + 1;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,209,102,' + (0.45 + 0.3 * Math.sin(clock * 3 + i)) + ')';
      ctx.arc(x, y, Math.max(1.1, L.w * 0.0019), 0, TAU);
      ctx.fill();
    }

    ctx.font = '900 ' + clamp(L.w * 0.013, 5, 8) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(28,34,44,0.48)';
    ctx.fillText('PUSH', L.cx, (a.y + c.y) / 2);
    ctx.restore();
  }

  function drawPusherLip(L) {
    const a = projectPusher(-1, 1);
    const b = projectPusher(1, 1);
    const c = projectPusher(1.035, 1.065);
    const d = projectPusher(-1.035, 1.065);
    ctx.save();
    polygon(ctx, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]]);
    const lip = ctx.createLinearGradient(0, a.y, 0, c.y);
    lip.addColorStop(0, '#fff1a6');
    lip.addColorStop(0.25, '#ffd166');
    lip.addColorStop(0.7, '#a96408');
    lip.addColorStop(1, '#4c2b02');
    ctx.fillStyle = lip;
    ctx.fill();
    ctx.shadowColor = 'rgba(255,189,50,0.55)';
    ctx.shadowBlur = 18;
    ctx.strokeStyle = 'rgba(255,239,174,0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawPusherAim(L) {
    const x = clamp(pusher.aimX, -0.92, 0.92);
    const top = projectPusher(x, 0.045);
    const land = projectPusher(x, 0.455);
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4.2);

    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(255,209,102,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(land.x, land.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255,209,102,' + (0.35 + pulse * 0.35) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(land.x, land.y, L.coinBase * 1.1 + pulse * 4, (L.coinBase * 1.1 + pulse * 4) * 0.52, 0, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,209,102,0.11)';
    ctx.beginPath();
    ctx.ellipse(land.x, land.y, L.coinBase * 0.9, L.coinBase * 0.47, 0, 0, TAU);
    ctx.fill();

    const preview = COIN_META[state.denom];
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    const pg = ctx.createLinearGradient(land.x - 10, land.y - 10, land.x + 10, land.y + 10);
    pg.addColorStop(0, preview.top);
    pg.addColorStop(0.5, preview.mid);
    pg.addColorStop(1, preview.low);
    ctx.fillStyle = pg;
    ctx.ellipse(land.x, land.y, L.coinBase * 0.82, L.coinBase * 0.43, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = preview.rim;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '900 ' + clamp(L.w * 0.011, 5, 8) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,209,102,0.65)';
    ctx.fillText(String(state.denom), land.x, land.y + 0.5);
    ctx.restore();
  }

  function drawPusherTray(L) {
    const w = L.frontHalf * 1.5;
    const x = L.cx - w / 2;
    const y = L.trayY;
    const h = L.trayH;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 7;
    roundRect(ctx, x, y, w, h, 12);
    const tray = ctx.createLinearGradient(0, y, 0, y + h);
    tray.addColorStop(0, '#171009');
    tray.addColorStop(0.5, '#0b0b10');
    tray.addColorStop(1, '#050609');
    ctx.fillStyle = tray;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,209,102,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // A few coins resting in the return tray.
    const coinR = clamp(h * 0.17, 4, 9);
    for (let i = 0; i < 6; i++) {
      const cx = x + w * (0.2 + (i % 3) * 0.13) + (i > 2 ? w * 0.18 : 0);
      const cy = y + h * 0.55 + (i % 2) * h * 0.16;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,190,52,0.18)';
      ctx.ellipse(cx, cy + 2, coinR, coinR * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = i % 2 ? '#ffd166' : '#e6a52e';
      ctx.ellipse(cx, cy, coinR, coinR * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#fff1b8';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.font = '900 ' + clamp(L.w * 0.011, 5, 8) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,209,102,0.55)';
    ctx.fillText('COIN RETURN', x + w - 10, y + h * 0.3);
    ctx.restore();
  }

  // ---------- Claw drawing ----------

  function clawTipY(L) {
    const targetY = L.field.t + claw.target.y * L.field.h;
    if (claw.phase === 'descend') return lerp(L.hoverY, targetY, easeInOut(claw.t / 0.82));
    if (claw.phase === 'grab') return targetY;
    if (claw.phase === 'lift') return lerp(targetY, L.hoverY, easeInOut(claw.t / 0.72));
    return L.hoverY + Math.sin(clock * 1.9) * 2.2;
  }

  function drawClaw() {
    const L = view.claw;
    const cabL = L.cx - L.cabW / 2;
    drawMachineShell({ ...L, cabL }, 'pink');
    drawMarquee(L, { title: 'CLAW & CO.', sub: 'GRAB A PRIZE · KEEP THE COINS', accent: 'pink' });
    drawClawCase(L);
    drawClawBase(L);
  }

  function drawClawCase(L) {
    const x = L.caseL;
    const y = L.caseTop;
    const w = L.caseW;
    const h = L.caseH;
    const r = Math.min(18, w * 0.03);

    // Outer glass frame.
    ctx.save();
    ctx.shadowColor = 'rgba(255,93,143,0.18)';
    ctx.shadowBlur = 28;
    roundRect(ctx, x - 7, y - 7, w + 14, h + 14, r + 4);
    const frame = ctx.createLinearGradient(x, y, x + w, y + h);
    frame.addColorStop(0, '#4b2c3f');
    frame.addColorStop(0.35, '#191523');
    frame.addColorStop(0.72, '#2a1524');
    frame.addColorStop(1, '#513044');
    ctx.fillStyle = frame;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,160,195,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Glass interior.
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    const glass = ctx.createLinearGradient(0, y, 0, y + h);
    glass.addColorStop(0, '#171c3d');
    glass.addColorStop(0.44, '#0d142c');
    glass.addColorStop(1, '#080b17');
    ctx.fillStyle = glass;
    ctx.fillRect(x, y, w, h);

    // Back wall glow.
    const wall = ctx.createRadialGradient(L.cx, y + h * 0.3, 0, L.cx, y + h * 0.3, w * 0.62);
    wall.addColorStop(0, 'rgba(255,93,143,0.13)');
    wall.addColorStop(0.55, 'rgba(110,231,249,0.04)');
    wall.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wall;
    ctx.fillRect(x, y, w, h);

    // String lights on the back wall.
    for (let row = 0; row < 3; row++) {
      const ly = y + h * (0.13 + row * 0.09);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.moveTo(x + w * 0.08, ly);
      ctx.quadraticCurveTo(L.cx, ly + h * 0.06, x + w * 0.92, ly);
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9;
        const bx = x + w * 0.08 + t * w * 0.84;
        const by = ly + Math.sin(t * Math.PI) * h * 0.03;
        const on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 2.4 + i + row * 1.7));
        ctx.beginPath();
        ctx.fillStyle = row === 1 ? 'rgba(110,231,249,' + (0.25 + on * 0.65) + ')' : 'rgba(255,209,102,' + (0.2 + on * 0.55) + ')';
        ctx.arc(bx, by, Math.max(1, w * 0.004), 0, TAU);
        ctx.fill();
      }
    }

    // Neon wall sign.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 ' + clamp(w * 0.042, 11, 34) + 'px "Arial Black", sans-serif';
    ctx.fillStyle = 'rgba(255,93,143,0.75)';
    ctx.shadowColor = 'rgba(255,93,143,0.8)';
    ctx.shadowBlur = 18;
    ctx.fillText('WIN BIG', L.cx, y + h * 0.12);
    ctx.restore();

    // Floor.
    const floorY = y + h * 0.6;
    const floor = ctx.createLinearGradient(0, floorY, 0, y + h);
    floor.addColorStop(0, 'rgba(18,30,58,0)');
    floor.addColorStop(0.55, 'rgba(15,34,54,0.55)');
    floor.addColorStop(1, 'rgba(4,10,18,0.95)');
    ctx.fillStyle = floor;
    ctx.fillRect(x, floorY, w, y + h - floorY);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgba(110,231,249,0.4)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(L.cx + i * w * 0.035, floorY);
      ctx.lineTo(L.cx + i * w * 0.12, y + h);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const ly = floorY + Math.pow(i / 4, 1.8) * h * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + w, ly);
      ctx.stroke();
    }
    ctx.restore();

    // Prize chute.
    const chute = {
      x: L.field.l + L.chuteX * L.field.w,
      y: L.field.b - L.field.h * 0.02,
      w: L.field.w * 0.18,
      h: L.field.h * 0.14
    };
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.ellipse(chute.x, chute.y + chute.h * 0.25, chute.w * 0.55, chute.h * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '900 ' + clamp(w * 0.011, 5, 8) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,209,102,0.7)';
    ctx.fillText('PRIZE', chute.x, chute.y + chute.h * 0.22);
    ctx.restore();

    // Aim reticle behind the prizes.
    if (claw.phase === 'idle') drawClawReticle(L, true);

    // Prizes from back to front.
    const sorted = claw.prizes.slice().sort((a, b) => a.y - b.y);
    sorted.forEach(drawClawPrize);

    // Claw carriage, cable and prongs.
    drawClawRig(L);

    // Locked reticle during a drop.
    if (claw.phase !== 'idle') drawClawReticle(L, false);

    // Glass reflections.
    ctx.save();
    const shine = ctx.createLinearGradient(x, y, x + w, y + h);
    shine.addColorStop(0, 'rgba(255,255,255,0.13)');
    shine.addColorStop(0.18, 'rgba(255,255,255,0.02)');
    shine.addColorStop(0.46, 'rgba(255,255,255,0)');
    shine.addColorStop(0.62, 'rgba(255,255,255,0.04)');
    shine.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, w, h);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#dff8ff';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.2, y + h * 0.62);
    ctx.lineTo(x + w * 0.28, y - h * 0.1);
    ctx.lineTo(x + w * 0.38, y - h * 0.1);
    ctx.lineTo(x - w * 0.1, y + h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.66, y + h * 1.1);
    ctx.lineTo(x + w * 0.9, y - h * 0.05);
    ctx.lineTo(x + w * 0.96, y - h * 0.05);
    ctx.lineTo(x + w * 0.72, y + h * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Inner glass border.
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = 'rgba(180,240,255,0.17)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(4, r - 4));
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Corner bolts.
    for (const [bx, by] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) {
      ctx.beginPath();
      ctx.fillStyle = '#c8d3e0';
      ctx.arc(bx, by, Math.max(2, w * 0.006), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawClawRig(L) {
    const railY = L.railY;
    const x = L.field.l + claw.carriageX * L.field.w;
    const tipY = clawTipY(L);
    const scale = clamp(L.caseW / 820, 0.52, 1.08);
    const sway = Math.sin(clock * 2.1) * (claw.phase === 'descend' ? 1.5 : 0.8);

    // Top rail.
    ctx.save();
    const railGrad = ctx.createLinearGradient(0, railY - 7, 0, railY + 7);
    railGrad.addColorStop(0, '#dce7f2');
    railGrad.addColorStop(0.45, '#6f7e91');
    railGrad.addColorStop(1, '#222b38');
    ctx.fillStyle = railGrad;
    roundRect(ctx, L.field.l - 8, railY - 5 * scale, L.field.w + 16, 10 * scale, 5 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Carriage.
    ctx.beginPath();
    ctx.fillStyle = '#2c3544';
    roundRect(ctx, x - 13 * scale, railY - 9 * scale, 26 * scale, 18 * scale, 5 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.arc(x, railY, 2.4 * scale, 0, TAU);
    ctx.fill();

    // Cable.
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(205,222,239,0.75)';
    ctx.lineWidth = Math.max(1, 1.6 * scale);
    ctx.moveTo(x, railY + 8 * scale);
    ctx.lineTo(x + sway, tipY - 20 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = Math.max(0.5, 0.7 * scale);
    ctx.moveTo(x - 1, railY + 8 * scale);
    ctx.lineTo(x + sway - 1, tipY - 20 * scale);
    ctx.stroke();

    drawClawHead(x + sway, tipY, scale);
    ctx.restore();
  }

  function drawClawHead(x, y, scale) {
    const close = clamp(claw.close, 0, 1);
    ctx.save();
    ctx.translate(x, y);

    // Hub.
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8 * scale;
    roundRect(ctx, -13 * scale, -24 * scale, 26 * scale, 15 * scale, 5 * scale);
    const hub = ctx.createLinearGradient(0, -24 * scale, 0, -9 * scale);
    hub.addColorStop(0, '#f0f6ff');
    hub.addColorStop(0.45, '#9caaba');
    hub.addColorStop(1, '#3d495a');
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#1b202b';
    ctx.arc(0, -10 * scale, 5 * scale, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#ffd166';
    ctx.arc(0, -10 * scale, 2.2 * scale, 0, TAU);
    ctx.fill();

    // Prongs.
    const open = lerp(1, 0.18, close);
    const prongGrad = ctx.createLinearGradient(-25 * scale, 0, 25 * scale, 0);
    prongGrad.addColorStop(0, '#5c6879');
    prongGrad.addColorStop(0.25, '#e8f0fa');
    prongGrad.addColorStop(0.5, '#a6b3c2');
    prongGrad.addColorStop(0.75, '#e8f0fa');
    prongGrad.addColorStop(1, '#5c6879');
    ctx.strokeStyle = prongGrad;
    ctx.lineWidth = Math.max(2, 5.2 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 8 * scale, -10 * scale);
      ctx.bezierCurveTo(
        side * 19 * scale * open, 0,
        side * 25 * scale * open, 10 * scale,
        side * 18 * scale * open, 22 * scale
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(0.6, 1.1 * scale);
      ctx.stroke();
    }

    // Center prong.
    ctx.strokeStyle = prongGrad;
    ctx.lineWidth = Math.max(1.8, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -6 * scale);
    ctx.bezierCurveTo(0, 8 * scale, -2 * scale * open, 16 * scale, 0, 24 * scale);
    ctx.stroke();

    // Held prize.
    if (claw.held) {
      const s = clamp(view.claw.prizeBase * claw.held.type.size * 0.72, 12, 42);
      drawPlush(claw.held.type, 0, 28 * scale + s * 0.52, s, true, 0.12);
    }
    ctx.restore();
  }

  function drawClawReticle(L, soft) {
    const activeTarget = claw.phase === 'idle' ? claw.aim : claw.target;
    const x = L.field.l + activeTarget.x * L.field.w;
    const y = L.field.t + activeTarget.y * L.field.h;
    const found = claw.phase === 'idle' ? findClawCandidate(activeTarget) : claw.candidate;
    const color = found ? '120,242,177' : '255,209,102';
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
    ctx.save();
    ctx.globalAlpha = soft ? 0.7 : 0.9;
    ctx.strokeStyle = 'rgba(' + color + ',' + (0.35 + pulse * 0.4) + ')';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 23 + pulse * 3, 12 + pulse * 2, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.ellipse(x, y, 31 + pulse * 4, 17 + pulse * 2.5, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();

    if (soft) {
      const label = found ? found.prize.type.name + ' · +' + found.prize.type.value : 'DRAG TO AIM';
      ctx.font = '900 ' + clamp(L.caseW * 0.013, 6, 9) + 'px "Trebuchet MS", sans-serif';
      const tw = ctx.measureText(label).width;
      const pad = 7;
      roundRect(ctx, x - tw / 2 - pad, y - 46, tw + pad * 2, 18, 9);
      ctx.fillStyle = 'rgba(7,10,17,0.78)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + color + ',0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + color + ',0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y - 37);
    }
    ctx.restore();
  }

  function drawClawBase(L) {
    const y = L.caseBottom + 12;
    const h = Math.max(view.h < 360 ? 38 : 54, L.h * 0.105);
    const w = L.caseW + 18;
    const x = L.cx - w / 2;
    ctx.save();
    roundRect(ctx, x, y, w, h, 12);
    const base = ctx.createLinearGradient(0, y, 0, y + h);
    base.addColorStop(0, '#251a27');
    base.addColorStop(0.35, '#11131e');
    base.addColorStop(1, '#080a10');
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,93,143,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const unit = h * 0.55;
    // Joystick.
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.arc(x + w * 0.15, y + h * 0.58, unit * 0.62, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = '#8a95a5';
    ctx.lineWidth = Math.max(2, h * 0.04);
    ctx.moveTo(x + w * 0.15, y + h * 0.58);
    ctx.lineTo(x + w * 0.15 + unit * 0.06, y + h * 0.28);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#ff5d8f';
    ctx.arc(x + w * 0.15 + unit * 0.06, y + h * 0.25, unit * 0.22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Red button.
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.arc(x + w * 0.84, y + h * 0.58, unit * 0.64, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    ctx.beginPath();
    const button = ctx.createRadialGradient(x + w * 0.84 - unit * 0.12, y + h * 0.5, 0, x + w * 0.84, y + h * 0.56, unit * 0.48);
    button.addColorStop(0, '#ffb2c7');
    button.addColorStop(0.4, '#ff3f78');
    button.addColorStop(1, '#8e0c37');
    ctx.fillStyle = button;
    ctx.arc(x + w * 0.84, y + h * 0.55, unit * 0.45, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Coin slot.
    const slotW = Math.max(26, w * 0.07);
    roundRect(ctx, L.cx - slotW / 2, y + h * 0.28, slotW, h * 0.44, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.38)';
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,209,102,0.65)';
    ctx.fillRect(L.cx - 1, y + h * 0.37, 2, h * 0.26);

    if (w > 520) {
      ctx.font = '900 ' + clamp(w * 0.014, 5, 8) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,209,102,0.55)';
      ctx.fillText('50 COINS PER PLAY', L.cx, y + h * 0.82);
    }
    ctx.restore();
  }

  function drawClawPrize(prize) {
    const p = clawPrizePoint(prize);
    const s = clawPrizeSize(prize);
    const wobble = Math.sin(clock * 1.6 + prize.wobble) * 0.018;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(wobble);

    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.ellipse(2, s * 0.76, s * 0.7, s * 0.24, 0, 0, TAU);
    ctx.fill();

    drawPlush(prize.type, 0, 0, s, false, prize.wobble);

    // Value tag.
    const tag = '+' + prize.type.value;
    const fs = Math.max(6.5, s * 0.24);
    ctx.font = '900 ' + fs + 'px "Trebuchet MS", sans-serif';
    const tw = ctx.measureText(tag).width + Math.max(8, s * 0.2);
    const th = Math.max(11, s * 0.3);
    roundRect(ctx, -tw / 2, s * 0.88, tw, th, th / 2);
    ctx.fillStyle = 'rgba(5,8,14,0.76)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,222,132,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, 0, s * 0.88 + th / 2);
    ctx.restore();
  }

  function drawPlush(type, x, y, s, held = false, phase = 0) {
    ctx.save();
    ctx.translate(x, y);
    const c1 = type.c1;
    const c2 = type.c2;
    const accent = type.accent;
    const bodyGrad = ctx.createLinearGradient(-s * 0.6, -s * 0.7, s * 0.6, s * 0.7);
    bodyGrad.addColorStop(0, c1);
    bodyGrad.addColorStop(0.55, c1);
    bodyGrad.addColorStop(1, c2);

    const circle = (cx, cy, r, fill = bodyGrad) => {
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    };
    const eye = (cx, cy, r) => {
      ctx.beginPath();
      ctx.fillStyle = '#1a1420';
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.arc(cx - r * 0.25, cy - r * 0.3, r * 0.3, 0, TAU);
      ctx.fill();
    };

    if (type.id === 'bear' || type.id === 'golden') {
      if (type.id === 'golden') {
        bodyGrad.addColorStop(0, '#fff3a8');
        bodyGrad.addColorStop(0.45, '#ffc94a');
        bodyGrad.addColorStop(1, '#b26b00');
      }
      circle(-s * 0.34, -s * 0.44, s * 0.23);
      circle(s * 0.34, -s * 0.44, s * 0.23);
      circle(-s * 0.34, -s * 0.44, s * 0.11, accent);
      circle(s * 0.34, -s * 0.44, s * 0.11, accent);
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.ellipse(0, s * 0.28, s * 0.55, s * 0.48, 0, 0, TAU);
      ctx.fill();
      circle(0, -s * 0.2, s * 0.45);
      circle(0, s * 0.22, s * 0.3, 'rgba(255,246,220,0.65)');
      circle(-s * 0.16, -s * 0.25, s * 0.055);
      circle(s * 0.16, -s * 0.25, s * 0.055);
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.ellipse(0, -s * 0.07, s * 0.13, s * 0.1, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#2a1720';
      ctx.arc(0, -s * 0.1, s * 0.035, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,30,20,0.55)';
      ctx.lineWidth = Math.max(0.6, s * 0.025);
      ctx.beginPath();
      ctx.arc(-s * 0.03, -s * 0.04, s * 0.07, 0.2, Math.PI - 0.2);
      ctx.stroke();
      if (type.id === 'golden') {
        ctx.beginPath();
        ctx.fillStyle = '#ffd166';
        ctx.moveTo(-s * 0.26, -s * 0.7);
        ctx.lineTo(-s * 0.16, -s * 0.92);
        ctx.lineTo(-s * 0.02, -s * 0.73);
        ctx.lineTo(s * 0.12, -s * 0.95);
        ctx.lineTo(s * 0.24, -s * 0.7);
        ctx.lineTo(s * 0.2, -s * 0.6);
        ctx.lineTo(-s * 0.22, -s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff3b1';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (type.id === 'bunny') {
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.ellipse(-s * 0.22, -s * 0.66, s * 0.14, s * 0.36, -0.16, 0, TAU);
      ctx.fill();
      ctx.ellipse(s * 0.22, -s * 0.66, s * 0.14, s * 0.36, 0.16, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.ellipse(-s * 0.22, -s * 0.67, s * 0.06, s * 0.23, -0.16, 0, TAU);
      ctx.fill();
      ctx.ellipse(s * 0.22, -s * 0.67, s * 0.06, s * 0.23, 0.16, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.ellipse(0, s * 0.26, s * 0.52, s * 0.46, 0, 0, TAU);
      ctx.fill();
      circle(0, -s * 0.18, s * 0.42);
      circle(-s * 0.15, -s * 0.22, s * 0.055);
      circle(s * 0.15, -s * 0.22, s * 0.055);
      circle(0, -s * 0.04, s * 0.05, accent);
      ctx.strokeStyle = 'rgba(80,40,55,0.5)';
      ctx.lineWidth = Math.max(0.6, s * 0.022);
      ctx.beginPath();
      ctx.arc(0, -s * 0.02, s * 0.1, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else if (type.id === 'frog') {
      circle(0, s * 0.26, s * 0.55, bodyGrad);
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.ellipse(0, -s * 0.14, s * 0.55, s * 0.4, 0, 0, TAU);
      ctx.fill();
      circle(-s * 0.28, -s * 0.45, s * 0.21);
      circle(s * 0.28, -s * 0.45, s * 0.21);
      circle(-s * 0.28, -s * 0.45, s * 0.12, '#f6ffe9');
      circle(s * 0.28, -s * 0.45, s * 0.12, '#f6ffe9');
      eye(-s * 0.28, -s * 0.45, s * 0.055);
      eye(s * 0.28, -s * 0.45, s * 0.055);
      ctx.strokeStyle = '#1d5b34';
      ctx.lineWidth = Math.max(0.8, s * 0.035);
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.22, 0.15, Math.PI - 0.15);
      ctx.stroke();
      circle(-s * 0.08, s * 0.27, s * 0.08, accent);
      circle(s * 0.14, s * 0.36, s * 0.06, accent);
    } else if (type.id === 'ghost') {
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.moveTo(-s * 0.46, s * 0.42);
      ctx.bezierCurveTo(-s * 0.62, -s * 0.25, -s * 0.3, -s * 0.72, 0, -s * 0.72);
      ctx.bezierCurveTo(s * 0.3, -s * 0.72, s * 0.62, -s * 0.25, s * 0.46, s * 0.42);
      ctx.lineTo(s * 0.32, s * 0.24);
      ctx.lineTo(s * 0.16, s * 0.44);
      ctx.lineTo(0, s * 0.26);
      ctx.lineTo(-s * 0.16, s * 0.44);
      ctx.lineTo(-s * 0.32, s * 0.24);
      ctx.closePath();
      ctx.fill();
      circle(-s * 0.17, -s * 0.18, s * 0.06);
      circle(s * 0.17, -s * 0.18, s * 0.06);
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.ellipse(0, s * 0.03, s * 0.09, s * 0.06, 0, 0, TAU);
      ctx.fill();
    } else if (type.id === 'star') {
      starPath(ctx, 0, 0, s * 0.72, s * 0.34);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(0.8, s * 0.03);
      ctx.stroke();
      eye(-s * 0.16, -s * 0.05, s * 0.055);
      eye(s * 0.16, -s * 0.05, s * 0.055);
      ctx.strokeStyle = 'rgba(90,55,0,0.55)';
      ctx.lineWidth = Math.max(0.6, s * 0.025);
      ctx.beginPath();
      ctx.arc(0, s * 0.04, s * 0.11, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else if (type.id === 'gem') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72);
      ctx.lineTo(s * 0.52, -s * 0.2);
      ctx.lineTo(s * 0.32, s * 0.52);
      ctx.lineTo(-s * 0.32, s * 0.52);
      ctx.lineTo(-s * 0.52, -s * 0.2);
      ctx.closePath();
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(0.8, s * 0.03);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.26, -s * 0.12);
      ctx.lineTo(0, s * 0.38);
      ctx.lineTo(-s * 0.26, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      eye(-s * 0.13, 0, s * 0.045);
      eye(s * 0.13, 0, s * 0.045);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 0.8;
      ctx.moveTo(-s * 0.38, -s * 0.28);
      ctx.lineTo(-s * 0.18, -s * 0.54);
      ctx.stroke();
    } else if (type.id === 'crown') {
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.moveTo(-s * 0.5, s * 0.3);
      ctx.lineTo(-s * 0.56, -s * 0.36);
      ctx.lineTo(-s * 0.24, -s * 0.1);
      ctx.lineTo(0, -s * 0.55);
      ctx.lineTo(s * 0.24, -s * 0.1);
      ctx.lineTo(s * 0.56, -s * 0.36);
      ctx.lineTo(s * 0.5, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(0.8, s * 0.03);
      ctx.stroke();
      circle(-s * 0.26, -s * 0.33, s * 0.08, accent);
      circle(0, -s * 0.47, s * 0.08, '#ff7fa8');
      circle(s * 0.26, -s * 0.33, s * 0.08, '#6ee7f9');
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-s * 0.48, s * 0.18, s * 0.96, s * 0.08);
    } else if (type.id === 'donut') {
      circle(0, 0, s * 0.58, bodyGrad);
      circle(0, 0, s * 0.22, '#160e18');
      ctx.beginPath();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(0.7, s * 0.035);
      for (let i = 0; i < 8; i++) {
        const a = i * 1.7 + phase;
        const rr = s * (0.3 + (i % 3) * 0.07);
        ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.lineTo(Math.cos(a) * rr + s * 0.06, Math.sin(a) * rr - s * 0.03);
      }
      ctx.stroke();
      eye(-s * 0.16, -s * 0.06, s * 0.05);
      eye(s * 0.16, -s * 0.06, s * 0.05);
    } else if (type.id === 'candy') {
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.moveTo(-s * 0.32, 0);
      ctx.lineTo(-s * 0.68, -s * 0.34);
      ctx.lineTo(-s * 0.68, s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.32, 0);
      ctx.lineTo(s * 0.68, -s * 0.34);
      ctx.lineTo(s * 0.68, s * 0.34);
      ctx.closePath();
      ctx.fill();
      circle(0, 0, s * 0.44, bodyGrad);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(0.7, s * 0.025);
      ctx.arc(0, 0, s * 0.44, -0.6, 0.6);
      ctx.stroke();
      eye(-s * 0.13, -s * 0.04, s * 0.045);
      eye(s * 0.13, -s * 0.04, s * 0.045);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(90,0,35,0.55)';
      ctx.lineWidth = Math.max(0.6, s * 0.022);
      ctx.arc(0, 0.02, s * 0.09, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else if (type.id === 'moon') {
      ctx.beginPath();
      ctx.fillStyle = bodyGrad;
      ctx.arc(0, 0, s * 0.58, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(20,24,48,0.88)';
      ctx.arc(s * 0.2, -s * 0.1, s * 0.5, 0, TAU);
      ctx.fill();
      circle(-s * 0.13, -s * 0.04, s * 0.05, '#2a2440');
      ctx.strokeStyle = '#2a2440';
      ctx.lineWidth = Math.max(0.6, s * 0.022);
      ctx.beginPath();
      ctx.arc(-s * 0.08, s * 0.06, s * 0.08, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = accent;
      ctx.arc(-s * 0.3, -s * 0.38, s * 0.045, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.arc(-s * 0.35, s * 0.28, s * 0.03, 0, TAU);
      ctx.fill();
    } else {
      circle(0, 0, s * 0.5, bodyGrad);
      eye(-s * 0.14, -s * 0.05, s * 0.05);
      eye(s * 0.14, -s * 0.05, s * 0.05);
    }

    if (!held) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = Math.max(0.7, s * 0.022);
      ctx.arc(-s * 0.18, -s * 0.34, s * 0.24, Math.PI * 1.05, Math.PI * 1.45);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Effects ----------

  function spawnBurst(x, y, colors, count = 12, power = 90) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, TAU);
      const speed = rand(power * 0.25, power);
      fx.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(15, 55),
        size: rand(1.2, 4.2),
        color: pick(colors),
        life: rand(0.35, 0.9),
        maxLife: 0.9,
        gravity: rand(90, 240)
      });
    }
  }

  function spawnFloat(x, y, text, color = '#ffd166', size = 14) {
    fx.floats.push({ x, y, text, color, size, life: 1.05, maxLife: 1.05, vy: -36 });
  }

  function updateFX(dt) {
    for (let i = fx.particles.length - 1; i >= 0; i--) {
      const p = fx.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        fx.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
    }
    for (let i = fx.rings.length - 1; i >= 0; i--) {
      const r = fx.rings[i];
      r.life -= dt;
      if (r.life <= 0) fx.rings.splice(i, 1);
    }
    for (let i = fx.floats.length - 1; i >= 0; i--) {
      const f = fx.floats[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.97;
      if (f.life <= 0) fx.floats.splice(i, 1);
    }
    for (let i = fx.confetti.length - 1; i >= 0; i--) {
      const c = fx.confetti[i];
      c.life -= dt;
      if (c.life <= 0) {
        fx.confetti.splice(i, 1);
        continue;
      }
      c.vy += 320 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      c.vx *= 0.99;
    }
  }

  function drawFX() {
    ctx.save();
    for (const p of fx.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    for (const r of fx.rings) {
      const t = 1 - r.life / r.maxLife;
      ctx.globalAlpha = (1 - t) * 0.65;
      ctx.strokeStyle = 'rgba(' + r.color + ',1)';
      ctx.lineWidth = Math.max(1, 2.5 * (1 - t));
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r + (r.max - r.r) * easeOut(t), 0, TAU);
      ctx.stroke();
    }
    for (const c of fx.confetti) {
      ctx.globalAlpha = clamp(c.life / c.maxLife, 0, 1);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.62);
      ctx.restore();
    }
    for (const f of fx.floats) {
      const alpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = '900 ' + f.size + 'px "Arial Black", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(5,7,12,0.75)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  // ---------- Input ----------

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, view.w),
      y: clamp(event.clientY - rect.top, 0, view.h)
    };
  }

  function updateAimFromPointer(event) {
    const pos = pointerPosition(event);
    if (state.mode === 'pusher') {
      const table = screenToPusher(pos.x, pos.y);
      pusher.aimX = table.x;
      updateAimReadout();
    } else if (claw.phase === 'idle') {
      const L = view.claw;
      claw.aim.x = clamp((pos.x - L.field.l) / L.field.w, 0.06, 0.94);
      claw.aim.y = clamp((pos.y - L.field.t) / L.field.h, 0.1, 0.92);
      updateAimReadout();
    }
  }

  function doAction() {
    initAudio();
    dismissHint();
    if (state.mode === 'pusher') dropCoin(state.denom);
    else startClaw();
  }

  function bindEvents() {
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      ro.observe(stage);
    }

    canvas.addEventListener('pointermove', (event) => {
      updateAimFromPointer(event);
    }, { passive: true });

    canvas.addEventListener('pointerdown', (event) => {
      initAudio();
      dismissHint();
      updateAimFromPointer(event);
      if (state.mode === 'pusher') {
        event.preventDefault();
        dropCoin(state.denom);
      } else {
        event.preventDefault();
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(event.pointerId); } catch {}
        }
        sfx.click();
      }
    });

    const release = (event) => {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        try { canvas.releasePointerCapture(event.pointerId); } catch {}
      }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    ui.actionBtn.addEventListener('click', doAction);

    ui.denomButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        initAudio();
        setDenomination(Number(btn.dataset.value));
      });
    });

    ui.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        initAudio();
        setMode(tab.dataset.mode);
      });
    });

    ui.soundBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      if (masterGain && audioCtx) {
        masterGain.gain.setTargetAtTime(state.muted ? 0 : 0.6, audioCtx.currentTime, 0.02);
      }
      ui.soundBtn.classList.toggle('is-muted', state.muted);
      ui.soundBtn.setAttribute('aria-pressed', String(state.muted));
      ui.soundBtn.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound');
      if (!state.muted) {
        initAudio();
        sfx.click();
      }
      scheduleSave();
    });

    ui.openVault.addEventListener('click', openVault);
    ui.openVaultMobile.addEventListener('click', openVault);
    ui.closeVault.addEventListener('click', closeVault);
    ui.vaultModal.querySelector('[data-close-modal]').addEventListener('click', closeVault);
    ui.freeCoins.addEventListener('click', claimFreeCoins);

    document.addEventListener('keydown', (event) => {
      if (!ui.vaultModal.hidden) {
        if (event.key === 'Escape') closeVault();
        return;
      }
      const tag = (event.target && event.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.code === 'Space' || event.code === 'Enter') {
        if (tag === 'BUTTON') return;
        event.preventDefault();
        doAction();
        return;
      }
      if (event.key === 'Escape') {
        dismissHint();
        return;
      }
      const arrow = event.key;
      if (arrow === 'ArrowLeft' || arrow === 'ArrowRight' || arrow === 'ArrowUp' || arrow === 'ArrowDown') {
        event.preventDefault();
        if (state.mode === 'pusher') {
          pusher.aimX = clamp(pusher.aimX + (arrow === 'ArrowLeft' ? -0.045 : arrow === 'ArrowRight' ? 0.045 : 0), -0.92, 0.92);
        } else if (claw.phase === 'idle') {
          if (arrow === 'ArrowLeft') claw.aim.x = clamp(claw.aim.x - 0.025, 0.06, 0.94);
          if (arrow === 'ArrowRight') claw.aim.x = clamp(claw.aim.x + 0.025, 0.06, 0.94);
          if (arrow === 'ArrowUp') claw.aim.y = clamp(claw.aim.y - 0.025, 0.1, 0.92);
          if (arrow === 'ArrowDown') claw.aim.y = clamp(claw.aim.y + 0.025, 0.1, 0.92);
        }
        updateAimReadout();
        return;
      }
      if (state.mode === 'pusher' && /^[1-6]$/.test(event.key)) {
        setDenomination(DENOMS[Number(event.key) - 1]);
      }
    });

    window.addEventListener('pagehide', saveState);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveState();
    });
  }

  // ---------- Main loop ----------

  function draw() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.imageSmoothingEnabled = true;
    drawBackground();
    if (state.mode === 'pusher') drawPusher();
    else drawClaw();
    drawFX();
  }

  function frame(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    clock += dt;

    if (state.mode === 'pusher') updatePusher(dt);
    // A claw play keeps resolving if the player peeks at the pusher mid-drop.
    if (state.mode === 'claw' || claw.phase !== 'idle') updateClaw(dt);
    updateFX(dt);

    metaTimer += dt;
    if (metaTimer > 0.18) {
      metaTimer = 0;
      updateMeta();
      updateAimReadout();
    }

    tickerTimer += dt;
    if (tickerTimer > 14) {
      tickerTimer = 0;
      setTicker(pick(TICKERS[state.mode]));
    }

    draw();
    requestAnimationFrame(frame);
  }

  function init() {
    loadState();
    resize();
    seedPusher();
    restockClaw(true);
    bindEvents();

    document.body.dataset.mode = 'pusher';
    ui.soundBtn.classList.toggle('is-muted', state.muted);
    ui.soundBtn.setAttribute('aria-pressed', String(state.muted));
    ui.soundBtn.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound');

    ui.stageBadge.textContent = 'COIN PUSHER';
    ui.dockEyebrow.textContent = 'AIM & DROP';
    ui.dockHint.innerHTML = 'Move across the table. Tap or press <kbd>Space</kbd> to release a coin.';
    setHint('Tap the table to drop a ' + state.denom + ' coin');
    setTicker('THE PUSHER IS WARMING UP');

    renderShelf();
    updateWallet();
    updateStats();
    syncControls();

    requestAnimationFrame(frame);
  }

  init();
})();
