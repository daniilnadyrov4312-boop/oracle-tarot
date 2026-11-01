/* =========================================================================
   СТОЛ — раскладка карт на столе (отдельный модуль, использует window.ORACLE)
   ========================================================================= */
(function () {
  'use strict';

  var O = window.ORACLE;
  var byId = O.byId;
  var CARDS = O.CARDS;
  var SUITS = O.SUITS;
  var ELEMENTS = O.ELEMENTS;
  var TONE_LABEL = O.TONE_LABEL;
  var cardImage = O.cardImage;
  var miniCard = O.miniCard;
  var suitLabel = O.suitLabel;
  var summaryHTML = O.summaryHTML;

  var CARD_W = 124;
  var CARD_H = 186;
  var NODE_H = CARD_H + 26;
  var COL = CARD_W + 38;
  var ROW = NODE_H + 64;
  var BASE_W = 1000;

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').trim(); }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function mondayISO() {
    var d = new Date();
    var wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }
  function addDays(iso, n) {
    var d = new Date((iso || todayISO()) + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d;
  }
  function dayLabel(iso, n) {
    var d = addDays(iso, n);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function dateLabel(iso) {
    var d = new Date((iso || todayISO()) + 'T12:00:00');
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function monthLabel(ym, offset) {
    var parts = (ym || thisMonth()).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + (offset || 0), 1);
    return MONTHS_FULL[d.getMonth()] + ' ' + d.getFullYear();
  }

  var uidCounter = 0;
  function uid() { return 's' + Math.random().toString(36).slice(2, 7) + (uidCounter++); }

  function defaultMeta() {
    return { date: todayISO(), weekStart: mondayISO(), startMonth: thisMonth(), monthCount: 3 };
  }

  var TEMPLATES = [
    { id: 'situation3', name: '3 карты', note: 'ситуация и дополнения' },
    { id: 'ppf3', name: '3 карты', note: 'прошлое · настоящее · будущее' },
    { id: 'five', name: '5 карт', note: 'ситуация и итог' },
    { id: 'grid9', name: '9 карт', note: 'мысли · чувства · действия' },
    { id: 'week', name: 'Неделя', note: '7 дней' },
    { id: 'day3', name: 'День', note: '3 карты на дату' },
    { id: 'months', name: 'Месяцы', note: 'по 3 карты' },
    { id: 'free', name: 'Свободный стол', note: 'как положите' }
  ];

  function tplDefs(id) {
    var defs = [];
    var total3 = 3 * CARD_W + 2 * 38;
    var x3 = Math.max(30, Math.round((BASE_W - total3) / 2));
    var y = 40;

    if (id === 'situation3') {
      defs.push({ label: 'Дополнение · слева', x: x3, y: y, col: 0 });
      defs.push({ label: 'Ситуация', x: x3 + COL, y: y, col: 1 });
      defs.push({ label: 'Дополнение · справа', x: x3 + 2 * COL, y: y, col: 2 });
    } else if (id === 'ppf3') {
      defs.push({ label: 'Прошлое', x: x3, y: y, col: 0 });
      defs.push({ label: 'Настоящее', x: x3 + COL, y: y, col: 1 });
      defs.push({ label: 'Будущее', x: x3 + 2 * COL, y: y, col: 2 });
    } else if (id === 'five') {
      var step = CARD_W + 32;
      var x5 = Math.max(20, Math.round((BASE_W - (5 * CARD_W + 4 * 32)) / 2));
      ['Ситуация', 'Что мешает', 'Что помогает', 'Совет', 'Итог'].forEach(function (label, i) {
        defs.push({ label: label, x: x5 + i * step, y: y, col: i });
      });
    } else if (id === 'grid9') {
      ['Мысли', 'Чувства', 'Действия'].forEach(function (row, ri) {
        ['прошлое', 'настоящее', 'будущее'].forEach(function (col, ci) {
          defs.push({ label: row + ' · ' + col, x: x3 + ci * COL, y: y + ri * ROW, row: ri, col: ci });
        });
      });
    } else if (id === 'week') {
      var step7 = CARD_W + 30;
      var x7 = Math.max(20, Math.round((BASE_W - (7 * CARD_W + 6 * 30)) / 2));
      WEEKDAYS.forEach(function (day, i) {
        defs.push({ label: day, x: x7 + i * step7, y: y, col: i });
      });
    } else if (id === 'day3') {
      defs.push({ label: 'Позиция 1', x: x3, y: y, col: 0 });
      defs.push({ label: 'Позиция 2', x: x3 + COL, y: y, col: 1 });
      defs.push({ label: 'Позиция 3', x: x3 + 2 * COL, y: y, col: 2 });
    }
    return defs;
  }

  function monthDefs(count) {
    var defs = [];
    var gap = 30;
    var x0 = Math.max(30, Math.round((BASE_W - (3 * CARD_W + 2 * gap)) / 2));
    for (var i = 0; i < count; i++) {
      var y = 70 + i * (ROW + 34);
      ['Начало', 'Середина', 'Конец'].forEach(function (label, j) {
        defs.push({ label: label, x: x0 + j * (CARD_W + gap), y: y, group: 'm' + i, col: j });
      });
    }
    return defs;
  }

  function makeSlot(label, x, y, extra) {
    var s = {
      id: uid(), cardId: null, label: label || '',
      x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)),
      parentId: null, group: null, row: null, col: null
    };
    if (extra) Object.keys(extra).forEach(function (k) { s[k] = extra[k]; });
    return s;
  }

  var board = {
    template: 'situation3',
    slots: [],
    meta: defaultMeta(),
    selected: null,
    includeClar: true,
    picker: { mode: null, slotId: null }
  };

  var boardEl, nodeBar, readingsEl, pickerEl, pickerGrid, pickerSearch, textModal;

  function slotById(id) {
    for (var i = 0; i < board.slots.length; i++) if (board.slots[i].id === id) return board.slots[i];
    return null;
  }
  function childrenOf(id) {
    return board.slots.filter(function (s) { return s.parentId === id; });
  }
  function mains() {
    return board.slots.filter(function (s) { return !s.parentId; });
  }

  function groupName(g) {
    if (!g || g.indexOf('m') !== 0) return '';
    return monthLabel(board.meta.startMonth, Number(g.slice(1)));
  }

  function subFor(slot) {
    if (board.template === 'week') {
      var idx = WEEKDAYS.indexOf(slot.label);
      if (idx === -1) idx = mains().indexOf(slot);
      return dayLabel(board.meta.weekStart, idx);
    }
    if (board.template === 'day3') return dateLabel(board.meta.date);
    return '';
  }

  function buildBoard(templateId) {
    board.template = templateId;
    board.selected = null;
    var defs = templateId === 'months' ? monthDefs(board.meta.monthCount) :
      (templateId === 'free' ? [] : tplDefs(templateId));
    board.slots = defs.map(function (d) {
      return makeSlot(d.label, d.x, d.y, {
        row: d.row == null ? null : d.row,
        col: d.col == null ? null : d.col,
        group: d.group || null
      });
    });
  }

  /* ---------- сохранение и ссылки ---------- */
  function snapshot() {
    return {
      v: 3, t: board.template, m: board.meta, inc: board.includeClar,
      s: board.slots.map(function (s) {
        return [s.cardId || '', s.label, s.x, s.y, s.parentId || '', s.group || '',
          s.row == null ? -1 : s.row, s.col == null ? -1 : s.col, s.id];
      })
    };
  }

  function applySnapshot(data) {
    var ids = TEMPLATES.map(function (t) { return t.id; });
    board.template = ids.indexOf(data.t) !== -1 ? data.t : 'situation3';
    var meta = defaultMeta();
    if (data.m) Object.keys(data.m).forEach(function (k) { if (data.m[k]) meta[k] = data.m[k]; });
    board.meta = meta;
    board.includeClar = data.inc !== false;
    board.slots = (data.s || []).map(function (a) {
      return {
        id: a[8] || uid(),
        cardId: a[0] || null,
        label: a[1] || '',
        x: Number(a[2]) || 0,
        y: Number(a[3]) || 0,
        parentId: a[4] || null,
        group: a[5] || null,
        row: Number(a[6]) === -1 ? null : Number(a[6]),
        col: Number(a[7]) === -1 ? null : Number(a[7])
      };
    });
    board.selected = null;
  }

  function saveBoard() {
    try { localStorage.setItem('oracle-board-v3', JSON.stringify(snapshot())); } catch (e) { }
  }
  function loadBoard() {
    var raw = null;
    try { raw = localStorage.getItem('oracle-board-v3'); } catch (e) { return false; }
    if (!raw) return false;
    try { applySnapshot(JSON.parse(raw)); return true; } catch (e) { return false; }
  }

  function encodeBoard() {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot()))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) { return ''; }
  }
  function decodeBoard(str) {
    try {
      var s = str.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      return JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { return null; }
  }

  /* ---------- размеры ---------- */
  function boardSize() {
    var maxX = 0, maxY = 0;
    board.slots.forEach(function (s) {
      maxX = Math.max(maxX, s.x + CARD_W);
      maxY = Math.max(maxY, s.y + NODE_H);
    });
    return {
      w: Math.max(BASE_W, Math.round(maxX + 90)),
      h: Math.max(380, Math.round(maxY + 90))
    };
  }

  /* ---------- отрисовка ---------- */
  function renderBoard() {
    renderTemplates();
    renderSettings();
    renderCanvas();
    renderNodeBar();
    updateStatus();
  }

  function renderTemplates() {
    $('#templateChips').innerHTML = TEMPLATES.map(function (t) {
      return '<button class="template-chip' + (t.id === board.template ? ' is-active' : '') +
        '" data-template="' + t.id + '"><b>' + t.name + '</b><span>' + t.note + '</span></button>';
    }).join('');
  }

  function renderSettings() {
    var el = $('#boardSettings');
    var html = '';
    function field(label, control) {
      return '<label class="set-field"><span class="set-label">' + label + '</span>' + control + '</label>';
    }
    if (board.template === 'week') {
      html = field('Начало недели', '<input type="date" id="setWeek" value="' + board.meta.weekStart + '">');
    } else if (board.template === 'day3') {
      html = field('Дата', '<input type="date" id="setDate" value="' + board.meta.date + '">') +
        '<span class="set-hint">Подписи позиций можно изменить: нажмите на карту → «Подпись».</span>';
    } else if (board.template === 'months') {
      html = field('Первый месяц', '<input type="month" id="setMonth" value="' + board.meta.startMonth + '">') +
        field('Сколько месяцев', '<select id="setCount">' +
          [1, 2, 3, 4, 5, 6].map(function (n) {
            return '<option value="' + n + '"' + (n === board.meta.monthCount ? ' selected' : '') + '>' + n + '</option>';
          }).join('') + '</select>');
    }
    el.innerHTML = html;
    el.hidden = !html;
  }

  function renderCanvas() {
    var size = boardSize();
    boardEl.style.width = size.w + 'px';
    boardEl.style.height = size.h + 'px';

    var html = '';

    var groups = {};
    board.slots.forEach(function (s) { if (s.group) (groups[s.group] = groups[s.group] || []).push(s); });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g];
      var minX = Math.min.apply(null, list.map(function (s) { return s.x; })) - 18;
      var minY = Math.min.apply(null, list.map(function (s) { return s.y; })) - 42;
      var maxX = Math.max.apply(null, list.map(function (s) { return s.x + CARD_W; })) + 18;
      var maxY = Math.max.apply(null, list.map(function (s) { return s.y + NODE_H; })) + 16;
      html += '<div class="board-group" style="left:' + minX + 'px;top:' + minY + 'px;width:' +
        (maxX - minX) + 'px;height:' + (maxY - minY) + 'px">' +
        '<span class="group-title">' + groupName(g) + '</span></div>';
    });

    html += '<svg class="board-links" width="' + size.w + '" height="' + size.h + '"></svg>';
    board.slots.forEach(function (s) { html += slotHTML(s); });
    boardEl.innerHTML = html;
    drawLinks();
  }

  function slotHTML(s) {
    var card = s.cardId ? byId[s.cardId] : null;
    var cls = 'slot' + (card ? ' is-filled' : '') + (s.parentId ? ' is-clar' : '') +
      (board.selected === s.id ? ' is-selected' : '');
    var sub = subFor(s);
    return '<div class="' + cls + '" data-id="' + s.id + '" tabindex="0" ' +
      'style="left:' + s.x + 'px;top:' + s.y + 'px">' +
      '<div class="slot-card">' +
        (card
          ? '<img src="' + cardImage(card) + '" alt="' + card.name + '" loading="lazy" draggable="false">'
          : '<span class="slot-plus">+</span>') +
      '</div>' +
      '<div class="slot-label">' + (s.label || 'Позиция') +
        (sub ? '<i>' + sub + '</i>' : '') + '</div>' +
      (s.parentId ? '<span class="clar-tag">уточнение</span>' : '') +
    '</div>';
  }

  function drawLinks() {
    var svg = boardEl.querySelector('.board-links');
    if (!svg) return;
    var paths = '';
    board.slots.forEach(function (s) {
      if (!s.parentId) return;
      var p = slotById(s.parentId);
      if (!p) return;
      var x1 = p.x + CARD_W / 2;
      var y1 = p.y + NODE_H - 8;
      var x2 = s.x + CARD_W / 2;
      var y2 = s.y - 4;
      var mid = (y1 + y2) / 2;
      paths += '<path d="M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + mid + ' ' + x2 + ' ' + mid + ' ' + x2 + ' ' + y2 + '" />' +
        '<circle cx="' + x2 + '" cy="' + y2 + '" r="2.6" />';
    });
    svg.innerHTML = paths;
  }

  function updateStatus() {
    var filled = board.slots.filter(function (s) { return s.cardId; }).length;
    var clar = board.slots.filter(function (s) { return s.parentId && s.cardId; }).length;
    var extra = board.slots.length - mains().length;
    var text = filled + ' из ' + board.slots.length + ' карт' +
      (clar ? ' · уточнений: ' + clar : '') +
      (extra && !clar ? ' · дополнительных позиций: ' + extra : '');
    var wrap = $('#boardWrap');
    if (wrap && wrap.scrollWidth > wrap.clientWidth + 4) {
      text += ' · стол шире экрана, проведите в сторону';
    }
    $('#boardStatus').textContent = text;
  }

  function centerBoard() {
    var wrap = $('#boardWrap');
    if (!wrap) return;
    var max = wrap.scrollWidth - wrap.clientWidth;
    if (max > 0) wrap.scrollLeft = Math.round(max / 2);
  }

  /* ---------- выделение ---------- */
  function renderNodeBar() {
    var s = board.selected ? slotById(board.selected) : null;
    if (!s) { nodeBar.hidden = true; return; }
    var card = s.cardId ? byId[s.cardId] : null;
    nodeBar.hidden = false;
    $('#nodeBarTitle').textContent = (s.label || 'Позиция') + (card ? ' · ' + card.name : '');
    $$('[data-act]', nodeBar).forEach(function (btn) {
      var act = btn.dataset.act;
      if (act === 'detach') btn.hidden = !s.parentId;
      if (act === 'reparent') btn.hidden = !s.parentId;
      if (act === 'clarify') btn.hidden = !s.cardId;
      if (act === 'replace') btn.hidden = false;
    });
  }

  function selectSlot(id) {
    board.selected = id;
    $$('.slot', boardEl).forEach(function (el) {
      el.classList.toggle('is-selected', el.dataset.id === id);
    });
    renderNodeBar();
  }

  function deselect() {
    board.selected = null;
    board.reparent = null;
    boardEl.classList.remove('is-reparenting');
    $$('.slot', boardEl).forEach(function (el) { el.classList.remove('is-selected'); });
    renderNodeBar();
  }

  /* перепривязка уточнения: явное действие «К другой» + клик по карте */
  function isDescendant(candidate, ancestorId) {
    var s = slotById(candidate);
    while (s && s.parentId) {
      if (s.parentId === ancestorId) return true;
      s = slotById(s.parentId);
    }
    return false;
  }

  function attachClarifier(clar, parent) {
    clar.parentId = parent.id;
    childrenOf(parent.id).forEach(function (k, i) {
      k.x = parent.x + 16 + i * 14;
      k.y = parent.y + NODE_H + 54 + i * (CARD_H + 34);
    });
  }

  /* ---------- действия ---------- */
  function deleteSlot(id) {
    childrenOf(id).forEach(function (k) { deleteSlot(k.id); });
    var s = slotById(id);
    var i = s ? board.slots.indexOf(s) : -1;
    if (i !== -1) board.slots.splice(i, 1);
    if (board.selected === id) board.selected = null;
  }

  function nextFreePosition() {
    var list = mains();
    if (!list.length) return { x: Math.round((BASE_W - CARD_W) / 2), y: 60 };
    var maxY = Math.max.apply(null, list.map(function (s) { return s.y + NODE_H; }));
    var perRow = 4;
    return { x: 70 + (list.length % perRow) * COL, y: maxY + 40 };
  }

  function addClarifier(parent, cardId) {
    var k = childrenOf(parent.id).length;
    var s = makeSlot('Уточнение ' + (k + 1),
      parent.x + 16 + k * 14,
      parent.y + NODE_H + 54 + k * (CARD_H + 34),
      { parentId: parent.id });
    s.cardId = cardId;
    board.slots.push(s);
    board.selected = s.id;
  }

  function placeCard(cardId) {
    var p = board.picker;
    if (p.mode === 'add') {
      var pos = nextFreePosition();
      var s = makeSlot('Позиция ' + (mains().length + 1), pos.x, pos.y);
      s.cardId = cardId;
      board.slots.push(s);
      board.selected = s.id;
    } else if (p.mode === 'clarify') {
      var parent = slotById(p.slotId);
      if (parent) addClarifier(parent, cardId);
    } else {
      var slot = slotById(p.slotId);
      if (slot) { slot.cardId = cardId; board.selected = slot.id; }
    }
    closePicker();
    renderBoard();
    renderReadings();
    saveBoard();
  }

  function alignBoard() {
    if (board.template === 'months') syncMonths();
    var list = mains();
    var defs = board.template === 'months' ? monthDefs(board.meta.monthCount) :
      (board.template === 'free' ? [] : tplDefs(board.template));
    var lastY = 40;
    list.forEach(function (s, i) {
      var d = defs[i];
      if (!d) {
        var per = 4;
        var k = i - defs.length;
        d = { x: 70 + (k % per) * COL, y: lastY + 40 + Math.floor(k / per) * ROW };
      }
      s.x = d.x;
      s.y = d.y;
      if (d.row != null) s.row = d.row;
      if (d.col != null) s.col = d.col;
      if (d.group) s.group = d.group;
      lastY = Math.max(lastY, s.y + NODE_H);
      childrenOf(s.id).forEach(function (k2, j) {
        k2.x = s.x + 16 + j * 14;
        k2.y = s.y + NODE_H + 54 + j * (CARD_H + 34);
      });
    });
  }

  function syncMonths() {
    var count = board.meta.monthCount;
    var byGroup = {};
    board.slots.forEach(function (s) {
      if (s.group && s.group.indexOf('m') === 0) {
        var idx = Number(s.group.slice(1));
        if (idx < count) (byGroup[s.group] = byGroup[s.group] || []).push(s);
      }
    });
    var slots = [];
    for (var i = 0; i < count; i++) {
      var g = 'm' + i;
      var list = (byGroup[g] || []).slice(0, 3);
      while (list.length < 3) {
        list.push(makeSlot(['Начало', 'Середина', 'Конец'][list.length], 0, 0, { group: g }));
      }
      slots = slots.concat(list);
    }
    board.slots = slots.concat(board.slots.filter(function (s) { return !s.group; }));
    var defs = monthDefs(count);
    defs.forEach(function (d, idx) {
      var s = board.slots[idx];
      if (!s) return;
      s.x = d.x; s.y = d.y; s.group = d.group; s.col = d.col;
      if (!s.label) s.label = d.label;
    });
    mains().forEach(function (s) {
      childrenOf(s.id).forEach(function (k, j) {
        k.x = s.x + 16 + j * 14;
        k.y = s.y + NODE_H + 54 + j * (CARD_H + 34);
      });
    });
  }

  /* ---------- перетаскивание ---------- */
  var dragState = null;

  function onPointerDown(e) {
    var el = e.target.closest('.slot');
    if (!el) return;
    var s = slotById(el.dataset.id);
    if (!s) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    var kids = childrenOf(s.id).map(function (k) {
      return { slot: k, el: boardEl.querySelector('.slot[data-id="' + k.id + '"]'), x: k.x, y: k.y };
    });

    dragState = {
      slot: s, el: el, kids: kids,
      startX: e.clientX, startY: e.clientY,
      ox: s.x, oy: s.y, moved: false, id: s.id
    };
    try { el.setPointerCapture(e.pointerId); } catch (err) { }
    el.classList.add('is-grabbing');
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragState) return;
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    dragState.moved = true;

    var s = dragState.slot;
    s.x = Math.max(0, dragState.ox + dx);
    s.y = Math.max(0, dragState.oy + dy);
    dragState.el.style.left = s.x + 'px';
    dragState.el.style.top = s.y + 'px';
    dragState.el.classList.add('is-dragging');

    dragState.kids.forEach(function (k) {
      k.slot.x = Math.max(0, k.x + dx);
      k.slot.y = Math.max(0, k.y + dy);
      if (k.el) {
        k.el.style.left = k.slot.x + 'px';
        k.el.style.top = k.slot.y + 'px';
      }
    });
    drawLinks();
  }

  function onPointerUp() {
    if (!dragState) return;
    var st = dragState;
    dragState = null;
    st.el.classList.remove('is-grabbing', 'is-dragging');
    if (st.moved) {
      renderCanvas();
      saveBoard();
    } else {
      var s = slotById(st.id);
      if (board.reparent) {
        var clar = slotById(board.reparent);
        var target = slotById(st.id);
        var ok = clar && target && target.cardId && target.id !== clar.id && !isDescendant(target.id, clar.id);
        if (ok) {
          attachClarifier(clar, target);
          board.selected = clar.id;
        }
        board.reparent = null;
        boardEl.classList.remove('is-reparenting');
        renderBoard();
        renderReadings();
        saveBoard();
        return;
      }
      if (s && s.cardId) selectSlot(st.id);
      else if (s) openPicker('fill', st.id);
    }
  }

  /* ---------- выбор карты ---------- */
  function pickerTitle() {
    var p = board.picker;
    var s = p.slotId ? slotById(p.slotId) : null;
    if (p.mode === 'clarify' && s) return 'Уточнение к «' + (s.label || 'позиции') + '»';
    if (p.mode === 'add') return 'Новая позиция';
    if (s) return s.label || 'Позиция';
    return 'Выберите карту';
  }

  function openPicker(mode, slotId) {
    board.picker = { mode: mode, slotId: slotId || null };
    $('#bpickerPos').textContent = pickerTitle();
    var s = slotId ? slotById(slotId) : null;
    $('#bpickerRemove').hidden = !(s && s.cardId);
    pickerSearch.value = '';
    renderPickerGrid('');
    pickerEl.hidden = false;
    document.body.classList.add('picker-open');
    setTimeout(function () { pickerSearch.focus(); }, 40);
  }

  function closePicker() {
    pickerEl.hidden = true;
    document.body.classList.remove('picker-open');
    board.picker = { mode: null, slotId: null };
  }

  function renderPickerGrid(query) {
    var q = norm(query || '');
    var items = CARDS.filter(function (c) {
      if (!q) return true;
      return norm([c.name, c.en, c.keywords.join(' '), SUITS[c.suit].name].join(' ')).indexOf(q) !== -1;
    });
    var cur = board.selected ? slotById(board.selected) : null;
    pickerGrid.innerHTML = items.map(function (c) {
      return '<button class="pick' + (cur && cur.cardId === c.id ? ' is-current' : '') +
        '" data-pick="' + c.id + '" draggable="true">' +
        '<span class="mini-card" style="--accent:' + SUITS[c.suit].color + '">' +
          '<img src="' + cardImage(c) + '" alt="" loading="lazy" onerror="this.remove()">' +
        '</span>' +
        '<span class="pick-name">' + c.name + '</span>' +
      '</button>';
    }).join('') || '<p class="no-results">Ничего не нашлось.</p>';
  }

  /* ---------- подпись ---------- */
  function openLabel(slot) {
    textModal.dataset.slot = slot.id;
    $('#textTitle').textContent = slot.parentId ? 'Подпись уточнения' : 'Подпись позиции';
    $('#textInput').value = slot.label || '';
    textModal.hidden = false;
    document.body.classList.add('picker-open');
    setTimeout(function () { $('#textInput').focus(); $('#textInput').select(); }, 40);
  }
  function closeLabel() {
    textModal.hidden = true;
    document.body.classList.remove('picker-open');
  }

  /* ---------- трактовки ---------- */
  function readGroupHTML(slot) {
    var card = byId[slot.cardId];
    var kids = childrenOf(slot.id).filter(function (k) { return k.cardId; });
    var sub = subFor(slot);
    var place = slot.label + (sub ? ' · ' + sub : '') + (slot.group ? ' · ' + groupName(slot.group) : '');

    var clar = kids.map(function (k, i) {
      var c = byId[k.cardId];
      return '<div class="clar-item">' +
        '<div class="clar-top"><span class="clar-num">уточнение ' + (i + 1) + '</span>' +
          '<span class="clar-name">' + c.name + '</span></div>' +
        '<p class="clar-meaning">' + c.meaning + '</p>' +
        '<p class="clar-advice">' + c.advice + '</p>' +
      '</div>';
    }).join('');

    return '<article class="read">' +
      '<div class="read-head">' +
        miniCard(card) +
        '<div>' +
          '<span class="read-pos">' + place + '</span>' +
          '<h3 class="read-name">' + card.name + '</h3>' +
          '<div class="sel-meta"><i class="dot"></i>' + suitLabel(card) +
            '<span class="sep">·</span>' + ELEMENTS[card.element].name +
            '<span class="sep">·</span>' + TONE_LABEL[card.tone] +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="read-lens"><b>' + slot.label + ':</b> ' + card.keywords.slice(0, 4).join(', ') + '.</p>' +
      '<p class="read-meaning">' + card.meaning + '</p>' +
      '<p class="read-advice"><b>Совет карты</b>' + card.advice + '</p>' +
      (clar ? '<div class="clar-list"><span class="clar-head">Уточнения</span>' + clar + '</div>' : '') +
    '</article>';
  }

  function elementRelation(a, b) {
    if (a.element === b.element) {
      return { kind: 'same', label: 'одна стихия', text: 'Рядом родная стихия — карта звучит на полную.' };
    }
    var key = [a.element, b.element].sort().join('+');
    var names = ELEMENTS[a.element].name + ' и ' + ELEMENTS[b.element].name.toLowerCase();
    if (key === 'air+fire' || key === 'earth+water') {
      return { kind: 'friend', label: 'усиливают', text: names + ' — друзья, карты подпитывают друг друга.' };
    }
    if (key === 'air+water' || key === 'earth+fire') {
      return { kind: 'neutral', label: 'нейтральны', text: names + ' — нейтральны: не мешают и не помогают.' };
    }
    return { kind: 'clash', label: 'гасят', text: names + ' — гасят друг друга, карта теряет силу.' };
  }

  function pairsBlock(list) {
    var withCards = list.filter(function (s) { return s.cardId; });
    if (withCards.length < 2) return '';

    var pairs = [];
    var grid = withCards.filter(function (s) { return s.row != null && s.col != null; });
    if (grid.length >= 2) {
      for (var i = 0; i < withCards.length; i++) {
        for (var j = i + 1; j < withCards.length; j++) {
          var a = withCards[i], b = withCards[j];
          if (a.row == null || b.row == null) continue;
          if (a.group !== b.group) continue;
          if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1) pairs.push([a, b]);
        }
      }
    } else {
      for (var k = 0; k < withCards.length - 1; k++) {
        if (withCards[k].group !== withCards[k + 1].group) continue;
        pairs.push([withCards[k], withCards[k + 1]]);
      }
    }
    if (!pairs.length) return '';

    var rows = pairs.map(function (p) {
      var rel = elementRelation(byId[p[0].cardId], byId[p[1].cardId]);
      return '<div class="pair">' +
        '<div class="pair-top">' +
          '<span class="pair-cards">«' + p[0].label + '» ↔ «' + p[1].label + '»</span>' +
          '<span class="pair-rel pair-rel--' + rel.kind + '">' + rel.label + '</span>' +
        '</div>' +
        '<p>' + byId[p[0].cardId].name + ' + ' + byId[p[1].cardId].name + '. ' + rel.text + '</p>' +
      '</div>';
    }).join('');

    return '<div class="section-title"><h2>Связки соседних карт</h2><span class="rule"></span></div>' +
      '<div class="pairs">' + rows + '</div>' +
      '<p class="pairs-note">Пары считаются по структуре расклада — соседние позиции, а не расстояние на столе. Перетаскивание карт связи не меняет.</p>';
  }

  function summaryBlock(list) {
    if (list.length < 2) return '';
    var cards = list.map(function (s) { return byId[s.cardId]; });

    if (board.includeClar) {
      list.forEach(function (m) {
        childrenOf(m.id).forEach(function (k) {
          if (k.cardId) cards.push(byId[k.cardId]);
        });
      });
    }

    var seg = '<div class="sum-tools"><div class="seg" id="sumSeg">' +
      '<button data-inc="1" class="' + (board.includeClar ? 'is-active' : '') + '">С уточнениями</button>' +
      '<button data-inc="0" class="' + (board.includeClar ? '' : 'is-active') + '">Только основные</button>' +
      '</div><span class="sum-note">' + (board.includeClar
        ? 'уточнения учтены в мастях и стихиях'
        : 'считаются только основные карты') + '</span></div>';

    return '<div class="section-title"><h2>Общая картина</h2><span class="rule"></span></div>' +
      seg + summaryHTML(cards, { hideTitle: true });
  }

  function renderReadings() {
    var filledMains = mains().filter(function (s) { return s.cardId; });
    var filled = board.slots.filter(function (s) { return s.cardId; });

    if (!filled.length) {
      readingsEl.innerHTML = '<div class="table-empty">' +
        '<div class="empty-mark"><svg viewBox="0 0 100 100"><rect x="18" y="18" width="26" height="30" rx="3"/>' +
        '<rect x="56" y="18" width="26" height="30" rx="3"/><rect x="18" y="56" width="26" height="30" rx="3"/>' +
        '<rect x="56" y="56" width="26" height="30" rx="3"/></svg></div>' +
        '<h3>Стол пуст</h3>' +
        '<p>Нажмите на поле с плюсом и выберите карту. Или добавьте карту кнопкой «+ Карта», а потом перетащите её по столу.</p>' +
      '</div>';
      return;
    }

    var html = '<div class="section-title"><h2>Трактовки по позициям</h2><span class="rule"></span></div>' +
      '<div class="reads">' + filledMains.map(readGroupHTML).join('') + '</div>';

    html += pairsBlock(mains());
    html += summaryBlock(filledMains);
    readingsEl.innerHTML = html;

    requestAnimationFrame(function () {
      $$('.bar-fill', readingsEl).forEach(function (el) { el.style.width = el.dataset.w + '%'; });
    });
  }

  /* ---------- инициализация ---------- */
  function init() {
    boardEl = $('#board');
    readingsEl = $('#bReadings');
    nodeBar = $('#nodeBar');
    pickerEl = $('#bpicker');
    pickerGrid = $('#bpickerGrid');
    pickerSearch = $('#bpickerSearch');
    textModal = $('#textModal');
    if (!boardEl) return;

    boardEl.addEventListener('pointerdown', onPointerDown);
    boardEl.addEventListener('pointermove', onPointerMove);
    boardEl.addEventListener('pointerup', onPointerUp);
    boardEl.addEventListener('pointercancel', onPointerUp);
    boardEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var el = e.target.closest('.slot');
      if (!el) return;
      e.preventDefault();
      var s = slotById(el.dataset.id);
      if (s && s.cardId) selectSlot(s.id);
      else if (s) openPicker('fill', s.id);
    });

    $('#templateChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.template-chip');
      if (!chip || chip.dataset.template === board.template) return;
      var hasCards = board.slots.some(function (s) { return s.cardId; });
      if (hasCards && !window.confirm('Сменить расклад? Карты со стола будут убраны.')) return;
      buildBoard(chip.dataset.template);
      renderBoard();
      renderReadings();
      centerBoard();
      saveBoard();
    });

    $('#boardSettings').addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'setWeek') { board.meta.weekStart = e.target.value || mondayISO(); renderBoard(); saveBoard(); }
      if (id === 'setDate') { board.meta.date = e.target.value || todayISO(); renderBoard(); saveBoard(); }
      if (id === 'setMonth') { board.meta.startMonth = e.target.value || thisMonth(); renderBoard(); saveBoard(); }
      if (id === 'setCount') {
        board.meta.monthCount = Number(e.target.value) || 3;
        syncMonths();
        renderBoard();
        renderReadings();
        saveBoard();
      }
    });

    $('#addCardBtn').addEventListener('click', function () {
      var empty = board.slots.filter(function (s) { return !s.cardId && !s.parentId; })[0];
      if (empty) openPicker('fill', empty.id);
      else openPicker('add', null);
    });

    $('#addSlotBtn').addEventListener('click', function () {
      var pos = nextFreePosition();
      var s = makeSlot('Позиция ' + (mains().length + 1), pos.x, pos.y);
      board.slots.push(s);
      renderBoard();
      saveBoard();
      selectSlot(s.id);
      openLabel(s);
    });

    $('#alignBtn').addEventListener('click', function () {
      alignBoard();
      renderBoard();
      saveBoard();
    });

    $('#shareBoard').addEventListener('click', function () {
      var url = location.origin + location.pathname + '#tab=table&d=' + encodeBoard();
      var btn = $('#shareBoard');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url);
        }
      } catch (e) { }
      try { history.replaceState(null, '', '#tab=table&d=' + encodeBoard()); } catch (e) { }
      btn.textContent = 'Скопировано';
      setTimeout(function () { btn.textContent = 'Ссылка'; }, 1600);
    });

    $('#clearBoard').addEventListener('click', function () {
      if (!board.slots.length) return;
      if (!window.confirm('Убрать все карты со стола?')) return;
      buildBoard(board.template);
      renderBoard();
      renderReadings();
      saveBoard();
    });

    nodeBar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'close') { deselect(); return; }
      var s = board.selected ? slotById(board.selected) : null;
      if (!s) return;
      if (act === 'clarify') openPicker('clarify', s.id);
      if (act === 'reparent') {
        board.reparent = s.id;
        boardEl.classList.add('is-reparenting');
        $('#nodeBarTitle').textContent = 'Кликните карту-родителя';
        return;
      }
      if (act === 'replace') openPicker('replace', s.id);
      if (act === 'label') openLabel(s);
      if (act === 'delete') {
        deleteSlot(s.id);
        renderBoard();
        renderReadings();
        saveBoard();
      }
      if (act === 'detach') {
        s.parentId = null;
        if (/^Уточнение/.test(s.label)) s.label = 'Позиция ' + (mains().length + 1);
        renderBoard();
        renderReadings();
        saveBoard();
      }
    });

    pickerGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('.pick');
      if (btn) placeCard(btn.dataset.pick);
    });

    $('#bpickerRemove').addEventListener('click', function () {
      var s = board.picker.slotId ? slotById(board.picker.slotId) : null;
      if (s) s.cardId = null;
      closePicker();
      renderBoard();
      renderReadings();
      saveBoard();
    });

    $('#bpickerClose').addEventListener('click', closePicker);
    pickerEl.addEventListener('click', function (e) { if (e.target === pickerEl) closePicker(); });
    pickerSearch.addEventListener('input', function () { renderPickerGrid(pickerSearch.value); });

    pickerGrid.addEventListener('dragstart', function (e) {
      var btn = e.target.closest('.pick');
      if (!btn) return;
      e.dataTransfer.setData('text/plain', btn.dataset.pick);
      e.dataTransfer.effectAllowed = 'copy';
      pickerEl.classList.add('is-dragging');
    });
    pickerGrid.addEventListener('dragend', function () { pickerEl.classList.remove('is-dragging'); });

    boardEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    boardEl.addEventListener('drop', function (e) {
      e.preventDefault();
      var id = e.dataTransfer.getData('text/plain');
      if (!id || !byId[id]) return;
      var rect = boardEl.getBoundingClientRect();
      var x = Math.max(0, Math.round(e.clientX - rect.left - CARD_W / 2));
      var y = Math.max(0, Math.round(e.clientY - rect.top - CARD_H / 2));
      var s = makeSlot('Позиция ' + (mains().length + 1), x, y);
      s.cardId = id;
      board.slots.push(s);
      board.selected = s.id;
      pickerEl.classList.remove('is-dragging');
      closePicker();
      renderBoard();
      renderReadings();
      saveBoard();
    });

    $('#textSave').addEventListener('click', function () {
      var s = slotById(textModal.dataset.slot);
      if (s) {
        var v = ($('#textInput').value || '').trim();
        if (v) s.label = v;
        closeLabel();
        renderBoard();
        renderReadings();
        saveBoard();
      }
    });
    $('#textCancel').addEventListener('click', closeLabel);
    $('#textInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('#textSave').click(); }
    });

    readingsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('#sumSeg [data-inc]');
      if (!btn) return;
      board.includeClar = btn.dataset.inc === '1';
      renderReadings();
      saveBoard();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!pickerEl.hidden) closePicker();
        if (textModal && !textModal.hidden) closeLabel();
        if (board.selected) deselect();
      }
    });

    /* старт: ссылка → сохранённый стол → шаблон по умолчанию */
    var started = false;
    var pickIdx = null;
    var raw = location.hash.replace(/^#/, '');
    if (raw) {
      raw.split('&').forEach(function (part) {
        var kv = part.split('=');
        if (kv[0] === 'd' && kv[1]) {
          var data = decodeBoard(kv[1]);
          if (data) { applySnapshot(data); started = true; }
        }
        if (kv[0] === 'l' && kv[1] && !started) {
          var legacy = { row3: 'ppf3', row5: 'five', grid9: 'grid9' }[kv[1]] || 'situation3';
          buildBoard(legacy);
          started = true;
        }
        if (kv[0] === 't' && kv[1] && started) {
          var ids = kv[1].split(',');
          var list = mains();
          ids.forEach(function (id, i) {
            if (byId[id] && list[i]) list[i].cardId = id;
          });
        }
        if (kv[0] === 'pick' && kv[1] != null) pickIdx = Number(kv[1]);
      });
    }
    if (!started) started = loadBoard();
    if (!started) buildBoard('situation3');

    renderBoard();
    renderReadings();
    centerBoard();
    if (pickIdx != null && mains()[pickIdx]) openPicker('fill', mains()[pickIdx].id);
    if (!raw) saveBoard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.BOARD = {
    encode: function () { return encodeBoard(); },
    reset: function (tpl) { buildBoard(tpl || 'situation3'); renderBoard(); renderReadings(); saveBoard(); }
  };
})();
