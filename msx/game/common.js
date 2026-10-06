/*
 * Общий движок игр MSX: пульт, меню с настройками, пауза, итоги, рекорды, игровой цикл.
 * Написан на ES5 — для старых браузеров телевизоров.
 *
 * Использование:
 *   MSX.game({
 *     id: 'snake', title: 'Змейка',
 *     options: [{ key, label, values: [{ value, label }], def }],
 *     hud: [{ key, label }],
 *     hints: [['◀ ▶', 'движение'], ['OK', 'пауза']],
 *     info: function (settings) { return 'Рекорд: 10'; },   // строка под заголовком меню
 *     start: function (settings) {},                         // новая игра
 *     canContinue / resume: сохранённая партия (необязательно)
 *     update: function (dt) {}, draw: function () {}, continuous: true,
 *     key: function (k, repeat) { return true; },           // true — клавиша обработана
 *     resize: function (w, h) {}, leave: function () {}, pauseItems: function () { return []; }
 *   });
 * Коды клавиш: 'up' 'down' 'left' 'right' 'ok' 'back' и цифры '0'…'9'.
 */
(function (window, document) {
  'use strict';

  var HUB_URL = '../index.html';

  function now() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }

  /* ---------------- пульт ---------------- */

  var KEY_NAMES = {
    ArrowUp: 'up', Up: 'up',
    ArrowDown: 'down', Down: 'down',
    ArrowLeft: 'left', Left: 'left',
    ArrowRight: 'right', Right: 'right',
    Enter: 'ok', Select: 'ok', Accept: 'ok', ' ': 'ok', Spacebar: 'ok',
    Escape: 'back', Esc: 'back', Backspace: 'back', BrowserBack: 'back', GoBack: 'back', Back: 'back', XF86Back: 'back'
  };
  var KEY_CODES = {
    38: 'up', 19: 'up',
    40: 'down', 20: 'down',
    37: 'left', 21: 'left',
    39: 'right', 22: 'right',
    13: 'ok', 23: 'ok', 66: 'ok', 32: 'ok', 65376: 'ok',
    8: 'back', 27: 'back', 4: 'back', 166: 'back', 461: 'back', 10009: 'back', 65385: 'back'
  };

  function keyOf(e) {
    var key = e.key;
    var code = e.keyCode || e.which || 0;
    if (key && key.length === 1 && key >= '0' && key <= '9') { return key; }
    if (code >= 48 && code <= 57) { return String(code - 48); }
    if (code >= 96 && code <= 105) { return String(code - 96); }
    if (key && KEY_NAMES[key]) { return KEY_NAMES[key]; }
    return KEY_CODES[code] || null;
  }

  // На Tizen цифровые клавиши нужно регистрировать, иначе страница их не получит.
  try {
    if (window.tizen && window.tizen.tvinputdevice) {
      for (var d = 0; d <= 9; d++) { window.tizen.tvinputdevice.registerKey(String(d)); }
    }
  } catch (err) {}

  /* ---------------- хранилище ---------------- */

  var store = {
    get: function (key, def) {
      try {
        var raw = window.localStorage.getItem('msx.' + key);
        return raw === null ? def : JSON.parse(raw);
      } catch (err) { return def; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem('msx.' + key, JSON.stringify(value)); } catch (err) {}
    },
    del: function (key) {
      try { window.localStorage.removeItem('msx.' + key); } catch (err) {}
    }
  };

  /* ---------------- утилиты ---------------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function fmtTime(sec) {
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtNum(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function exitToHub() {
    if (window.history.length > 1) { window.history.back(); return; }
    window.location.href = HUB_URL;
  }

  /* ---------------- иконки ----------------
   * В шрифтах многих ТВ нет символов ◀ ▲ ▼ ▶, ₽ и т.п. Стрелки рисуем встроенным SVG.
   */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ARROW_PTS = { '◀': '8,1 1,5 8,9', '▶': '2,1 9,5 2,9', '▲': '1,8.5 5,1.5 9,8.5', '▼': '1,1.5 9,1.5 5,8.5' };

  function arrowIcon(ch) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 10 10');
    s.style.width = '.78em';
    s.style.height = '.78em';
    s.style.display = 'inline-block';
    s.style.verticalAlign = '-.06em';
    var p = document.createElementNS(SVG_NS, 'polygon');
    p.setAttribute('points', ARROW_PTS[ch]);
    p.setAttribute('fill', 'currentColor');
    s.appendChild(p);
    return s;
  }

  // Текст, в котором стрелки заменены SVG-иконками.
  function iconText(text) {
    var frag = document.createDocumentFragment();
    var buf = '';
    text = String(text);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ARROW_PTS[ch]) {
        if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; }
        frag.appendChild(arrowIcon(ch));
      } else {
        buf += ch;
      }
    }
    if (buf) { frag.appendChild(document.createTextNode(buf)); }
    return frag;
  }

  function iconize(node) {
    var t = node.textContent;
    node.textContent = '';
    node.appendChild(iconText(t));
  }

  // Есть ли символ в шрифте: сравниваем отрисовку с заведомо отсутствующим символом.
  function hasGlyph(ch) {
    try {
      var c = document.createElement('canvas');
      c.width = 48;
      c.height = 48;
      var x = c.getContext('2d');
      x.font = '36px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif';
      x.textBaseline = 'top';
      x.fillStyle = '#000';
      var snap = function (s) {
        x.clearRect(0, 0, 48, 48);
        x.fillText(s, 4, 4);
        return x.getImageData(0, 0, 48, 48).data;
      };
      var a = snap(ch), b = snap('￿');
      var empty = true, same = true;
      for (var i = 3; i < a.length; i += 4) {
        if (a[i]) { empty = false; }
        if (a[i] !== b[i]) { same = false; }
      }
      return !empty && !same;
    } catch (err) { return true; }
  }

  var rubSign = null;
  function rub() {
    if (rubSign === null) { rubSign = hasGlyph('₽') ? '₽' : 'руб.'; }
    return rubSign;
  }

  // Размер шрифта под экран: 22px на 1920×1080, пропорционально на остальных.
  function fitFont() {
    var w = window.innerWidth || 1280;
    var h = window.innerHeight || 720;
    var size = Math.round(Math.min(w / 1920, h / 1080) * 22);
    document.documentElement.style.fontSize = clamp(size, 11, 40) + 'px';
  }
  fitFont();

  /* ---------------- движок игры ---------------- */

  function createGame(cfg) {
    var options = cfg.options || [];
    var settings = loadSettings();

    var mode = 'menu';      // menu | game
    var running = false;    // партия идёт (не завершена)
    var overlay = null;     // { items, index, back }
    var menuItems = [];
    var menuIndex = 0;
    var rafId = null;
    var lastTime = 0;
    var dirty = true;
    var toastTimer = null;
    var view = null;
    var renderScale = 1;    // доля разрешения холста (меньше — быстрее на слабых ТВ)

    /* --- DOM --- */
    document.body.appendChild(el('div', 'msx-glow'));
    var app = el('div');
    app.id = 'msx-app';
    document.body.appendChild(app);

    var menuScreen = el('section', 'msx-screen active');
    menuScreen.id = 'msx-menu';
    menuScreen.appendChild(el('div', 'msx-brand', 'MSX Games'));
    var head = el('div', 'msx-head');
    head.appendChild(el('h1', null, cfg.title));
    var menuSub = el('p', 'msx-sub', '');
    head.appendChild(menuSub);
    menuScreen.appendChild(head);
    var menuList = el('nav', 'msx-list');
    menuScreen.appendChild(menuList);
    menuScreen.appendChild(el('div', 'msx-spacer'));
    menuScreen.appendChild(buildHints(options.length
      ? [['▲ ▼', 'выбор'], ['◀ ▶', 'настройка'], ['OK', 'начать'], ['BACK', 'выход']]
      : [['▲ ▼', 'выбор'], ['OK', 'начать'], ['BACK', 'выход']]));
    app.appendChild(menuScreen);

    var gameScreen = el('section', 'msx-screen');
    gameScreen.id = 'msx-game';
    var hud = el('div', 'msx-hud');
    var hudValues = {};
    (cfg.hud || []).forEach(function (h) {
      var item = el('div', 'msx-hud-item');
      item.appendChild(el('span', 'msx-hud-label', h.label));
      var b = el('b', null, h.value !== undefined ? h.value : '0');
      item.appendChild(b);
      hud.appendChild(item);
      hudValues[h.key] = b;
    });
    gameScreen.appendChild(hud);
    var stage = el('div', 'msx-stage');
    gameScreen.appendChild(stage);
    var hintsHolder = el('div');
    gameScreen.appendChild(hintsHolder);
    app.appendChild(gameScreen);
    setHints(cfg.hints || [['BACK', 'пауза']]);

    var ovEl = el('div', 'msx-overlay');
    var panel = el('div', 'msx-panel');
    var ovTitle = el('h2');
    var ovText = el('p');
    var ovStats = el('div', 'msx-stats');
    var ovList = el('nav', 'msx-list');
    panel.appendChild(ovTitle);
    panel.appendChild(ovText);
    panel.appendChild(ovStats);
    panel.appendChild(ovList);
    ovEl.appendChild(panel);
    document.body.appendChild(ovEl);

    var toastEl = el('div', 'msx-toast');
    document.body.appendChild(toastEl);

    function buildHints(list) {
      var bar = el('div', 'msx-hints');
      for (var i = 0; i < list.length; i++) {
        var span = el('span');
        span.appendChild(el('b', 'msx-kbd')).appendChild(iconText(list[i][0]));
        span.appendChild(iconText(list[i][1]));
        bar.appendChild(span);
      }
      return bar;
    }

    function setHints(list) {
      hintsHolder.innerHTML = '';
      hintsHolder.appendChild(buildHints(list));
    }

    /* --- настройки --- */
    function loadSettings() {
      var saved = store.get(cfg.id + '.settings', {}) || {};
      var out = {};
      for (var i = 0; i < options.length; i++) {
        var o = options[i];
        var v = saved[o.key];
        var ok = false;
        for (var j = 0; j < o.values.length; j++) { if (o.values[j].value === v) { ok = true; } }
        out[o.key] = ok ? v : (o.def !== undefined ? o.def : o.values[0].value);
      }
      return out;
    }

    function optionLabel(o) {
      for (var j = 0; j < o.values.length; j++) {
        if (o.values[j].value === settings[o.key]) { return o.values[j].label; }
      }
      return '';
    }

    function cycleOption(o, d) {
      var idx = 0;
      for (var j = 0; j < o.values.length; j++) { if (o.values[j].value === settings[o.key]) { idx = j; } }
      idx = (idx + d + o.values.length) % o.values.length;
      settings[o.key] = o.values[idx].value;
      store.set(cfg.id + '.settings', settings);
      renderMenu();
    }

    /* --- меню --- */
    function buildMenu() {
      menuItems = [];
      var cont = cfg.canContinue && cfg.canContinue(settings);
      if (cont) { menuItems.push({ label: 'Продолжить', run: continueGame }); }
      menuItems.push({ label: cont ? 'Новая игра' : 'Играть', run: newGame });
      for (var i = 0; i < options.length; i++) { menuItems.push({ option: options[i] }); }
      menuItems.push({ label: 'Выход', run: exitApp });
      if (menuIndex >= menuItems.length) { menuIndex = 0; }
      renderMenu();
    }

    function renderMenu() {
      menuList.innerHTML = '';
      for (var i = 0; i < menuItems.length; i++) {
        var it = menuItems[i];
        var row = el('div', 'msx-item' + (i === menuIndex ? ' sel' : ''));
        row.appendChild(el('span', 'name')).appendChild(iconText(it.option ? it.option.label : it.label));
        if (it.option) { row.appendChild(el('span', 'val')).appendChild(iconText(optionLabel(it.option))); }
        menuList.appendChild(row);
      }
      menuSub.textContent = cfg.info ? (cfg.info(settings) || '') : '';
    }

    function menuKey(k) {
      var it = menuItems[menuIndex];
      if (k === 'up') { menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length; renderMenu(); }
      else if (k === 'down') { menuIndex = (menuIndex + 1) % menuItems.length; renderMenu(); }
      else if (k === 'left' && it.option) { cycleOption(it.option, -1); buildMenu(); }
      else if (k === 'right' && it.option) { cycleOption(it.option, 1); buildMenu(); }
      else if (k === 'ok') {
        if (it.option) { cycleOption(it.option, 1); buildMenu(); }
        else { it.run(); }
      }
      else if (k === 'back') { exitApp(); }
    }

    /* --- экраны --- */
    function showScreen(name) {
      mode = name;
      menuScreen.className = 'msx-screen' + (name === 'menu' ? ' active' : '');
      gameScreen.className = 'msx-screen' + (name === 'game' ? ' active' : '');
    }

    function enterGame() {
      closeOverlay();
      showScreen('game');
      running = true;
      layout();
    }

    function newGame() {
      enterGame();
      cfg.start(settings);
      dirty = true;
      startLoop();
    }

    function continueGame() {
      enterGame();
      cfg.resume(settings);
      dirty = true;
      startLoop();
    }

    function toMenu() {
      if (running && cfg.leave) { cfg.leave(); }
      running = false;
      stopLoop();
      closeOverlay();
      showScreen('menu');
      buildMenu();
    }

    function exitApp() {
      if (running && cfg.leave) { cfg.leave(); }
      exitToHub();
    }

    /* --- оверлей --- */
    function showOverlay(o) {
      overlay = { items: o.items || [], index: 0, back: o.back || null };
      ovTitle.textContent = o.title || '';
      ovText.textContent = o.text || '';
      ovText.style.display = o.text ? '' : 'none';
      ovStats.innerHTML = '';
      ovStats.style.display = o.stats && o.stats.length ? '' : 'none';
      if (o.stats) {
        for (var i = 0; i < o.stats.length; i++) {
          var row = el('div', 'msx-stat' + (o.stats[i][2] ? ' hi' : ''));
          row.appendChild(el('span', null, o.stats[i][0]));
          row.appendChild(el('b', null, o.stats[i][1]));
          ovStats.appendChild(row);
        }
      }
      renderOverlay();
      ovEl.className = 'msx-overlay show';
      stopLoop();
    }

    function renderOverlay() {
      ovList.innerHTML = '';
      for (var i = 0; i < overlay.items.length; i++) {
        ovList.appendChild(el('div', 'msx-item' + (i === overlay.index ? ' sel' : ''), null))
          .appendChild(el('span', 'name', overlay.items[i].label));
      }
    }

    function closeOverlay() {
      overlay = null;
      ovEl.className = 'msx-overlay';
    }

    function overlayKey(k) {
      var n = overlay.items.length;
      if (k === 'up' && n) { overlay.index = (overlay.index - 1 + n) % n; renderOverlay(); }
      else if (k === 'down' && n) { overlay.index = (overlay.index + 1) % n; renderOverlay(); }
      else if (k === 'ok' && n) { overlay.items[overlay.index].run(); }
      else if (k === 'back' && overlay.back) { overlay.back(); }
    }

    function pause() {
      if (mode !== 'game' || !running || overlay) { return; }
      if (cfg.onPause) { cfg.onPause(); }
      var items = [{ label: 'Продолжить', run: resumePlay }];
      if (cfg.pauseItems) { items = items.concat(cfg.pauseItems()); }
      items.push({ label: 'Начать заново', run: newGame });
      items.push({ label: 'В меню', run: toMenu });
      items.push({ label: 'Выход из игры', run: exitApp });
      showOverlay({ title: 'Пауза', items: items, back: resumePlay });
    }

    function resumePlay() {
      closeOverlay();
      dirty = true;
      startLoop();
    }

    function finish(res) {
      running = false;
      stopLoop();
      if (cfg.draw) { cfg.draw(); }
      showOverlay({
        title: res.title,
        text: res.text,
        stats: res.stats,
        items: [
          { label: 'Играть ещё', run: newGame },
          { label: 'В меню', run: toMenu },
          { label: 'Выход из игры', run: exitApp }
        ],
        back: toMenu
      });
    }

    /* --- цикл --- */
    function loopActive() { return mode === 'game' && running && !overlay; }

    function frame() {
      rafId = null;
      if (!loopActive()) { return; }
      var t = now();
      var dt = (t - lastTime) / 1000;
      lastTime = t;
      if (!(dt > 0)) { dt = 0; }
      if (dt > 0.05) { dt = 0.05; }
      if (cfg.update) { cfg.update(dt); }
      if (!loopActive() && !running) { return; }
      if (cfg.draw && (cfg.continuous || dirty)) {
        dirty = false;
        cfg.draw();
      }
      if (loopActive()) { rafId = window.requestAnimationFrame(frame); }
    }

    function startLoop() {
      if (rafId !== null || !loopActive()) { return; }
      lastTime = now();
      rafId = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    /* --- холст --- */
    function canvas() {
      if (view) { return view; }
      var c = el('canvas');
      stage.appendChild(c);
      view = { canvas: c, ctx: c.getContext('2d'), w: 1, h: 1, dpr: 1 };
      sizeCanvas();
      return view;
    }

    function sizeCanvas() {
      if (!view) { return; }
      var w = Math.max(1, stage.clientWidth);
      var h = Math.max(1, stage.clientHeight);
      // На 4K-телевизорах devicePixelRatio бывает 2 — ограничиваем холст 1920 px по ширине.
      var dpr = Math.min(window.devicePixelRatio || 1, 1920 / w) * renderScale;
      view.canvas.width = Math.round(w * dpr);
      view.canvas.height = Math.round(h * dpr);
      view.canvas.style.width = w + 'px';
      view.canvas.style.height = h + 'px';
      view.w = w;
      view.h = h;
      view.dpr = dpr;
      view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function layout() {
      fitFont();
      if (mode !== 'game') { return; }
      sizeCanvas();
      if (cfg.resize) { cfg.resize(stage.clientWidth, stage.clientHeight); }
      dirty = true;
      if (cfg.draw && view) { cfg.draw(); }
    }

    /* --- события --- */
    document.addEventListener('keydown', function (e) {
      var k = keyOf(e);
      if (!k) { return; }
      if (e.preventDefault) { e.preventDefault(); }
      var rep = !!e.repeat;
      if (overlay) {
        if (!rep || k === 'up' || k === 'down') { overlayKey(k); }
        return;
      }
      if (mode === 'menu') {
        if (!rep || k === 'up' || k === 'down') { menuKey(k); }
        return;
      }
      if (!running) { return; }
      var handled = cfg.key ? cfg.key(k, rep) === true : false;
      if (!handled && k === 'back' && !rep) { pause(); }
      dirty = true;
    });

    window.addEventListener('resize', layout);
    window.addEventListener('blur', function () { if (cfg.autoPause !== false) { pause(); } });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && cfg.autoPause !== false) { pause(); }
    });

    /* --- API для игры --- */
    var api = {
      stage: stage,
      settings: settings,
      canvas: canvas,
      hud: function (key, value) {
        var b = hudValues[key];
        var s = String(value);
        if (b && b.textContent !== s) { b.textContent = s; }
      },
      hints: setHints,
      invalidate: function () { dirty = true; },
      setRenderScale: function (s) {
        if (s === renderScale) { return; }
        renderScale = s;
        layout();
      },
      toast: function (text, ms) {
        toastEl.textContent = text;
        toastEl.className = 'msx-toast show';
        if (toastTimer) { clearTimeout(toastTimer); }
        toastTimer = setTimeout(function () { toastEl.className = 'msx-toast'; }, ms || 1300);
      },
      overlay: function (o) { showOverlay(o); },
      closeOverlay: function () { closeOverlay(); dirty = true; startLoop(); },
      pause: pause,
      finish: finish,
      menu: toMenu,
      isRunning: function () { return running; }
    };

    buildMenu();
    return api;
  }

  window.MSX = {
    game: createGame,
    keyOf: keyOf,
    store: store,
    el: el,
    rand: rand,
    randInt: randInt,
    pick: pick,
    clamp: clamp,
    shuffle: shuffle,
    fmtTime: fmtTime,
    fmtNum: fmtNum,
    rrect: rrect,
    iconText: iconText,
    iconize: iconize,
    hasGlyph: hasGlyph,
    rub: rub,
    now: now,
    exitToHub: exitToHub
  };
})(window, document);
