/* =========================================================================
   Оракул — логика библиотеки карт
   ========================================================================= */
(function () {
  'use strict';

  var T = window.TAROT;
  var CARDS = T.cards;
  var SUITS = T.suits;
  var ELEMENTS = T.elements;
  var byId = {};
  CARDS.forEach(function (c) { byId[c.id] = c; });

  /* ---------- формы слов ---------- */
  var SUIT_FORMS = {
    major: ['Старший аркан', 'Старших аркана', 'Старших арканов'],
    wands: ['Жезл', 'Жезла', 'Жезлов'],
    cups: ['Кубок', 'Кубка', 'Кубков'],
    swords: ['Меч', 'Меча', 'Мечей'],
    pentacles: ['Пентакль', 'Пентакля', 'Пентаклей']
  };
  var CARD_FORMS = ['карта', 'карты', 'карт'];
  var TONE_LABEL = { light: 'светлая', neutral: 'нейтральная', heavy: 'тяжёлая' };

  function plural(n, forms) {
    var a = Math.abs(n) % 100;
    var b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b === 1) return forms[0];
    if (b >= 2 && b <= 4) return forms[1];
    return forms[2];
  }
  function pluralBy(n, forms) { return n + ' ' + plural(n, forms); }

  /* ---------- расклады: подписи позиций ---------- */
  var SPREADS = [
    { id: 'free', name: 'Без позиций — свободный выбор', positions: [] },
    { id: 'ppf', name: '3 карты: Прошлое · Настоящее · Будущее', positions: ['Прошлое', 'Настоящее', 'Будущее'] },
    { id: 'ssi', name: '3 карты: Ситуация · Совет · Итог', positions: ['Ситуация', 'Совет', 'Итог'] },
    { id: 'five', name: '5 карт: ситуация и итог', positions: ['Ситуация', 'Что мешает', 'Что помогает', 'Совет', 'Итог'] },
    { id: 'cross', name: 'Кельтский крест (10 карт)', positions: ['Суть', 'Вызов', 'Корни', 'Недавнее прошлое', 'Цель', 'Скрытое', 'Совет', 'Окружение', 'Надежды и страхи', 'Итог'] }
  ];

  var state = {
    selected: [],
    filter: 'all',
    query: '',
    spreadId: 'free',
    lastAdded: null
  };

  /* ---------- иконки ---------- */
  var SYMBOLS = [
    '<symbol id="sym-major" viewBox="0 0 100 100">',
    '<circle cx="50" cy="50" r="31"/>',
    '<path d="M50 12 L57 43 L88 50 L57 57 L50 88 L43 57 L12 50 L43 43 Z"/>',
    '</symbol>',
    '<symbol id="sym-wands" viewBox="0 0 100 100">',
    '<path d="M50 10 V90"/>',
    '<path d="M50 32 C40 29 33 22 32 12 C41 15 47 21 50 29"/>',
    '<path d="M50 32 C60 29 67 22 68 12 C59 15 53 21 50 29"/>',
    '<path d="M50 58 C41 55 35 48 34 39 C42 42 48 48 50 55"/>',
    '<path d="M50 58 C59 55 65 48 66 39 C58 42 52 48 50 55"/>',
    '</symbol>',
    '<symbol id="sym-cups" viewBox="0 0 100 100">',
    '<path d="M27 20 H73 V40 C73 56 63 66 50 66 C37 66 27 56 27 40 Z"/>',
    '<path d="M50 66 V83"/>',
    '<path d="M32 87 H68"/>',
    '<path d="M39 28 H61"/>',
    '</symbol>',
    '<symbol id="sym-swords" viewBox="0 0 100 100">',
    '<path d="M50 8 L58 34 V60 H42 V34 Z"/>',
    '<path d="M27 60 H73"/>',
    '<path d="M50 60 V85"/>',
    '<path d="M40 85 H60"/>',
    '</symbol>',
    '<symbol id="sym-pentacles" viewBox="0 0 100 100">',
    '<circle cx="50" cy="50" r="36"/>',
    '<path d="M50 18 L57.9 39.2 L80.4 40.1 L62.7 54.1 L68.8 75.9 L50 63.4 L31.2 75.9 L37.3 54.1 L19.6 40.1 L42.1 39.2 Z"/>',
    '</symbol>'
  ].join('');

  /* ---------- утилиты ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').trim(); }

  function emblemSVG(card) {
    if (card.arcana === 'major') {
      return '<svg viewBox="0 0 100 100" aria-hidden="true">' + card.sigil + '</svg>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sym-' + card.suit +
      '" width="100" height="100"></use></svg>';
  }

  /* ---------- сканы колоды Уэйта (Wikimedia Commons, 1909, public domain) ---------- */
  var MAJOR_FILES = [
    'RWS_Tarot_00_Fool', 'RWS_Tarot_01_Magician', 'RWS_Tarot_02_High_Priestess',
    'RWS_Tarot_03_Empress', 'RWS_Tarot_04_Emperor', 'RWS_Tarot_05_Hierophant',
    'RWS_Tarot_06_Lovers', 'RWS_Tarot_07_Chariot', 'RWS_Tarot_08_Strength',
    'RWS_Tarot_09_Hermit', 'RWS_Tarot_10_Wheel_of_Fortune', 'RWS_Tarot_11_Justice',
    'RWS_Tarot_12_Hanged_Man', 'RWS_Tarot_13_Death', 'RWS_Tarot_14_Temperance',
    'RWS_Tarot_15_Devil', 'RWS_Tarot_16_Tower', 'RWS_Tarot_17_Star',
    'RWS_Tarot_18_Moon', 'RWS_Tarot_19_Sun', 'RWS_Tarot_20_Judgement', 'RWS_Tarot_21_World'
  ];
  var SUIT_FILES = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pents' };

  function cardImage(card) {
    var file;
    if (card.arcana === 'major') {
      file = MAJOR_FILES[card.rank];
    } else {
      file = SUIT_FILES[card.suit] + (card.rank < 10 ? '0' + card.rank : String(card.rank));
    }
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + file + '.jpg?width=250';
  }

  function miniCard(card, extraClass) {
    var cls = 'mini-card has-photo' + (card.arcana === 'major' ? ' is-major' : '') +
      (extraClass ? ' ' + extraClass : '');
    return '<span class="' + cls + '" style="--accent:' + SUITS[card.suit].color + '">' +
      emblemSVG(card) +
      '<img src="' + cardImage(card) + '" alt="" loading="lazy" onerror="this.remove()">' +
    '</span>';
  }

  function suitLabel(card) {
    return card.arcana === 'major' ? 'Старший аркан' : SUITS[card.suit].short;
  }

  /* =======================================================================
     Библиотека
     ======================================================================= */
  var libGrid = $('#libGrid');
  var libCount = $('#libCount');
  var searchInput = $('#searchInput');
  var searchWrap = $('#searchWrap');

  function rowHTML(card) {
    var meta = suitLabel(card) + ' · ' + ELEMENTS[card.element].name + ' · ' + TONE_LABEL[card.tone];
    return '<button class="card-row" data-id="' + card.id + '" aria-pressed="false" ' +
      'style="--accent:' + SUITS[card.suit].color + '">' +
      miniCard(card) +
      '<span class="row-main">' +
        '<span class="row-name">' + card.name + '</span>' +
        '<span class="row-meta"><i class="dot"></i>' + meta + '</span>' +
        '<span class="row-kw">' + card.keywords.slice(0, 3).join(' · ') + '</span>' +
      '</span>' +
      '<span class="row-order"></span>' +
    '</button>';
  }

  function renderLibrary() {
    var q = norm(state.query);
    var items = CARDS.filter(function (c) {
      if (state.filter !== 'all' && c.suit !== state.filter) return false;
      if (!q) return true;
      var hay = norm([
        c.name, c.en, c.keywords.join(' '), c.meaning, c.advice,
        SUITS[c.suit].name, SUITS[c.suit].sphere, ELEMENTS[c.element].name
      ].join(' '));
      return hay.indexOf(q) !== -1;
    });

    libGrid.innerHTML = items.map(rowHTML).join('') ||
      '<p class="no-results">Ничего не нашлось. Попробуйте другое слово — например, «конфликт», «деньги» или «любовь».</p>';

    libCount.textContent = items.length
      ? pluralBy(items.length, CARD_FORMS)
      : 'ничего не найдено';

    syncRows();
  }

  function syncRows() {
    $$('.card-row').forEach(function (row) {
      var idx = state.selected.indexOf(row.dataset.id);
      var on = idx !== -1;
      row.classList.toggle('is-selected', on);
      row.setAttribute('aria-pressed', on ? 'true' : 'false');
      row.querySelector('.row-order').textContent = on ? String(idx + 1) : '';
    });
  }

  libGrid.addEventListener('click', function (e) {
    var row = e.target.closest('.card-row');
    if (row) toggleCard(row.dataset.id);
  });

  searchInput.addEventListener('input', function () {
    state.query = searchInput.value;
    searchWrap.classList.toggle('has-value', !!searchInput.value);
    renderLibrary();
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      state.query = '';
      searchWrap.classList.remove('has-value');
      renderLibrary();
    }
  });
  $('#searchClear').addEventListener('click', function () {
    searchInput.value = '';
    state.query = '';
    searchWrap.classList.remove('has-value');
    renderLibrary();
    searchInput.focus();
  });

  $$('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.filter = chip.dataset.filter;
      $$('.chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      renderLibrary();
    });
  });

  /* =======================================================================
     Выбор карт
     ======================================================================= */
  function toggleCard(id) {
    var i = state.selected.indexOf(id);
    if (i === -1) {
      state.selected.push(id);
      state.lastAdded = id;
    } else {
      state.selected.splice(i, 1);
      state.lastAdded = null;
    }
    syncRows();
    renderPanel();
  }

  function removeCard(id) {
    var i = state.selected.indexOf(id);
    if (i === -1) return;
    state.selected.splice(i, 1);
    state.lastAdded = null;
    syncRows();
    renderPanel();
  }

  /* =======================================================================
     Анализ расклада
     ======================================================================= */
  function analyze(list) {
    var n = list.length;
    var suitCount = { major: 0, wands: 0, cups: 0, swords: 0, pentacles: 0 };
    var elCount = { fire: 0, water: 0, air: 0, earth: 0 };
    var toneCount = { light: 0, neutral: 0, heavy: 0 };
    var ranks = {};
    var courts = [];
    var aces = [];

    list.forEach(function (c) {
      suitCount[c.suit]++;
      elCount[c.element]++;
      toneCount[c.tone]++;
      if (c.arcana === 'minor') {
        if (c.rank <= 10) ranks[c.rank] = (ranks[c.rank] || 0) + 1;
        else courts.push(c);
        if (c.rank === 1) aces.push(c);
      }
    });

    /* --- состав --- */
    var parts = [];
    ['major', 'wands', 'cups', 'swords', 'pentacles'].forEach(function (k) {
      if (suitCount[k]) parts.push(pluralBy(suitCount[k], SUIT_FORMS[k]));
    });
    var paragraphs = [];
    paragraphs.push('<strong>' + pluralBy(n, CARD_FORMS) + ' в раскладе:</strong> ' + parts.join(', ') + '.');

    /* --- ведущая масть --- */
    var suitKeys = ['major', 'wands', 'cups', 'swords', 'pentacles'].filter(function (k) { return suitCount[k] > 0; });
    suitKeys.sort(function (a, b) { return suitCount[b] - suitCount[a]; });
    var topSuit = suitKeys[0];
    var topCount = suitCount[topSuit];
    var singleSuit = suitKeys.length === 1 && n > 1;

    if (topCount >= 2 || singleSuit) {
      paragraphs.push('Преобладают <strong>' + SUITS[topSuit].name + '</strong> (' + topCount + ' из ' + n + ') — ' +
        SUITS[topSuit].inSpread + '.');
    }

    /* --- тон --- */
    if (toneCount.heavy >= Math.ceil(n / 2) && n >= 3) {
      paragraphs.push('Больше половины карт тяжёлые: идёт напряжение, и решать на эмоциях сейчас дорого.');
    } else if (toneCount.light >= Math.ceil(n / 2) && n >= 3 && toneCount.heavy === 0) {
      paragraphs.push('Светлых карт большинство — расклад скорее поддерживает, можно действовать.');
    }

    /* --- полоски мастей --- */
    var bars = suitKeys.map(function (k) {
      return {
        name: SUITS[k].short,
        count: suitCount[k],
        pct: Math.round(suitCount[k] / n * 100),
        color: SUITS[k].color
      };
    });

    var elKeys = ['fire', 'water', 'air', 'earth'].filter(function (k) { return elCount[k] > 0; });
    elKeys.sort(function (a, b) { return elCount[b] - elCount[a]; });

    var elBars = elKeys.map(function (k) {
      return {
        name: ELEMENTS[k].name,
        count: elCount[k],
        pct: Math.round(elCount[k] / n * 100),
        color: ELEMENTS[k].color
      };
    });

    /* --- заметки --- */
    var notes = [];

    if (elCount[elKeys[0]] >= 2) {
      var el = ELEMENTS[elKeys[0]];
      notes.push('Стихия <b>' + el.name + '</b> — ' + elCount[elKeys[0]] + ' ' +
        plural(elCount[elKeys[0]], CARD_FORMS) + ': ' + el.over);
    }

    if (suitCount.major === 0) {
      notes.push('Старших арканов нет — ситуация решается конкретными действиями, и руль в ваших руках.');
    } else if (suitCount.major === 1) {
      notes.push('Один старший аркан: в теме есть важный урок, но управлять по-прежнему можно своей позицией.');
    } else {
      notes.push('Старших арканов ' + suitCount.major + ' из ' + n + ' — это крупный этап, а не бытовой эпизод.');
    }

    if (courts.length) {
      notes.push('Фигурные карты — <b>' + courts.map(function (c) { return c.name; }).join(', ') +
        '</b>: в ситуации участвуют конкретные люди, и их роль важнее обстоятельств.');
    }

    if (aces.length) {
      notes.push('Есть Туз — в теме открывается новое начало, а не продолжение старого.');
    }

    var repRank = null;
    Object.keys(ranks).forEach(function (r) {
      if (ranks[r] >= 2) repRank = Number(r);
    });
    if (repRank) {
      notes.push('Число <b>' + repRank + '</b> повторяется (' + ranks[repRank] + ' раза): ' + T.numbers[repRank - 1].text);
    }

    return { n: n, paragraphs: paragraphs, bars: bars, elBars: elBars, notes: notes.slice(0, 5), suitCount: suitCount };
  }

  /* =======================================================================
     Панель расклада
     ======================================================================= */
  var panel = $('#panel');
  var panelBody = $('#panelBody');
  var panelCount = $('#panelCount');
  var clearBtn = $('#clearBtn');
  var jumpBtn = $('#jumpBtn');

  function currentSpread() {
    for (var i = 0; i < SPREADS.length; i++) if (SPREADS[i].id === state.spreadId) return SPREADS[i];
    return SPREADS[0];
  }

  function selCardHTML(card, index) {
    var spread = currentSpread();
    var posName = spread.positions[index] || null;
    var fresh = state.lastAdded === card.id ? ' fresh' : '';
    return '<article class="sel-card' + fresh + '" data-sel="' + card.id + '">' +
      '<div class="sel-head">' +
        miniCard(card) +
        '<div>' +
          '<span class="sel-pos">' +
            (posName ? (index + 1) + ' · ' + posName : 'Карта ' + (index + 1)) +
          '</span>' +
          '<h3 class="sel-name">' + card.name + '</h3>' +
          '<div class="sel-meta"><i class="dot"></i>' + suitLabel(card) +
            '<span class="sep">·</span>' + ELEMENTS[card.element].name +
            '<span class="sep">·</span>' + TONE_LABEL[card.tone] +
          '</div>' +
        '</div>' +
        '<button class="sel-remove" data-remove="' + card.id + '" aria-label="Убрать ' + card.name + '">×</button>' +
      '</div>' +
      '<ul class="kw">' + card.keywords.map(function (k) { return '<li>' + k + '</li>'; }).join('') + '</ul>' +
      '<p class="sel-meaning">' + card.meaning + '</p>' +
      '<p class="sel-advice"><b>Совет карты</b>' + card.advice + '</p>' +
    '</article>';
  }

  function summaryHTML(list) {
    var a = analyze(list);

    function group(title, rows) {
      return '<div class="bar-group"><div class="bar-group-title">' + title + '</div>' +
        rows.map(function (b) {
          return '<div class="bar-row" style="--accent:' + b.color + '">' +
            '<span class="bar-name">' + b.name + '</span>' +
            '<span class="bar-track"><span class="bar-fill" data-w="' + b.pct + '"></span></span>' +
            '<span class="bar-count">' + b.count + '</span>' +
          '</div>';
        }).join('') + '</div>';
    }

    var notes = a.notes.map(function (note) {
      return '<div class="note"><span class="note-mark">✦</span><span>' + note + '</span></div>';
    }).join('');

    return '<div class="summary">' +
      '<h4>Общая картина</h4>' +
      a.paragraphs.map(function (p) { return '<p>' + p + '</p>'; }).join('') +
      '<div class="bars">' + group('Масти', a.bars) + group('Стихии', a.elBars) + '</div>' +
      (notes ? '<div class="notes">' + notes + '</div>' : '') +
    '</div>';
  }

  function emptyHTML() {
    return '<div class="empty">' +
      '<div class="empty-mark"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34"/>' +
        '<path d="M50 16 L56 44 L84 50 L56 56 L50 84 L44 56 L16 50 L44 44 Z"/></svg></div>' +
      '<h3>Здесь появятся значения</h3>' +
      '<p>Отметьте карты в списке — по одной. Каждая сразу раскроется здесь: значение, совет, масть и стихия. А когда карт станет две и больше, добавится разбор всего расклада.</p>' +
    '</div>';
  }

  function renderPanel() {
    var list = state.selected.map(function (id) { return byId[id]; });
    var n = list.length;
    var scrollTop = panelBody.scrollTop;

    panelCount.textContent = n ? pluralBy(n, CARD_FORMS) : '';
    clearBtn.hidden = n === 0;
    jumpBtn.classList.toggle('is-visible', n > 0);

    if (!n) {
      panelBody.innerHTML = emptyHTML();
      state.lastAdded = null;
      return;
    }

    var html = '';
    html += '<div class="spread-select"><span>Позиции</span><select id="spreadSelect">' +
      SPREADS.map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === state.spreadId ? ' selected' : '') + '>' + s.name + '</option>';
      }).join('') +
      '</select></div>';

    html += '<div class="selected">' + list.map(selCardHTML).join('') + '</div>';
    if (n >= 2) html += summaryHTML(list);

    var added = state.lastAdded;
    panelBody.innerHTML = html;
    state.lastAdded = null;

    var desktop = window.matchMedia('(min-width: 1121px)').matches;
    if (added && desktop) {
      var cardEl = panelBody.querySelector('[data-sel="' + added + '"]');
      if (cardEl) {
        var top = cardEl.getBoundingClientRect().top -
          panelBody.getBoundingClientRect().top + panelBody.scrollTop - 12;
        panelBody.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      }
    } else {
      panelBody.scrollTop = scrollTop;
    }

    requestAnimationFrame(function () {
      $$('.bar-fill', panelBody).forEach(function (el) { el.style.width = el.dataset.w + '%'; });
    });
  }

  panelBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove]');
    if (btn) removeCard(btn.dataset.remove);
  });
  panelBody.addEventListener('change', function (e) {
    if (e.target.id === 'spreadSelect') {
      state.spreadId = e.target.value;
      renderPanel();
    }
  });

  /* =======================================================================
     Кнопки панели
     ======================================================================= */
  clearBtn.addEventListener('click', function () {
    state.selected = [];
    state.lastAdded = null;
    syncRows();
    renderPanel();
  });

  jumpBtn.addEventListener('click', function () {
    var top = panel.getBoundingClientRect().top + window.pageYOffset - 74;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });

  /* =======================================================================
     Вкладки
     ======================================================================= */
  function switchTab(name) {
    $$('.tab').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#tab-cards').hidden = name !== 'cards';
    $('#tab-guide').hidden = name !== 'guide';
  }

  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab.dataset.tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* =======================================================================
     Справочник
     ======================================================================= */
  function renderGuide() {
    var order = ['major', 'wands', 'cups', 'swords', 'pentacles'];
    $('#suitGrid').innerHTML = order.map(function (k) {
      var s = SUITS[k];
      var el = ELEMENTS[s.element];
      var emblem = '<svg viewBox="0 0 100 100"><use href="#sym-' + (k === 'major' ? 'major' : k) +
        '" width="100" height="100"></use></svg>';
      return '<article class="suit-card" style="--accent:' + s.color + '">' +
        '<div class="suit-card-top">' +
          '<span class="suit-emblem">' + emblem + '</span>' +
          '<div><span class="suit-element">' + (el ? el.name : '') + '</span>' +
          '<h3>' + s.name + '</h3></div>' +
        '</div>' +
        '<p>' + s.about + '</p>' +
        '<dl>' +
          '<dt>Сфера</dt><dd>' + s.sphere + '</dd>' +
          '<dt>Люди масти</dt><dd>' + s.people + '</dd>' +
          '<dt>В раскладе</dt><dd>' + s.inSpread.charAt(0).toUpperCase() + s.inSpread.slice(1) + '.</dd>' +
        '</dl>' +
      '</article>';
    }).join('') +
      '<article class="suit-card suit-note" style="--accent:var(--gold)">' +
        '<div class="suit-card-top">' +
          '<span class="suit-emblem">✦</span>' +
          '<div><span class="suit-element">подсказка</span><h3>Как читать масти</h3></div>' +
        '</div>' +
        '<p>Масть, которой в раскладе больше всего, задаёт тему: о чём вообще этот расклад. ' +
          'Масть, которой нет совсем, показывает, чего ситуации не хватает.</p>' +
        '<p>Два Меча и ни одного Кубка — спор и логика без тепла. Два Кубка и ни одного Пентакля — ' +
          'чувства есть, а опоры и денег нет.</p>' +
        '<p>Старшие арканы стоят отдельно: они не про сферу жизни, а про масштаб — ' +
          'насколько происходящее важнее бытового эпизода.</p>' +
      '</article>';

    $('#elemGrid').innerHTML = ['fire', 'water', 'air', 'earth'].map(function (k) {
      var el = ELEMENTS[k];
      return '<article class="elem-card" style="--accent:' + el.color + '">' +
        '<h3>' + el.name + '</h3>' +
        '<div class="elem-keys">' + el.keys + '</div>' +
        '<p><b>Когда много:</b> ' + el.over + '</p>' +
        '<p><b>Когда мало:</b> ' + el.under + '</p>' +
      '</article>';
    }).join('');

    $('#numGrid').innerHTML = T.numbers.map(function (n) {
      return '<div class="num-card"><span class="n">' + n.n + '</span><p>' + n.text + '</p></div>';
    }).join('');
  }

  /* =======================================================================
     Фон
     ======================================================================= */
  function stars() {
    var box = $('#stars');
    var html = '';
    for (var i = 0; i < 90; i++) {
      var size = Math.random() < 0.85 ? 1 : 2;
      html += '<i style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' +
        (Math.random() * 100).toFixed(2) + '%;width:' + size + 'px;height:' + size + 'px;' +
        '--dur:' + (4 + Math.random() * 6).toFixed(1) + 's;--delay:' + (Math.random() * 6).toFixed(1) + 's"></i>';
    }
    box.innerHTML = html;
  }

  /* =======================================================================
     Ссылка на расклад: #s=swords-5,cups-3&tab=cards
     ======================================================================= */
  function readHash() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return null;
    var tab = null;
    raw.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv[0] === 's' && kv[1]) {
        kv[1].split(',').forEach(function (id) {
          if (byId[id] && state.selected.indexOf(id) === -1) state.selected.push(id);
        });
      }
      if (kv[0] === 'tab' && (kv[1] === 'guide' || kv[1] === 'cards')) tab = kv[1];
    });
    return tab;
  }

  /* =======================================================================
     Старт
     ======================================================================= */
  document.body.insertAdjacentHTML('afterbegin',
    '<svg id="icons" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' +
    SYMBOLS + '</svg>');

  stars();
  var hashTab = readHash();
  renderLibrary();
  renderGuide();
  renderPanel();
  if (hashTab && hashTab !== 'cards') switchTab(hashTab);
})();
