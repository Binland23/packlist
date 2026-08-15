/**
 * Packlist — mobile-first packing app UI
 */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const main = $('#main');
  const pageTitle = $('#page-title');
  const topEyebrow = $('#top-eyebrow');
  const backBtn = $('#back-btn');
  const headerAction = $('#header-action');
  const tabbar = $('#tabbar');
  const sheet = $('#sheet');
  const sheetBackdrop = $('#sheet-backdrop');
  const sheetTitle = $('#sheet-title');
  const sheetBody = $('#sheet-body');
  const sheetClose = $('#sheet-close');
  const toastEl = $('#toast');
  const topbar = $('#topbar');

  /** @type {{ name: string, params: Record<string,string> }} */
  let route = { name: 'trips', params: {} };
  let toastTimer = null;
  let sheetOnClose = null;

  // ——— Utils ———
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
  }

  function plural(n, one, many) {
    return `${n} ${n === 1 ? one : many}`;
  }

  const CHECK_SVG =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
  const BACK_SVG =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const CHEV_SVG =
    '<svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';

  const THEMES = [
    { id: 'linen', name: 'Linen', note: 'Warm paper & terracotta', wash: '#F4EFE6', accent: '#C45C3E' },
    { id: 'midnight', name: 'Midnight', note: 'Charcoal & amber', wash: '#141210', accent: '#D4A054' },
    { id: 'harbor', name: 'Harbor', note: 'Sea glass & mist', wash: '#E4ECED', accent: '#2A6F6D' },
    { id: 'ink', name: 'Ink', note: 'Cream & near-black', wash: '#F3F1EA', accent: '#12110F' },
    { id: 'orchard', name: 'Orchard', note: 'Moss & cream', wash: '#EEF1E6', accent: '#4F6354' },
    { id: 'ember', name: 'Ember', note: 'Espresso & rust', wash: '#1A1410', accent: '#C45C3E' },
  ];

  function applyAppearance(prefs = PackStore.getPrefs()) {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme || 'linen';
    root.dataset.size = prefs.textSize || 'default';
    root.dataset.density = prefs.compactLists ? 'compact' : 'comfy';
    root.dataset.reduce = prefs.reduceMotion ? '1' : '0';
    const theme = THEMES.find((t) => t.id === prefs.theme) || THEMES[0];
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.wash;
  }

  function askConfirm(msg) {
    if (!PackStore.getPrefs().confirmDeletes) return true;
    return confirm(msg);
  }

  function optionHtml(values, selected) {
    return values
      .map((v) => `<option${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`)
      .join('');
  }

  function hintHtml(id, text) {
    if (PackStore.isHintHidden(id)) return '';
    return `
      <button type="button" class="page-hint" data-hint="${escapeHtml(id)}">
        <span>${text}</span>
        <span class="page-hint-dismiss">Tap to hide</span>
      </button>
    `;
  }

  function bindHints(root = main) {
    $$('[data-hint]', root).forEach((btn) => {
      btn.onclick = () => {
        PackStore.hideHint(btn.dataset.hint);
        btn.classList.add('hiding');
        const remove = () => btn.remove();
        btn.addEventListener('transitionend', remove, { once: true });
        setTimeout(remove, 280);
      };
    });
  }

  // ——— Routing ———
  function parseHash() {
    const raw = (location.hash || '#/trips').replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {};
    query.split('&').filter(Boolean).forEach((pair) => {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });

    if (parts[0] === 'trip' && parts[1]) {
      return { name: 'trip', params: { id: parts[1], view: params.view || 'plan' } };
    }
    if (parts[0] === 'outfit' && parts[1]) {
      return { name: 'outfit', params: { id: parts[1] } };
    }
    if (parts[0] === 'outfits') return { name: 'outfits', params: {} };
    if (parts[0] === 'accessories') return { name: 'accessories', params: {} };
    if (parts[0] === 'staples') return { name: 'staples', params: {} };
    if (parts[0] === 'settings') return { name: 'settings', params: {} };
    return { name: 'trips', params: {} };
  }

  function navigate(hash) {
    const next = hash.startsWith('#') ? hash : `#/${hash}`;
    if (location.hash === next) render();
    else location.hash = next;
  }

  function setChrome({ title, eyebrow, showBack, action }) {
    pageTitle.textContent = title;
    topEyebrow.textContent = eyebrow || 'Packlist';
    backBtn.innerHTML = BACK_SVG;
    backBtn.setAttribute('aria-label', 'Back');
    if (showBack) {
      backBtn.classList.remove('hidden', 'ghost-slot');
    } else {
      backBtn.classList.remove('hidden');
      backBtn.classList.add('ghost-slot');
      backBtn.onclick = null;
    }
    if (action) {
      headerAction.hidden = false;
      headerAction.classList.remove('ghost-slot');
      headerAction.setAttribute('aria-label', action.label || 'Add');
      headerAction.onclick = action.onClick;
    } else {
      headerAction.hidden = false;
      headerAction.classList.add('ghost-slot');
      headerAction.onclick = null;
    }
  }

  function syncTabs() {
    const tabRoute =
      route.name === 'trip' || route.name === 'trips'
        ? 'trips'
        : route.name === 'outfit' || route.name === 'outfits' || route.name === 'accessories'
          ? 'outfits'
          : route.name;
    $$('.tab', tabbar).forEach((tab) => {
      const active = tab.dataset.route === tabRoute;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  }

  function closetSegments(active) {
    return `
      <div class="segments" role="tablist">
        <button type="button" class="segment${active === 'outfits' ? ' active' : ''}" data-closet="outfits">Outfits</button>
        <button type="button" class="segment${active === 'accessories' ? ' active' : ''}" data-closet="accessories">Accessories</button>
      </div>
    `;
  }

  function bindClosetSegments() {
    $$('[data-closet]').forEach((seg) => {
      seg.onclick = () => navigate(seg.dataset.closet);
    });
  }

  // ——— Sheet ———
  function openSheet(title, bodyHtml, { onClose } = {}) {
    sheetOnClose = onClose || null;
    sheetTitle.textContent = title;
    sheetBody.innerHTML = bodyHtml;
    sheet.classList.remove('hidden');
    sheetBackdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.classList.add('hidden');
    sheetBackdrop.classList.add('hidden');
    document.body.style.overflow = '';
    const cb = sheetOnClose;
    sheetOnClose = null;
    if (cb) cb();
  }

  sheetClose.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  // ——— Photo helpers ———
  async function fillPhotoSlots(root = document) {
    const slots = $$('[data-photo-id]', root);
    await Promise.all(
      slots.map(async (el) => {
        const id = el.getAttribute('data-photo-id');
        if (!id) return;
        try {
          const url = await PackDB.getObjectUrl(id);
          if (url) {
            el.innerHTML = `<img src="${url}" alt="" />`;
          }
        } catch {
          /* keep placeholder */
        }
      })
    );
  }

  // ——— Category picker ———
  function mountCategoryPicker(container, { onPick, onBack, showBack = false } = {}) {
    let gender = PackStore.getPrefs().clothingGender || 'women';
    let tabs = ClothingCatalog.tabsFor(gender);
    let tab = tabs[0];
    let query = '';
    const picked = new Set();

    function markPicked(name) {
      picked.add(name.toLowerCase());
    }

    function isPicked(name) {
      return picked.has(name.toLowerCase());
    }

    function pillButton(name, group) {
      const extra = group ? `<span class="cat-pill-group">${escapeHtml(group)}</span>` : '';
      return `
        <button type="button" class="cat-pill${isPicked(name) ? ' picked' : ''}" data-pick="${escapeHtml(name)}">
          ${escapeHtml(name)}${extra}
        </button>
      `;
    }

    function paint() {
      tabs = ClothingCatalog.tabsFor(gender);
      if (!tabs.includes(tab)) tab = tabs[0];
      const q = query.trim();
      const searching = q.length > 0;

      let pillsInner = '';
      if (searching) {
        const hits = ClothingCatalog.searchAll(gender, q);
        const bankHits = PackStore.listAccessories().filter((a) =>
          a.name.toLowerCase().includes(q.toLowerCase())
        );
        if (!hits.length && !bankHits.length) {
          pillsInner = `<p class="cat-empty">No matches. Type a custom name below.</p>`;
        } else {
          if (bankHits.length) {
            pillsInner += `<p class="cat-group-label">Your accessories</p><div class="cat-pills">${bankHits
              .map((a) => pillButton(a.name, a.category))
              .join('')}</div>`;
          }
          if (hits.length) {
            pillsInner += `<p class="cat-group-label">Categories</p><div class="cat-pills">${hits
              .map((h) => pillButton(h.name, h.group))
              .join('')}</div>`;
          }
        }
      } else if (tab === 'Accessories') {
        const bank = PackStore.listAccessories();
        const byCat = new Map();
        bank.forEach((a) => {
          const cat = a.category || 'Other';
          if (!byCat.has(cat)) byCat.set(cat, []);
          byCat.get(cat).push(a);
        });
        const suggestionGroups = ClothingCatalog.ACCESSORY_TABS;
        const catOrder = PackStore.listAccessoryCategories();
        const extraCats = [
          ...Object.keys(suggestionGroups),
          ...byCat.keys(),
        ].filter((c) => !catOrder.includes(c));
        const allCats = [...catOrder, ...extraCats];

        if (!bank.length) {
          pillsInner += `<p class="cat-empty">Add your own jewelry — “chunky gold necklace”, the pearl earrings — or tap a suggestion below.</p>`;
        }

        allCats.forEach((cat) => {
          const list = byCat.get(cat) || [];
          const suggestions = suggestionGroups[cat] || [];
          if (!list.length && !suggestions.length) return;
          pillsInner += `<p class="cat-group-label">${escapeHtml(cat)}</p>`;
          if (list.length) {
            pillsInner += `<div class="cat-pills">${list.map((a) => pillButton(a.name)).join('')}</div>`;
          } else {
            pillsInner += `<p class="cat-group-label subtle">Suggestions</p><div class="cat-pills">${suggestions
              .map((n) => pillButton(n))
              .join('')}</div>`;
          }
        });
      } else {
        const pills = ClothingCatalog.pillsFor(gender, tab) || [];
        pillsInner = `<div class="cat-pills">${pills.map((n) => pillButton(n)).join('')}</div>`;
      }

      container.innerHTML = `
        <div class="cat-picker">
          ${
            showBack
              ? `<button type="button" class="text-back" id="cat-back">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                  Back to outfit
                </button>`
              : ''
          }
          <h3 class="cat-picker-heading">Select a category</h3>
          <div class="gender-toggle" role="tablist" aria-label="Clothing fit">
            <button type="button" class="gender-btn${gender === 'women' ? ' active' : ''}" data-gender="women">Women</button>
            <button type="button" class="gender-btn${gender === 'men' ? ' active' : ''}" data-gender="men">Men</button>
          </div>
          <div class="cat-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input class="input cat-search" id="cat-search" type="search" placeholder="Search categories" value="${escapeHtml(
              query
            )}" autocomplete="off" />
          </div>
          ${
            searching
              ? ''
              : `<div class="cat-tabs" role="tablist">
                  ${tabs
                    .map(
                      (t) =>
                        `<button type="button" class="cat-tab${t === tab ? ' active' : ''}" data-tab="${escapeHtml(
                          t
                        )}" role="tab" aria-selected="${t === tab}">${escapeHtml(t)}</button>`
                    )
                    .join('')}
                </div>`
          }
          <div class="cat-results">${pillsInner}</div>
          <div class="cat-custom">
            <label for="cat-custom-input">${
              tab === 'Accessories' ? 'Add your own piece' : 'Or type a custom item'
            }</label>
            <div class="input-row">
              <input class="input" id="cat-custom-input" placeholder="${
                tab === 'Accessories' ? 'e.g. Chunky gold necklace' : 'e.g. White linen tee'
              }" autocomplete="off" />
              <button type="button" class="btn btn-secondary" id="cat-custom-add" style="min-width:72px">Add</button>
            </div>
            ${
              tab === 'Accessories'
                ? `<div class="field" style="margin-top:10px">
                    <label for="cat-custom-cat">Save under</label>
                    <select class="input" id="cat-custom-cat">
                      ${optionHtml(PackStore.listAccessoryCategories(), 'Jewelry')}
                    </select>
                  </div>`
                : ''
            }
            <label class="check-inline">
              <input type="checkbox" id="cat-save-bank" ${tab === 'Accessories' ? 'checked' : ''} />
              Save to my jewelry &amp; accessories
            </label>
          </div>
        </div>
      `;

      if (showBack) $('#cat-back', container).onclick = () => onBack && onBack();

      $$('[data-gender]', container).forEach((btn) => {
        btn.onclick = () => {
          gender = btn.dataset.gender;
          PackStore.setPref('clothingGender', gender);
          tab = ClothingCatalog.tabsFor(gender)[0];
          paint();
        };
      });

      $$('[data-tab]', container).forEach((btn) => {
        btn.onclick = () => {
          tab = btn.dataset.tab;
          paint();
        };
      });

      $$('[data-pick]', container).forEach((btn) => {
        btn.onclick = () => {
          const name = btn.dataset.pick;
          markPicked(name);
          btn.classList.add('picked');
          if (onPick) onPick(name);
        };
      });

      const searchInput = $('#cat-search', container);
      searchInput.oninput = () => {
        query = searchInput.value;
        paint();
        const next = $('#cat-search', container);
        if (next) {
          next.focus();
          const len = next.value.length;
          next.setSelectionRange(len, len);
        }
      };

      const customInput = $('#cat-custom-input', container);
      const addCustom = () => {
        const name = customInput.value.trim();
        if (!name) return;
        const saveBank = $('#cat-save-bank', container)?.checked;
        const category = $('#cat-custom-cat', container)?.value || (tab === 'Accessories' ? 'Jewelry' : 'Other');
        if (saveBank) PackStore.addAccessory({ name, category });
        markPicked(name);
        if (onPick) onPick(name);
        customInput.value = '';
        customInput.focus();
        paint();
      };
      $('#cat-custom-add', container).onclick = addCustom;
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustom();
        }
      });
    }

    paint();
  }

  function showCategoryPicker({ title, onPick, onClose } = {}) {
    openSheet(title || 'Add item', '', { onClose });
    mountCategoryPicker(sheetBody, { onPick });
  }

  // ——— Render: Trips list ———
  function renderTrips() {
    const trips = PackStore.listTrips();
    setChrome({
      title: 'Trips',
      eyebrow: 'Packlist',
      showBack: false,
      action: {
        label: 'New trip',
        onClick: () => showNewTripSheet(),
      },
    });

    if (!trips.length) {
      main.innerHTML = `
        <div class="empty">
          <p class="empty-kicker">Start packing</p>
          <h2>Your next trip starts here</h2>
          <p>Save outfits once, then pick them for each day. Staples come along — drop anything this trip doesn’t need.</p>
          <button type="button" class="btn btn-primary" id="empty-new-trip">Plan a trip</button>
        </div>
      `;
      $('#empty-new-trip').onclick = () => showNewTripSheet();
      return;
    }

    main.innerHTML = `
      <div class="section">
        ${hintHtml('trips', 'Open a trip to plan days, add extras, and skip staples you don’t need this time.')}
        <div class="section-head">
          <h2 class="section-title">Upcoming & recent</h2>
          <span class="section-meta">${plural(trips.length, 'trip', 'trips')}</span>
        </div>
        <div class="stack" id="trip-list"></div>
      </div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="new-trip-btn">New trip</button>
      </div>
    `;

    const list = $('#trip-list');
    trips.forEach((trip) => {
      const pack = PackStore.buildPackingList(trip.id);
      const outfitCount = trip.days.reduce((n, d) => n + (d.outfitIds?.length || 0), 0);
      const extraCount = trip.days.reduce((n, d) => n + (d.items?.length || 0), 0);
      const pct = pack.total ? Math.round((pack.packedCount / pack.total) * 100) : 0;
      const extrasBit = extraCount ? ` · ${plural(extraCount, 'extra', 'extras')}` : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card pressable';
      btn.innerHTML = `
        <div class="card-body">
          <p class="card-title">${escapeHtml(trip.name)}</p>
          <p class="card-sub">${plural(trip.days.length, 'day', 'days')} · ${plural(
            outfitCount,
            'outfit',
            'outfits'
          )}${extrasBit} · ${pack.packedCount}/${pack.total} packed</p>
          <div class="progress-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        </div>
      `;
      btn.onclick = () => navigate(`trip/${trip.id}`);
      list.appendChild(btn);
    });

    $('#new-trip-btn').onclick = () => showNewTripSheet();
    bindHints();
  }

  function showNewTripSheet() {
    openSheet(
      'New trip',
      `
      <form id="new-trip-form">
        <div class="field">
          <label for="trip-name">Trip name</label>
          <input class="input" id="trip-name" name="name" placeholder="Lisbon long weekend" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="trip-days">Number of days</label>
          <input class="input" id="trip-days" name="days" type="number" min="1" max="30" value="${PackStore.getPrefs().defaultTripDays}" required />
          <p class="hint">You can add more than one outfit per day, plus extra items.</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Create trip</button>
      </form>
    `
    );
    const form = $('#new-trip-form');
    $('#trip-name').focus();
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = $('#trip-name').value.trim();
      const days = Number($('#trip-days').value) || 1;
      if (!name) return;
      const trip = PackStore.createTrip({ name, days });
      closeSheet();
      toast('Trip created');
      navigate(`trip/${trip.id}`);
    };
  }

  // ——— Render: Trip detail ———
  async function renderTrip() {
    const trip = PackStore.getTrip(route.params.id);
    if (!trip) {
      navigate('trips');
      toast('Trip not found');
      return;
    }

    const view = route.params.view === 'pack' ? 'pack' : 'plan';
    setChrome({
      title: trip.name,
      eyebrow: view === 'pack' ? 'Packing list' : 'Trip plan',
      showBack: true,
      action: {
        label: 'Trip options',
        onClick: () => showTripOptions(trip),
      },
    });
    backBtn.onclick = () => navigate('trips');

    if (view === 'pack') {
      renderPackView(trip);
      return;
    }

    const outfits = PackStore.listOutfits();
    const outfitMap = new Map(outfits.map((o) => [o.id, o]));
    const tripStaples = PackStore.getTripStaples(trip.id);

    main.innerHTML = `
      <div class="segments" role="tablist">
        <button type="button" class="segment active" data-view="plan">Plan days</button>
        <button type="button" class="segment" data-view="pack">Pack</button>
      </div>
      <div class="section">
        <div class="section-head">
          <h2 class="section-title">Days</h2>
          <span class="section-meta">${plural(trip.days.length, 'day', 'days')}</span>
        </div>
        <div id="days"></div>
      </div>
      <div class="section" id="trip-staples-section"></div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="go-pack">Start packing</button>
      </div>
    `;

    $$('.segment').forEach((seg) => {
      seg.onclick = () => navigate(`trip/${trip.id}?view=${seg.dataset.view}`);
    });
    $('#go-pack').onclick = () => navigate(`trip/${trip.id}?view=pack`);

    const daysEl = $('#days');
    for (const day of trip.days) {
      const extraCount = day.items?.length || 0;
      const metaBits = [
        plural(day.outfitIds.length, 'outfit', 'outfits'),
        extraCount ? plural(extraCount, 'extra', 'extras') : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const block = document.createElement('div');
      block.className = 'day-block';
      block.innerHTML = `
        <div class="day-header">
          <h3>${escapeHtml(day.label)}</h3>
          <span class="section-meta">${metaBits}</span>
        </div>
        <div class="day-outfits" data-day="${day.id}"></div>
      `;
      const container = $('.day-outfits', block);

      for (const oid of day.outfitIds) {
        const outfit = outfitMap.get(oid);
        const row = document.createElement('div');
        row.className = 'outfit-pick';
        if (!outfit) {
          row.innerHTML = `
            <div class="thumb">?</div>
            <div class="info"><strong>Missing outfit</strong><span>Removed from library</span></div>
            <button type="button" class="remove" aria-label="Remove" data-remove="${oid}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          `;
        } else {
          row.innerHTML = `
            <div class="thumb" data-photo-id="${outfit.photoId || ''}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
            </div>
            <div class="info">
              <strong>${escapeHtml(outfit.name)}</strong>
              <span>${outfit.items.length ? escapeHtml(outfit.items.join(' · ')) : 'No items yet'}</span>
            </div>
            <button type="button" class="remove" aria-label="Remove outfit" data-remove="${oid}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          `;
          row.querySelector('.info').style.cursor = 'pointer';
          row.querySelector('.info').onclick = () => navigate(`outfit/${outfit.id}`);
          row.querySelector('.thumb').style.cursor = 'pointer';
          row.querySelector('.thumb').onclick = () => navigate(`outfit/${outfit.id}`);
        }
        row.querySelector('[data-remove]').onclick = (e) => {
          e.stopPropagation();
          PackStore.removeOutfitFromDay(trip.id, day.id, oid);
          toast('Outfit removed from day');
          render();
        };
        container.appendChild(row);
      }

      if (day.items?.length) {
        const extrasWrap = document.createElement('div');
        extrasWrap.className = 'day-extras';
        day.items.forEach((item) => {
          const extra = document.createElement('div');
          extra.className = 'day-item-row';
          extra.innerHTML = `
            <span class="name">${escapeHtml(item.name)}</span>
            <span class="tag">This day</span>
            <button type="button" class="remove" aria-label="Remove ${escapeHtml(item.name)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          `;
          extra.querySelector('.remove').onclick = () => {
            PackStore.removeItemFromDay(trip.id, day.id, item.id);
            toast('Item removed from day');
            render();
          };
          extrasWrap.appendChild(extra);
        });
        container.appendChild(extrasWrap);
      }

      const addRow = document.createElement('div');
      addRow.className = 'day-add-row';
      addRow.innerHTML = `
        <button type="button" class="add-outfit-btn" data-add="outfit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Outfit
        </button>
        <button type="button" class="add-outfit-btn" data-add="item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Item
        </button>
      `;
      addRow.querySelector('[data-add="outfit"]').onclick = () => showAddOutfitToDay(trip, day);
      addRow.querySelector('[data-add="item"]').onclick = () => showAddItemToDay(trip, day);
      container.appendChild(addRow);
      daysEl.appendChild(block);
    }

    renderTripStaplesSection($('#trip-staples-section'), trip, tripStaples);
    bindHints();
    if (PackStore.getPrefs().showPhotos) await fillPhotoSlots(daysEl);
  }

  function renderTripStaplesSection(el, trip, tripStaples) {
    const hiddenCount = tripStaples.hidden.length;
    const groups = new Map();
    tripStaples.active.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(s);
    });

    el.innerHTML = `
      <div class="section-head">
        <h2 class="section-title">Staples this trip</h2>
        <span class="section-meta">${tripStaples.active.length} coming along</span>
      </div>
      ${hintHtml('trip-staples', 'Remove gloves for a summer trip — they stay in your usual staples for the next one.')}
      <div id="trip-staple-groups"></div>
      <div class="day-add-row" style="margin-top:10px">
        <button type="button" class="add-outfit-btn" id="add-trip-staple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Add staple
        </button>
        ${
          hiddenCount
            ? `<button type="button" class="add-outfit-btn" id="restore-trip-staples">Restore ${plural(
                hiddenCount,
                'hidden item',
                'hidden items'
              )}</button>`
            : `<button type="button" class="add-outfit-btn" id="manage-trip-staples">Manage list</button>`
        }
      </div>
    `;

    const groupsEl = $('#trip-staple-groups', el);
    if (!tripStaples.active.length) {
      groupsEl.innerHTML = `<p class="cat-empty">No staples on this trip. Add one, or restore your usual list.</p>`;
    } else {
      groups.forEach((items, cat) => {
        const block = document.createElement('div');
        block.className = 'trip-staple-group';
        block.innerHTML = `<p class="cat-group-label">${escapeHtml(cat)}</p>`;
        items.forEach((s) => {
          const row = document.createElement('div');
          row.className = 'staple-row compact';
          row.innerHTML = `
            <span class="name">${escapeHtml(s.name)}</span>
            ${s.source === 'trip' ? '<span class="tag">This trip</span>' : ''}
            <button type="button" class="del" aria-label="Remove ${escapeHtml(s.name)} from this trip">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          `;
          row.querySelector('.del').onclick = () => {
            PackStore.removeTripStaple(trip.id, s.id, s.source);
            toast('Removed from this trip');
            render();
          };
          block.appendChild(row);
        });
        groupsEl.appendChild(block);
      });
    }

    $('#add-trip-staple', el).onclick = () => showAddTripStaple(trip);
    const restoreBtn = $('#restore-trip-staples', el);
    if (restoreBtn) restoreBtn.onclick = () => showTripStaplesSheet(trip);
    const manageBtn = $('#manage-trip-staples', el);
    if (manageBtn) manageBtn.onclick = () => showTripStaplesSheet(trip);
  }

  function showAddTripStaple(trip) {
    openSheet(
      'Add staple to this trip',
      `
      <p class="hint" style="margin:0 0 12px">This stays on this trip only. Your usual staples list is unchanged.</p>
      <form id="trip-staple-form">
        <div class="field">
          <label for="trip-staple-name">Item</label>
          <input class="input" id="trip-staple-name" placeholder="Travel umbrella" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="trip-staple-cat">Category</label>
          <select class="input" id="trip-staple-cat">
            ${optionHtml(PackStore.listStapleCategories(), 'Other')}
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add to this trip</button>
      </form>
    `
    );
    $('#trip-staple-name').focus();
    $('#trip-staple-form').onsubmit = (e) => {
      e.preventDefault();
      const name = $('#trip-staple-name').value.trim();
      const category = $('#trip-staple-cat').value;
      if (!name) return;
      const result = PackStore.addTripStaple(trip.id, { name, category });
      closeSheet();
      if (result.action === 'restored') toast('Restored from your usual list');
      else if (result.action === 'exists') toast('Already on this trip');
      else toast('Added for this trip');
      render();
    };
  }

  function showTripStaplesSheet(trip) {
    const data = PackStore.getTripStaples(trip.id);
    openSheet(
      'Staples this trip',
      `
      <p class="hint" style="margin:0 0 14px">Hidden items stay in your usual staples. They just skip this trip.</p>
      <div id="hidden-staples"></div>
    `
    );
    const wrap = $('#hidden-staples');
    if (!data.hidden.length) {
      wrap.innerHTML = `<p class="cat-empty">Nothing hidden. Remove items from the trip plan to skip them here.</p>`;
      return;
    }
    data.hidden.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'staple-row';
      row.innerHTML = `
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="tag">${escapeHtml(s.category || 'Other')}</span>
        <button type="button" class="btn btn-secondary" style="min-height:40px;padding:8px 12px;font-size:13px">Restore</button>
      `;
      row.querySelector('button').onclick = () => {
        PackStore.restoreStapleToTrip(trip.id, s.id);
        toast(`Restored ${s.name}`);
        closeSheet();
        render();
      };
      wrap.appendChild(row);
    });
  }

  function showAddItemToDay(trip, day) {
    showCategoryPicker({
      title: `Add to ${day.label}`,
      onPick: (name) => {
        PackStore.addItemToDay(trip.id, day.id, { name });
        toast(`Added ${name}`);
      },
      onClose: () => render(),
    });
  }

  function renderPackView(trip) {
    const pack = PackStore.buildPackingList(trip.id);
    const pct = pack.total ? Math.round((pack.packedCount / pack.total) * 100) : 0;

    main.innerHTML = `
      <div class="segments" role="tablist">
        <button type="button" class="segment" data-view="plan">Plan days</button>
        <button type="button" class="segment active" data-view="pack">Pack</button>
      </div>
      ${hintHtml('pack', 'Each piece has its own checkbox. Repeats show again on later days — check once, and it stays checked everywhere.')}
      <div class="pack-summary">
        <div>
          <p class="label">Packed</p>
          <p class="big">${pack.packedCount}<span style="opacity:.5;font-size:.55em"> / ${pack.total}</span></p>
        </div>
        <div class="pct">${pct}%</div>
      </div>
      ${
        pack.total === 0
          ? `<div class="empty">
              <p class="empty-kicker">Nothing to pack yet</p>
              <h2>Add outfits or items to your days</h2>
              <p>Pick outfits, add extras for a single day, or restore staples. Each piece gets its own checkbox.</p>
              <button type="button" class="btn btn-primary" id="back-to-plan">Plan days</button>
            </div>`
          : `<div class="check-list" id="pack-list"></div>
             <div class="btn-row" style="margin-top:16px">
               <button type="button" class="btn btn-secondary" id="unpack-all">Reset checks</button>
             </div>`
      }
    `;

    $$('.segment').forEach((seg) => {
      seg.onclick = () => navigate(`trip/${trip.id}?view=${seg.dataset.view}`);
    });

    const backPlan = $('#back-to-plan');
    if (backPlan) backPlan.onclick = () => navigate(`trip/${trip.id}?view=plan`);

    bindHints();

    const unpack = $('#unpack-all');
    if (unpack) {
      unpack.onclick = () => {
        if (!askConfirm('Clear all packed checkmarks for this trip?')) return;
        PackStore.updateTrip(trip.id, { packed: {} });
        toast('Checks cleared');
        render();
      };
    }

    const list = $('#pack-list');
    if (!list) return;

    const prefs = PackStore.getPrefs();

    pack.dayGroups.forEach((day) => {
      const hasOutfits = day.outfits.length;
      const hasExtras = day.extras.length;
      const hasPieces = day.outfits.some((o) => o.items.length) || hasExtras;
      if (!hasOutfits && !hasExtras && prefs.hideEmptyDays) return;
      if (!hasOutfits && !hasExtras && !prefs.hideEmptyDays) {
        const label = document.createElement('div');
        label.className = 'check-group-label';
        label.textContent = day.label;
        list.appendChild(label);
        const empty = document.createElement('div');
        empty.className = 'pack-empty-note';
        empty.textContent = 'Nothing planned for this day.';
        list.appendChild(empty);
        return;
      }

      const label = document.createElement('div');
      label.className = 'check-group-label';
      const dayItems = [
        ...day.outfits.flatMap((o) => o.items),
        ...day.extras,
      ];
      const uniqueKeys = [...new Set(dayItems.map((i) => i.key))];
      const done = uniqueKeys.filter((k) => dayItems.find((i) => i.key === k)?.packed).length;
      label.innerHTML = `${escapeHtml(day.label)} <span class="check-count" style="float:right">${
        hasPieces ? `${done}/${uniqueKeys.length}` : 'No pieces'
      }</span>`;
      list.appendChild(label);

      day.outfits.forEach((outfit) => {
        if (prefs.showOutfitHeadings) {
          const sub = document.createElement('div');
          sub.className = 'pack-outfit-label';
          sub.textContent = outfit.name;
          list.appendChild(sub);
        }

        if (!outfit.items.length) {
          const empty = document.createElement('div');
          empty.className = 'pack-empty-note';
          empty.textContent = outfit.missing
            ? 'This outfit was removed from your library.'
            : 'No pieces listed — add items to the outfit, or extras to this day.';
          list.appendChild(empty);
          return;
        }

        outfit.items.forEach((item) => appendCheckItem(list, trip, item, prefs));
      });

      if (hasExtras) {
        if (prefs.showOutfitHeadings) {
          const sub = document.createElement('div');
          sub.className = 'pack-outfit-label';
          sub.textContent = 'Added to this day';
          list.appendChild(sub);
        }
        day.extras.forEach((item) => appendCheckItem(list, trip, item, prefs));
      }
    });

    pack.stapleGroups.forEach((group) => {
      const items = prefs.hidePackedItems ? group.items.filter((i) => !i.packed) : group.items;
      if (!items.length) return;
      const label = document.createElement('div');
      label.className = 'check-group-label';
      const done = group.items.filter((i) => i.packed).length;
      label.innerHTML = `${escapeHtml(group.label)} <span class="check-count" style="float:right">${done}/${group.items.length}</span>`;
      list.appendChild(label);
      items.forEach((item) => appendCheckItem(list, trip, item, prefs));
    });
  }

  function appendCheckItem(list, trip, item, prefs = PackStore.getPrefs()) {
    if (prefs.hidePackedItems && item.packed) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `check-item${item.packed ? ' done' : ''}`;
    btn.setAttribute('aria-pressed', item.packed ? 'true' : 'false');
    btn.innerHTML = `
      <span class="checkbox" aria-hidden="true">
        ${item.packed ? CHECK_SVG : ''}
      </span>
      <span class="check-label">
        ${escapeHtml(item.name)}
        ${
          item.note
            ? `<span class="check-note">${escapeHtml(item.note)}</span>`
            : ''
        }
      </span>
    `;
    btn.onclick = () => {
      PackStore.setPacked(trip.id, item.key, !item.packed);
      render();
    };
    list.appendChild(btn);
  }

  function showTripOptions(trip) {
    openSheet(
      'Trip options',
      `
      <form id="trip-edit-form">
        <div class="field">
          <label for="edit-trip-name">Name</label>
          <input class="input" id="edit-trip-name" value="${escapeHtml(trip.name)}" required />
        </div>
        <div class="field">
          <label for="edit-trip-days">Days</label>
          <input class="input" id="edit-trip-days" type="number" min="1" max="30" value="${trip.days.length}" required />
          <p class="hint">Reducing days removes outfits and extras from the last days.</p>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Save</button>
      </form>
      <div style="margin-top:20px">
        <button type="button" class="btn btn-danger btn-block" id="delete-trip">Delete trip</button>
      </div>
    `
    );

    $('#trip-edit-form').onsubmit = (e) => {
      e.preventDefault();
      const name = $('#edit-trip-name').value.trim();
      const days = Number($('#edit-trip-days').value) || 1;
      PackStore.updateTrip(trip.id, { name });
      PackStore.setTripDays(trip.id, days);
      closeSheet();
      toast('Trip updated');
      render();
    };

    $('#delete-trip').onclick = () => {
      if (!askConfirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
      PackStore.deleteTrip(trip.id);
      closeSheet();
      toast('Trip deleted');
      navigate('trips');
    };
  }

  function showAddOutfitToDay(trip, day) {
    const outfits = PackStore.listOutfits();
    openSheet(
      `Add to ${day.label}`,
      `
      <p class="hint" style="margin:0 0 12px">Pick a saved outfit or create a new one for this day.</p>
      <button type="button" class="btn btn-primary btn-block" id="create-for-day" style="margin-bottom:16px">Create new outfit</button>
      ${
        outfits.length
          ? `<div class="select-list" id="outfit-picker"></div>`
          : `<div class="empty" style="padding-top:8px"><p>No saved outfits yet. Create one to reuse it on future trips.</p></div>`
      }
    `
    );

    $('#create-for-day').onclick = () => {
      closeSheet();
      showOutfitEditor({
        onSaved: (outfit) => {
          PackStore.addOutfitToDay(trip.id, day.id, outfit.id);
          toast(`Added “${outfit.name}”`);
          render();
        },
      });
    };

    const picker = $('#outfit-picker');
    if (!picker) return;

    outfits.forEach((outfit) => {
      const already = day.outfitIds.includes(outfit.id);
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = `select-option${already ? ' selected' : ''}`;
      opt.disabled = already;
      opt.innerHTML = `
        <div class="thumb" data-photo-id="${outfit.photoId || ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
        </div>
        <div>
          <strong>${escapeHtml(outfit.name)}</strong>
          <span>${already ? 'Already on this day' : plural(outfit.items.length, 'item', 'items')}</span>
        </div>
      `;
      if (!already) {
        opt.onclick = () => {
          PackStore.addOutfitToDay(trip.id, day.id, outfit.id);
          closeSheet();
          toast(`Added “${outfit.name}”`);
          render();
        };
      }
      picker.appendChild(opt);
    });
    if (PackStore.getPrefs().showPhotos) fillPhotoSlots(picker);
  }

  // ——— Outfits ———
  async function renderOutfits() {
    const outfits = PackStore.listOutfits();
    setChrome({
      title: 'Outfits',
      eyebrow: 'Library',
      showBack: false,
      action: {
        label: 'New outfit',
        onClick: () => showOutfitEditor({ onSaved: () => { toast('Outfit saved'); render(); } }),
      },
    });

    if (!outfits.length) {
      main.innerHTML = `
        ${closetSegments('outfits')}
        <div class="empty">
          <p class="empty-kicker">Build your wardrobe</p>
          <h2>Save outfits you wear again</h2>
          <p>Pick clothes from categories, and your own jewelry from Accessories. Photos are optional.</p>
          <button type="button" class="btn btn-primary" id="empty-new-outfit">Add first outfit</button>
        </div>
      `;
      bindClosetSegments();
      $('#empty-new-outfit').onclick = () =>
        showOutfitEditor({ onSaved: () => { toast('Outfit saved'); render(); } });
      return;
    }

    main.innerHTML = `
      ${closetSegments('outfits')}
      <div class="section">
        ${hintHtml('outfits', 'Save looks once, then drop them onto any day. Add extras on a day if you don’t want them on the base outfit.')}
        <div class="section-head">
          <h2 class="section-title">Favorites</h2>
          <span class="section-meta">${plural(outfits.length, 'outfit', 'outfits')}</span>
        </div>
        <div class="outfit-grid" id="outfit-grid"></div>
      </div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="new-outfit-btn">New outfit</button>
      </div>
    `;

    bindClosetSegments();

    const grid = $('#outfit-grid');
    outfits.forEach((outfit) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'outfit-tile';
      tile.innerHTML = `
        <div class="media" data-photo-id="${outfit.photoId || ''}">
          <div class="ph">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
          </div>
        </div>
        <div class="body">
          <h3>${escapeHtml(outfit.name)}</h3>
          <p>${plural(outfit.items.length, 'piece', 'pieces')}</p>
        </div>
      `;
      tile.onclick = () => navigate(`outfit/${outfit.id}`);
      grid.appendChild(tile);
    });

    $('#new-outfit-btn').onclick = () =>
      showOutfitEditor({ onSaved: () => { toast('Outfit saved'); render(); } });

    bindHints();
    if (PackStore.getPrefs().showPhotos) await fillPhotoSlots(grid);
  }

  function renderAccessories() {
    const accessories = PackStore.listAccessories();
    setChrome({
      title: 'Accessories',
      eyebrow: 'Your pieces',
      showBack: false,
      action: {
        label: 'Add accessory',
        onClick: () => showAccessoryEditor(),
      },
    });

    const groups = new Map();
    accessories.forEach((a) => {
      const cat = a.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(a);
    });

    main.innerHTML = `
      ${closetSegments('accessories')}
      <div class="section">
        ${hintHtml(
          'accessories',
          'Add your own jewelry here — chunky gold necklace, the pearl earrings — just like staples. Delete anything generic that isn’t yours. Tap a piece to rename it.'
        )}
        <div id="accessories-list"></div>
      </div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="add-accessory-btn">Add my piece</button>
      </div>
    `;

    bindClosetSegments();
    bindHints();

    const list = $('#accessories-list');
    if (!accessories.length) {
      list.innerHTML = `
        <div class="empty" style="padding-top:8px">
          <h2 style="font-size:22px">Your jewelry lives here</h2>
          <p>Add the pieces you actually own. They show up as taps when you build outfits or extras for a day — no generic “gold necklace.”</p>
        </div>
      `;
    } else {
      const order = PackStore.listAccessoryCategories().concat(
        [...groups.keys()].filter((c) => !PackStore.listAccessoryCategories().includes(c))
      );
      order.forEach((cat) => {
        const items = groups.get(cat);
        if (!items?.length) return;
        const section = document.createElement('div');
        section.className = 'section';
        section.style.marginBottom = '20px';
        section.innerHTML = `<div class="section-head"><h2 class="section-title">${escapeHtml(
          cat
        )}</h2></div><div class="stack"></div>`;
        const stack = $('.stack', section);
        items.forEach((a) => {
          const row = document.createElement('div');
          row.className = 'staple-row library-row';
          row.innerHTML = `
            <button type="button" class="library-edit" aria-label="Edit ${escapeHtml(a.name)}">
              <span class="name">${escapeHtml(a.name)}</span>
              <span class="library-edit-hint">Edit</span>
            </button>
            <button type="button" class="del" aria-label="Delete ${escapeHtml(a.name)}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          `;
          row.querySelector('.library-edit').onclick = () => showAccessoryEditor(a);
          row.querySelector('.del').onclick = () => {
            if (!askConfirm(`Remove “${a.name}” from your list?`)) return;
            PackStore.deleteAccessory(a.id);
            toast('Accessory removed');
            render();
          };
          stack.appendChild(row);
        });
        list.appendChild(section);
      });
    }

    $('#add-accessory-btn').onclick = () => showAccessoryEditor();
  }

  function showAccessoryEditor(accessory = null) {
    const isEdit = !!accessory;
    openSheet(
      isEdit ? 'Edit piece' : 'Add your piece',
      `
      <p class="hint" style="margin:0 0 12px">${
        isEdit
          ? 'This name is what you’ll tap when building outfits or adding extras to a day.'
          : 'Your actual jewelry and bags — not a generic “necklace”. Add “chunky gold necklace” once, then tap it anytime.'
      }</p>
      <form id="accessory-form">
        <div class="field">
          <label for="accessory-name">Item</label>
          <input class="input" id="accessory-name" placeholder="Chunky gold necklace" value="${
            accessory ? escapeHtml(accessory.name) : ''
          }" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="accessory-cat">Group</label>
          <select class="input" id="accessory-cat">
            ${optionHtml(PackStore.listAccessoryCategories(), accessory?.category || 'Jewelry')}
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${
          isEdit ? 'Save changes' : 'Save to my list'
        }</button>
      </form>
    `
    );
    $('#accessory-name').focus();
    $('#accessory-name').select();
    $('#accessory-form').onsubmit = (e) => {
      e.preventDefault();
      const name = $('#accessory-name').value.trim();
      const category = $('#accessory-cat').value;
      if (!name) return;
      if (isEdit) {
        const saved = PackStore.updateAccessory(accessory.id, { name, category });
        closeSheet();
        toast(saved ? 'Updated' : 'That name is already on your list');
        render();
        return;
      }
      PackStore.addAccessory({ name, category });
      closeSheet();
      toast('Saved to your list');
      render();
    };
  }

  async function renderOutfitDetail() {
    const outfit = PackStore.getOutfit(route.params.id);
    if (!outfit) {
      navigate('outfits');
      toast('Outfit not found');
      return;
    }

    setChrome({
      title: outfit.name,
      eyebrow: 'Outfit',
      showBack: true,
      action: {
        label: 'Edit',
        onClick: () =>
          showOutfitEditor({
            outfit,
            onSaved: () => {
              toast('Outfit updated');
              render();
            },
          }),
      },
    });
    backBtn.onclick = () => navigate('outfits');

    main.innerHTML = `
      <div class="detail-hero">
        <div class="photo" id="outfit-photo">
          <div class="ph">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <span style="font-size:13px;font-weight:500">No photo yet</span>
          </div>
        </div>
        <div class="meta">
          <h2>${escapeHtml(outfit.name)}</h2>
          <p class="card-sub" style="margin:0">Clothes & accessories for this look</p>
          <div class="item-pills" id="item-pills"></div>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="add-photo-btn">
          ${outfit.photoId ? 'Change photo' : 'Add photo'}
        </button>
        <button type="button" class="btn btn-secondary" id="edit-outfit-btn">Edit</button>
      </div>
      <div style="margin-top:12px">
        <button type="button" class="btn btn-ghost btn-block" id="delete-outfit-btn" style="color:var(--danger)">Delete outfit</button>
      </div>
      <input type="file" id="photo-file" accept="image/*" capture="environment" hidden />
    `;

    const pills = $('#item-pills');
    if (outfit.items.length) {
      outfit.items.forEach((item) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = item;
        pills.appendChild(chip);
      });
    } else {
      pills.innerHTML = `<span class="chip">No items listed yet</span>`;
    }

    if (outfit.photoId) {
      const url = await PackDB.getObjectUrl(outfit.photoId);
      if (url) {
        $('#outfit-photo').innerHTML = `<img src="${url}" alt="${escapeHtml(outfit.name)}" />`;
      }
    }

    const fileInput = $('#photo-file');
    $('#add-photo-btn').onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const blob = await PackDB.compressImage(file);
        const photoId = outfit.photoId || PackStore.uid();
        await PackDB.putPhoto(photoId, blob);
        PackDB.revokeObjectUrl(photoId);
        PackStore.updateOutfit(outfit.id, { photoId });
        toast('Photo added');
        render();
      } catch {
        toast('Could not save photo');
      }
    };

    $('#edit-outfit-btn').onclick = () =>
      showOutfitEditor({
        outfit,
        onSaved: () => {
          toast('Outfit updated');
          render();
        },
      });

    $('#delete-outfit-btn').onclick = async () => {
      if (!askConfirm(`Delete “${outfit.name}”?`)) return;
      if (outfit.photoId) {
        PackDB.revokeObjectUrl(outfit.photoId);
        await PackDB.deletePhoto(outfit.photoId);
      }
      PackStore.deleteOutfit(outfit.id);
      toast('Outfit deleted');
      navigate('outfits');
    };
  }

  /**
   * Outfit editor sheet.
   * Pieces can be typed or picked from the category / accessory bank.
   */
  function showOutfitEditor({ outfit = null, onSaved } = {}) {
    const isEdit = !!outfit;
    let items = outfit ? [...outfit.items] : [];
    let pendingPhotoFile = null;
    let photoId = outfit?.photoId || null;
    let removePhoto = false;
    let draftName = outfit?.name || '';

    function renderItems(itemsEditor) {
      itemsEditor.innerHTML = '';
      items.forEach((item, idx) => {
        const chip = document.createElement('div');
        chip.className = 'item-chip';
        chip.innerHTML = `<span>${escapeHtml(item)}</span><button type="button" aria-label="Remove ${escapeHtml(item)}">×</button>`;
        chip.querySelector('button').onclick = () => {
          items = items.filter((_, i) => i !== idx);
          renderItems(itemsEditor);
        };
        itemsEditor.appendChild(chip);
      });
    }

    const photoPlaceholder = `
      <div class="photo-placeholder-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
      </div>
      <p>Add a photo later if you want</p>
      <span class="hint">Tap to choose from your library</span>
      <input type="file" id="outfit-photo-input" accept="image/*" />
    `;

    function bindPhotoArea(photoArea) {
      function resetPlaceholder() {
        photoArea.classList.remove('has-photo');
        photoArea.innerHTML = photoPlaceholder;
        $('#outfit-photo-input', photoArea).onchange = (e) => {
          if (e.target.files?.[0]) setPendingPhoto(e.target.files[0]);
        };
      }

      function bindPhotoActions() {
        const change = $('#change-photo', photoArea);
        const clear = $('#clear-photo', photoArea);
        if (change) {
          change.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => {
              if (input.files?.[0]) setPendingPhoto(input.files[0]);
            };
            input.click();
          };
        }
        if (clear) {
          clear.onclick = () => {
            removePhoto = true;
            pendingPhotoFile = null;
            resetPlaceholder();
          };
        }
      }

      function setPhotoMarkup(src) {
        photoArea.classList.add('has-photo');
        photoArea.innerHTML = `
          <img src="${src}" alt="" />
          <div class="photo-actions">
            <button type="button" class="btn btn-secondary" id="change-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Change</button>
            <button type="button" class="btn btn-danger" id="clear-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Remove</button>
          </div>
        `;
        bindPhotoActions();
      }

      function setPendingPhoto(file) {
        pendingPhotoFile = file;
        removePhoto = false;
        setPhotoMarkup(URL.createObjectURL(file));
      }

      async function showExistingPhoto() {
        if (!photoId || removePhoto) return;
        const url = await PackDB.getObjectUrl(photoId);
        if (!url) return;
        setPhotoMarkup(url);
      }

      const photoInput = $('#outfit-photo-input', photoArea);
      if (photoInput) {
        photoInput.onchange = () => {
          if (photoInput.files?.[0]) setPendingPhoto(photoInput.files[0]);
        };
      }

      if (pendingPhotoFile) setPendingPhoto(pendingPhotoFile);
      else if (photoId && !removePhoto) showExistingPhoto();

      return { setPendingPhoto };
    }

    function renderForm() {
      sheetTitle.textContent = isEdit ? 'Edit outfit' : 'New outfit';
      sheetBody.innerHTML = `
        <form id="outfit-form">
          <div class="field">
            <label for="outfit-name">Name</label>
            <input class="input" id="outfit-name" value="${escapeHtml(draftName)}" placeholder="Dinner — black dress + gold hoops" required autocomplete="off" />
          </div>

          <div class="field">
            <label>Photo <span style="font-weight:400;color:var(--ink-faint)">(optional)</span></label>
            <div class="photo-area" id="photo-area" tabindex="0" role="button" aria-label="Add photo">
              ${photoPlaceholder}
            </div>
          </div>

          <div class="field">
            <label for="item-input">Pieces & accessories</label>
            <div class="input-row">
              <input class="input" id="item-input" placeholder="e.g. Gold hoop earrings" autocomplete="off" />
              <button type="button" class="btn btn-secondary" id="add-item-btn" style="min-width:72px">Add</button>
            </div>
            <button type="button" class="browse-cats-btn" id="browse-cats">Browse clothes & my jewelry</button>
            <p class="hint">Base pieces live on the outfit. Add extras later on a specific day if you don’t want them every time.</p>
            <div class="items-editor" id="items-editor"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save changes' : 'Save outfit'}</button>
        </form>
      `;

      const photoArea = $('#photo-area');
      const itemsEditor = $('#items-editor');
      const itemInput = $('#item-input');
      bindPhotoArea(photoArea);
      renderItems(itemsEditor);

      function addItem() {
        const val = itemInput.value.trim();
        if (!val) return;
        if (!items.some((i) => i.toLowerCase() === val.toLowerCase())) items.push(val);
        itemInput.value = '';
        renderItems(itemsEditor);
        itemInput.focus();
      }

      $('#add-item-btn').onclick = addItem;
      itemInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addItem();
        }
      });

      $('#browse-cats').onclick = () => {
        draftName = $('#outfit-name').value;
        showPicker();
      };

      $('#outfit-name').focus();

      $('#outfit-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = $('#outfit-name').value.trim();
        if (!name) return;

        let nextPhotoId = photoId;

        try {
          if (removePhoto && photoId) {
            PackDB.revokeObjectUrl(photoId);
            await PackDB.deletePhoto(photoId);
            nextPhotoId = null;
          }

          if (pendingPhotoFile) {
            const blob = await PackDB.compressImage(pendingPhotoFile);
            nextPhotoId = nextPhotoId || PackStore.uid();
            await PackDB.putPhoto(nextPhotoId, blob);
            PackDB.revokeObjectUrl(nextPhotoId);
          }

          let saved;
          if (isEdit) {
            saved = PackStore.updateOutfit(outfit.id, {
              name,
              items,
              photoId: nextPhotoId,
            });
          } else {
            saved = PackStore.createOutfit({ name, items, photoId: nextPhotoId });
          }

          closeSheet();
          if (onSaved) onSaved(saved);
        } catch {
          toast('Could not save outfit');
        }
      };
    }

    function showPicker() {
      sheetTitle.textContent = 'Add a piece';
      mountCategoryPicker(sheetBody, {
        showBack: true,
        onBack: renderForm,
        onPick: (name) => {
          if (!items.some((i) => i.toLowerCase() === name.toLowerCase())) items.push(name);
          toast(`Added ${name}`);
        },
      });
    }

    openSheet(isEdit ? 'Edit outfit' : 'New outfit', '');
    renderForm();
  }

  // ——— Staples ———
  function renderStaples() {
    const staples = PackStore.listStaples();
    setChrome({
      title: 'Staples',
      eyebrow: 'Every trip',
      showBack: false,
      action: {
        label: 'Add staple',
        onClick: () => showAddStaple(),
      },
    });

    const groups = new Map();
    staples.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(s);
    });

    main.innerHTML = `
      <div class="section">
        ${hintHtml('staples', 'These start on every new trip. Skip one for a single trip from that trip’s plan — deleting here changes the default list.')}
        <div id="staples-list"></div>
      </div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="add-staple-btn">Add staple</button>
      </div>
    `;

    bindHints();

    const list = $('#staples-list');
    if (!staples.length) {
      list.innerHTML = `
        <div class="empty" style="padding-top:8px">
          <h2 style="font-size:22px">No staples yet</h2>
          <p>Add toiletries, chargers, and other always-bring items.</p>
        </div>
      `;
    } else {
      groups.forEach((items, cat) => {
        const section = document.createElement('div');
        section.className = 'section';
        section.style.marginBottom = '20px';
        section.innerHTML = `<div class="section-head"><h2 class="section-title">${escapeHtml(cat)}</h2></div><div class="stack" data-cat="${escapeHtml(cat)}"></div>`;
        const stack = $('.stack', section);
        items.forEach((s) => {
          const row = document.createElement('div');
          row.className = 'staple-row';
          row.innerHTML = `
            <span class="name">${escapeHtml(s.name)}</span>
            <button type="button" class="del" aria-label="Delete ${escapeHtml(s.name)}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
          `;
          row.querySelector('.del').onclick = () => {
            PackStore.deleteStaple(s.id);
            toast('Staple removed');
            render();
          };
          stack.appendChild(row);
        });
        list.appendChild(section);
      });
    }

    $('#add-staple-btn').onclick = () => showAddStaple();
  }

  function showAddStaple() {
    openSheet(
      'Add staple',
      `
      <form id="staple-form">
        <div class="field">
          <label for="staple-name">Item</label>
          <input class="input" id="staple-name" placeholder="Lip balm" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="staple-cat">Category</label>
          <select class="input" id="staple-cat">
            ${optionHtml(PackStore.listStapleCategories(), 'Other')}
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add to staples</button>
      </form>
    `
    );
    $('#staple-name').focus();
    $('#staple-form').onsubmit = (e) => {
      e.preventDefault();
      const name = $('#staple-name').value.trim();
      const category = $('#staple-cat').value;
      if (!name) return;
      PackStore.addStaple({ name, category });
      closeSheet();
      toast('Staple added');
      render();
    };
  }

  // ——— Settings ———
  function renderSettings() {
    const prefs = PackStore.getPrefs();
    setChrome({
      title: 'Settings',
      eyebrow: 'Packlist',
      showBack: false,
    });

    const hiddenHintCount = Object.values(prefs.hiddenHints || {}).filter(Boolean).length;

    main.innerHTML = `
      <div class="settings-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
        <input class="input settings-search" id="settings-search" type="search" placeholder="Search settings" autocomplete="off" />
      </div>
      <div id="settings-body"></div>
    `;

    const body = $('#settings-body');

    function groups() {
      return [
        {
          id: 'appearance',
          title: 'Appearance',
          keywords: 'theme color dark light midnight harbor ink orchard ember linen font text size compact motion animation',
          html: () => `
            <div class="theme-grid">
              ${THEMES.map(
                (t) => `
                <button type="button" class="theme-card${prefs.theme === t.id ? ' selected' : ''}" data-theme="${t.id}">
                  <div class="theme-swatch" style="background:${t.wash}">
                    <span class="theme-dot" style="background:${t.accent}"></span>
                  </div>
                  <div class="meta"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.note)}</span></div>
                </button>`
              ).join('')}
            </div>
            <div class="settings-list">
            ${settingSelect('textSize', 'Text size', 'Larger type across the app.', [
              ['default', 'Default'],
              ['large', 'Large'],
              ['xlarge', 'Extra large'],
            ], prefs.textSize)}
            ${settingToggle('compactLists', 'Compact lists', 'Tighter packing and staple rows.', prefs.compactLists)}
            ${settingToggle('reduceMotion', 'Reduce motion', 'Cut animations and springy taps.', prefs.reduceMotion)}
            </div>
          `,
        },
        {
          id: 'planning',
          title: 'Planning & packing',
          keywords: 'trip days gender women men empty packed photos confirm delete start tab default length clothing hide outfit names',
          html: () => `<div class="settings-list">
            ${settingStepper('defaultTripDays', 'Default trip length', 'Used when you create a new trip.', prefs.defaultTripDays, 1, 30)}
            ${settingSelect('clothingGender', 'Clothing categories', 'Default for the category picker.', [
              ['women', 'Women'],
              ['men', 'Men'],
            ], prefs.clothingGender)}
            ${settingSelect('startingTab', 'Open app to', 'First screen after launch.', [
              ['trips', 'Trips'],
              ['outfits', 'Outfits'],
              ['staples', 'Staples'],
              ['settings', 'Settings'],
            ], prefs.startingTab)}
            ${settingToggle('hideEmptyDays', 'Hide empty days', 'Skip days with no outfits or extras on the packing list.', prefs.hideEmptyDays)}
            ${settingToggle('showOutfitHeadings', 'Show outfit names', 'Label pieces under each look on the packing list.', prefs.showOutfitHeadings)}
            ${settingToggle('hidePackedItems', 'Hide packed items', 'Once checked, an item drops off the list.', prefs.hidePackedItems)}
            ${settingToggle('showPhotos', 'Show outfit photos', 'Thumbnails in lists and pickers.', prefs.showPhotos)}
            ${settingToggle('confirmDeletes', 'Confirm deletions', 'Ask before deleting trips, outfits, or resetting checks.', prefs.confirmDeletes)}
          </div>`,
        },
        {
          id: 'library',
          title: 'Library',
          keywords: 'staple accessory category restore gloves bank jewelry necklace earrings bracelet chunky gold customize pieces',
          html: () => `<div class="settings-list">
            ${settingNav('your-accessories', 'Your jewelry & accessories', 'Add your own pieces — chunky gold necklace, pearl earrings, bags.')}
            ${settingNav('staple-cats', 'Staple categories', prefs.stapleCategories.join(', '))}
            ${settingNav('accessory-cats', 'Accessory groups', 'Folders like Jewelry and Bags — not individual pieces.')}
            ${settingAction('restore-staples', 'Restore missing staples', 'Adds default items you deleted, like Gloves.')}
            ${settingAction('restore-accessories', 'Restore starter accessories', 'Puts back the generic sample items if you deleted them.')}
          </div>`,
        },
        {
          id: 'hints',
          title: 'Hints',
          keywords: 'hint tip hide tap dismiss reset',
          html: () => `<div class="settings-list">
            ${settingAction('reset-hints', 'Show hidden hints again', hiddenHintCount ? `${hiddenHintCount} currently hidden` : 'Nothing is hidden')}
          </div>`,
        },
        {
          id: 'data',
          title: 'Data',
          keywords: 'export import backup reset erase packed clear',
          html: () => `<div class="settings-list">
            ${settingAction('export', 'Export backup', 'Download outfits, staples, trips, and settings as JSON.')}
            ${settingAction('import', 'Import backup', 'Replace current lists with a backup file. Photos stay on this device.')}
            ${settingAction('clear-packed', 'Clear all packing checks', 'Uncheck every trip without deleting plans.')}
            ${settingAction('erase', 'Erase all app data', 'Deletes trips, outfits, staples, and settings on this device.')}
          </div>`,
        },
        {
          id: 'about',
          title: 'About',
          keywords: 'version storage privacy local',
          html: () => `<div class="settings-list">
            <div class="settings-row">
              <div class="settings-row-copy">
                <strong>Packlist</strong>
                <span>Version 3 · Everything stays on this device. Clearing Safari site data erases it.</span>
              </div>
            </div>
          </div>`,
        },
      ];
    }

    function settingToggle(key, title, note, on) {
      return `
        <button type="button" class="settings-row" data-toggle="${key}">
          <div class="settings-row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>
          <span class="toggle${on ? ' on' : ''}" aria-hidden="true"></span>
        </button>
      `;
    }

    function settingSelect(key, title, note, options, value) {
      return `
        <label class="settings-row">
          <div class="settings-row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>
          <select class="settings-select" data-select="${key}">
            ${options.map(([v, label]) => `<option value="${v}"${v === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </label>
      `;
    }

    function settingStepper(key, title, note, value, min, max) {
      return `
        <div class="settings-row">
          <div class="settings-row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>
          <div class="settings-stepper">
            <button type="button" data-step="${key}" data-dir="-1" aria-label="Decrease">−</button>
            <output>${value}</output>
            <button type="button" data-step="${key}" data-dir="1" aria-label="Increase">+</button>
          </div>
        </div>
      `;
    }

    function settingNav(id, title, note) {
      return `
        <button type="button" class="settings-row nav" data-nav="${id}">
          <div class="settings-row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>
          ${CHEV_SVG}
        </button>
      `;
    }

    function settingAction(id, title, note) {
      return `
        <button type="button" class="settings-row action" data-action="${id}">
          <div class="settings-row-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(note)}</span></div>
        </button>
      `;
    }

    function paint(query = '') {
      const q = query.trim().toLowerCase();
      const matched = groups().filter((g) => {
        if (!q) return true;
        return `${g.title} ${g.keywords}`.toLowerCase().includes(q);
      });
      if (!matched.length) {
        body.innerHTML = `<div class="empty" style="padding-top:12px"><h2 style="font-size:22px">No matching settings</h2><p>Try “theme”, “hints”, or “export”.</p></div>`;
        return;
      }
      body.innerHTML = matched
        .map(
          (g) => `
        <section class="settings-group" data-group="${g.id}">
          <h2 class="settings-group-title">${escapeHtml(g.title)}</h2>
          ${g.html()}
        </section>`
        )
        .join('');
      bindSettings(body);
    }

    function bindSettings(root) {
      $$('[data-theme]', root).forEach((btn) => {
        btn.onclick = () => {
          PackStore.setPref('theme', btn.dataset.theme);
          applyAppearance();
          renderSettingsPreserveSearch();
        };
      });
      $$('[data-toggle]', root).forEach((btn) => {
        btn.onclick = () => {
          const key = btn.dataset.toggle;
          const next = !PackStore.getPrefs()[key];
          PackStore.setPref(key, next);
          applyAppearance();
          renderSettingsPreserveSearch();
        };
      });
      $$('[data-select]', root).forEach((sel) => {
        sel.onchange = () => {
          PackStore.setPref(sel.dataset.select, sel.value);
          applyAppearance();
          renderSettingsPreserveSearch();
        };
      });
      $$('[data-step]', root).forEach((btn) => {
        btn.onclick = () => {
          const key = btn.dataset.step;
          const dir = Number(btn.dataset.dir);
          const cur = Number(PackStore.getPrefs()[key]) || 1;
          PackStore.setPref(key, Math.max(1, Math.min(30, cur + dir)));
          renderSettingsPreserveSearch();
        };
      });
      $$('[data-nav]', root).forEach((btn) => {
        btn.onclick = () => {
          if (btn.dataset.nav === 'your-accessories') {
            navigate('accessories');
            return;
          }
          showCategoryManager(btn.dataset.nav);
        };
      });
      $$('[data-action]', root).forEach((btn) => {
        btn.onclick = () => runSettingAction(btn.dataset.action);
      });
    }

    function renderSettingsPreserveSearch() {
      const q = $('#settings-search')?.value || '';
      renderSettings();
      const input = $('#settings-search');
      if (input) {
        input.value = q;
        input.dispatchEvent(new Event('input'));
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }

    const search = $('#settings-search');
    search.oninput = () => paint(search.value);
    paint();
  }

  function showCategoryManager(kind) {
    const isStaples = kind === 'staple-cats';
    const prefKey = isStaples ? 'stapleCategories' : 'accessoryCategories';
    const title = isStaples ? 'Staple categories' : 'Accessory groups';

    function paintSheet() {
      const cats = PackStore.getPrefs()[prefKey];
      sheetTitle.textContent = title;
      sheetBody.innerHTML = `
        <p class="hint" style="margin:0 0 12px">${
          isStaples
            ? 'These show up when you add staples. Existing items keep their current category if you remove one here.'
            : 'These are folders (Jewelry, Bags) — not individual pieces. Add “chunky gold necklace” under Your jewelry & accessories, not here.'
        }</p>
        <div class="stack" id="cat-manage-list"></div>
        <form id="cat-manage-form" style="margin-top:16px">
          <div class="input-row">
            <input class="input" id="cat-manage-input" placeholder="New category" autocomplete="off" />
            <button type="submit" class="btn btn-secondary" style="min-width:72px">Add</button>
          </div>
        </form>
      `;
      const list = $('#cat-manage-list');
      cats.forEach((cat) => {
        const row = document.createElement('div');
        row.className = 'staple-row';
        row.innerHTML = `
          <span class="name">${escapeHtml(cat)}</span>
          <button type="button" class="del" aria-label="Remove ${escapeHtml(cat)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        `;
        row.querySelector('.del').onclick = () => {
          if (cats.length <= 1) {
            toast('Keep at least one category');
            return;
          }
          PackStore.setPref(
            prefKey,
            cats.filter((c) => c !== cat)
          );
          paintSheet();
        };
        list.appendChild(row);
      });
      $('#cat-manage-form').onsubmit = (e) => {
        e.preventDefault();
        const name = $('#cat-manage-input').value.trim();
        if (!name) return;
        if (cats.some((c) => c.toLowerCase() === name.toLowerCase())) {
          toast('Already in the list');
          return;
        }
        PackStore.setPref(prefKey, [...cats, name]);
        paintSheet();
      };
    }

    openSheet(title, '');
    paintSheet();
  }

  function runSettingAction(id) {
    if (id === 'reset-hints') {
      PackStore.resetHints();
      toast('Hints restored');
      render();
      return;
    }
    if (id === 'restore-staples') {
      const n = PackStore.restoreMissingDefaults('staples');
      toast(n ? `Added ${n} staple${n === 1 ? '' : 's'}` : 'Nothing missing');
      return;
    }
    if (id === 'restore-accessories') {
      const n = PackStore.restoreMissingDefaults('accessories');
      toast(n ? `Added ${n} accessor${n === 1 ? 'y' : 'ies'}` : 'Nothing missing');
      return;
    }
    if (id === 'export') {
      const blob = new Blob([PackStore.exportBackup()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
      return;
    }
    if (id === 'import') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          PackStore.importBackup(text);
          applyAppearance();
          toast('Backup imported');
          render();
        } catch {
          toast('Could not read that file');
        }
      };
      input.click();
      return;
    }
    if (id === 'clear-packed') {
      if (!askConfirm('Clear packing checks on every trip?')) return;
      PackStore.clearAllPacked();
      toast('All checks cleared');
      return;
    }
    if (id === 'erase') {
      if (!askConfirm('Erase everything on this device? This cannot be undone.')) return;
      if (!confirm('Really erase outfits, trips, staples, and settings?')) return;
      PackStore.resetAllData();
      applyAppearance();
      toast('App data erased');
      navigate('trips');
    }
  }

  // ——— Main render ———
  async function render() {
    route = parseHash();
    syncTabs();
    closeSheet();

    switch (route.name) {
      case 'trip':
        await renderTrip();
        break;
      case 'outfit':
        await renderOutfitDetail();
        break;
      case 'outfits':
        await renderOutfits();
        break;
      case 'accessories':
        renderAccessories();
        break;
      case 'staples':
        renderStaples();
        break;
      case 'settings':
        renderSettings();
        break;
      default:
        renderTrips();
    }

    window.scrollTo(0, 0);
  }

  // ——— Events ———
  window.addEventListener('hashchange', () => render());

  tabbar.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    navigate(tab.dataset.route);
  });

  window.addEventListener(
    'scroll',
    () => {
      topbar.classList.toggle('scrolled', window.scrollY > 4);
    },
    { passive: true }
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.classList.contains('hidden')) {
      closeSheet();
    }
  });

  applyAppearance();
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    const start = PackStore.getPrefs().startingTab;
    if (start && start !== 'trips') {
      location.replace(`#/${start}`);
    }
  }
  render();
})();
