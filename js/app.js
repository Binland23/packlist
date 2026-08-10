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
    if (parts[0] === 'staples') return { name: 'staples', params: {} };
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
    backBtn.classList.toggle('hidden', !showBack);
    if (action) {
      headerAction.hidden = false;
      headerAction.setAttribute('aria-label', action.label || 'Add');
      headerAction.onclick = action.onClick;
    } else {
      headerAction.hidden = true;
      headerAction.onclick = null;
    }
  }

  function syncTabs() {
    const tabRoute = route.name === 'trip' || route.name === 'trips'
      ? 'trips'
      : route.name === 'outfit'
        ? 'outfits'
        : route.name;
    $$('.tab', tabbar).forEach((tab) => {
      const active = tab.dataset.route === tabRoute;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
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
  async function photoImgHtml(photoId, className = '') {
    if (!photoId) return null;
    try {
      const url = await PackDB.getObjectUrl(photoId);
      if (!url) return null;
      return `<img class="${className}" src="${url}" alt="" loading="lazy" />`;
    } catch {
      return null;
    }
  }

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
          <p>Save outfits once, then pick them for each day. Staples come along automatically.</p>
          <button type="button" class="btn btn-primary" id="empty-new-trip">Plan a trip</button>
        </div>
      `;
      $('#empty-new-trip').onclick = () => showNewTripSheet();
      return;
    }

    main.innerHTML = `
      <div class="section">
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
      const pct = pack.total ? Math.round((pack.packedCount / pack.total) * 100) : 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card pressable';
      btn.innerHTML = `
        <div class="card-body">
          <p class="card-title">${escapeHtml(trip.name)}</p>
          <p class="card-sub">${plural(trip.days.length, 'day', 'days')} · ${plural(outfitCount, 'outfit', 'outfits')} · ${pack.packedCount}/${pack.total} packed</p>
          <div class="progress-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        </div>
      `;
      btn.onclick = () => navigate(`trip/${trip.id}`);
      list.appendChild(btn);
    });

    $('#new-trip-btn').onclick = () => showNewTripSheet();
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
          <input class="input" id="trip-days" name="days" type="number" min="1" max="30" value="3" required />
          <p class="hint">You can add more than one outfit per day.</p>
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
      const block = document.createElement('div');
      block.className = 'day-block';
      block.innerHTML = `
        <div class="day-header">
          <h3>${escapeHtml(day.label)}</h3>
          <span class="section-meta">${plural(day.outfitIds.length, 'outfit', 'outfits')}</span>
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

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-outfit-btn';
      addBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        Add outfit
      `;
      addBtn.onclick = () => showAddOutfitToDay(trip, day);
      container.appendChild(addBtn);
      daysEl.appendChild(block);
    }

    await fillPhotoSlots(daysEl);
  }

  function renderPackView(trip) {
    const pack = PackStore.buildPackingList(trip.id);
    const pct = pack.total ? Math.round((pack.packedCount / pack.total) * 100) : 0;

    main.innerHTML = `
      <div class="segments" role="tablist">
        <button type="button" class="segment" data-view="plan">Plan days</button>
        <button type="button" class="segment active" data-view="pack">Pack</button>
      </div>
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
              <h2>Add outfits to your days</h2>
              <p>Pick outfits from your library (or create new ones). Staples appear here automatically.</p>
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

    const unpack = $('#unpack-all');
    if (unpack) {
      unpack.onclick = () => {
        if (!confirm('Clear all packed checkmarks for this trip?')) return;
        PackStore.updateTrip(trip.id, { packed: {} });
        toast('Checks cleared');
        render();
      };
    }

    const list = $('#pack-list');
    if (!list) return;

    pack.groups.forEach((group) => {
      const label = document.createElement('div');
      label.className = 'check-group-label';
      const done = group.items.filter((i) => i.packed).length;
      label.innerHTML = `${escapeHtml(group.label)} <span class="check-count" style="float:right">${done}/${group.items.length}</span>`;
      list.appendChild(label);

      group.items.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `check-item${item.packed ? ' done' : ''}`;
        btn.setAttribute('aria-pressed', item.packed ? 'true' : 'false');
        btn.innerHTML = `
          <span class="checkbox" aria-hidden="true">
            ${item.packed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>' : ''}
          </span>
          <span class="check-label">
            ${escapeHtml(item.name)}
            ${item.note ? `<span style="display:block;font-size:12px;font-weight:500;color:var(--ink-faint);margin-top:2px;text-decoration:none">${escapeHtml(item.note)}</span>` : ''}
          </span>
        `;
        btn.onclick = () => {
          PackStore.setPacked(trip.id, item.key, !item.packed);
          render();
        };
        list.appendChild(btn);
      });
    });
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
          <p class="hint">Reducing days removes outfits from the last days.</p>
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
      if (!confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
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
    fillPhotoSlots(picker);
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
        <div class="empty">
          <p class="empty-kicker">Build your wardrobe</p>
          <h2>Save outfits you wear again</h2>
          <p>Include clothes and accessories together. Photos are optional — add them later from your phone.</p>
          <button type="button" class="btn btn-primary" id="empty-new-outfit">Add first outfit</button>
        </div>
      `;
      $('#empty-new-outfit').onclick = () =>
        showOutfitEditor({ onSaved: () => { toast('Outfit saved'); render(); } });
      return;
    }

    main.innerHTML = `
      <div class="section">
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

    await fillPhotoSlots(grid);
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
      if (!confirm(`Delete “${outfit.name}”?`)) return;
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
   * Accessories are listed as items on the outfit (not a separate list).
   */
  function showOutfitEditor({ outfit = null, onSaved } = {}) {
    const isEdit = !!outfit;
    let items = outfit ? [...outfit.items] : [];
    let pendingPhotoFile = null;
    let photoId = outfit?.photoId || null;
    let removePhoto = false;

    openSheet(
      isEdit ? 'Edit outfit' : 'New outfit',
      `
      <form id="outfit-form">
        <div class="field">
          <label for="outfit-name">Name</label>
          <input class="input" id="outfit-name" value="${escapeHtml(outfit?.name || '')}" placeholder="Dinner — black dress + gold hoops" required autocomplete="off" />
        </div>

        <div class="field">
          <label>Photo <span style="font-weight:400;color:var(--ink-faint)">(optional)</span></label>
          <div class="photo-area" id="photo-area" tabindex="0" role="button" aria-label="Add photo">
            <div class="photo-placeholder-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <p>Add a photo later if you want</p>
            <span class="hint">Tap to choose from your library</span>
            <input type="file" id="outfit-photo-input" accept="image/*" />
          </div>
        </div>

        <div class="field">
          <label for="item-input">Pieces & accessories</label>
          <div class="input-row">
            <input class="input" id="item-input" placeholder="e.g. Gold hoop earrings" autocomplete="off" />
            <button type="button" class="btn btn-secondary" id="add-item-btn" style="min-width:72px">Add</button>
          </div>
          <p class="hint">Clothes, shoes, bags, jewelry — everything for this look.</p>
          <div class="items-editor" id="items-editor"></div>
        </div>

        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save changes' : 'Save outfit'}</button>
      </form>
    `
    );

    const photoArea = $('#photo-area');
    const photoInput = $('#outfit-photo-input');
    const itemsEditor = $('#items-editor');
    const itemInput = $('#item-input');

    function renderItems() {
      itemsEditor.innerHTML = '';
      items.forEach((item, idx) => {
        const chip = document.createElement('div');
        chip.className = 'item-chip';
        chip.innerHTML = `<span>${escapeHtml(item)}</span><button type="button" aria-label="Remove ${escapeHtml(item)}">×</button>`;
        chip.querySelector('button').onclick = () => {
          items = items.filter((_, i) => i !== idx);
          renderItems();
        };
        itemsEditor.appendChild(chip);
      });
    }

    async function showExistingPhoto() {
      if (!photoId || removePhoto) return;
      const url = await PackDB.getObjectUrl(photoId);
      if (!url) return;
      photoArea.classList.add('has-photo');
      photoArea.innerHTML = `
        <img src="${url}" alt="" />
        <div class="photo-actions">
          <button type="button" class="btn btn-secondary" id="change-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Change</button>
          <button type="button" class="btn btn-danger" id="clear-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Remove</button>
        </div>
      `;
      $('#change-photo').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          if (input.files?.[0]) setPendingPhoto(input.files[0]);
        };
        input.click();
      };
      $('#clear-photo').onclick = () => {
        removePhoto = true;
        pendingPhotoFile = null;
        photoArea.classList.remove('has-photo');
        photoArea.innerHTML = `
          <div class="photo-placeholder-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <p>Add a photo later if you want</p>
          <span class="hint">Tap to choose from your library</span>
          <input type="file" id="outfit-photo-input" accept="image/*" />
        `;
        $('#outfit-photo-input').onchange = (e) => {
          if (e.target.files?.[0]) setPendingPhoto(e.target.files[0]);
        };
      };
    }

    function setPendingPhoto(file) {
      pendingPhotoFile = file;
      removePhoto = false;
      const url = URL.createObjectURL(file);
      photoArea.classList.add('has-photo');
      photoArea.innerHTML = `
        <img src="${url}" alt="" />
        <div class="photo-actions">
          <button type="button" class="btn btn-secondary" id="change-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Change</button>
          <button type="button" class="btn btn-danger" id="clear-photo" style="min-height:40px;padding:8px 12px;font-size:13px">Remove</button>
        </div>
      `;
      $('#change-photo').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          if (input.files?.[0]) setPendingPhoto(input.files[0]);
        };
        input.click();
      };
      $('#clear-photo').onclick = () => {
        pendingPhotoFile = null;
        removePhoto = true;
        photoArea.classList.remove('has-photo');
        photoArea.innerHTML = `
          <div class="photo-placeholder-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <p>Add a photo later if you want</p>
          <span class="hint">Tap to choose from your library</span>
          <input type="file" id="outfit-photo-input" accept="image/*" />
        `;
        $('#outfit-photo-input').onchange = (e) => {
          if (e.target.files?.[0]) setPendingPhoto(e.target.files[0]);
        };
      };
    }

    photoInput.onchange = () => {
      if (photoInput.files?.[0]) setPendingPhoto(photoInput.files[0]);
    };

    function addItem() {
      const val = itemInput.value.trim();
      if (!val) return;
      items.push(val);
      itemInput.value = '';
      renderItems();
      itemInput.focus();
    }

    $('#add-item-btn').onclick = addItem;
    itemInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    });

    renderItems();
    if (photoId) showExistingPhoto();
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

    // Group by category
    const groups = new Map();
    staples.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(s);
    });

    main.innerHTML = `
      <div class="section">
        <p class="card-sub" style="margin:0 0 16px">These items are added to every packing list automatically. Edit once — pack forever.</p>
        <div id="staples-list"></div>
      </div>
      <div class="sticky-cta">
        <button type="button" class="btn btn-primary btn-block" id="add-staple-btn">Add staple</button>
      </div>
    `;

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
            <option>Toiletries</option>
            <option>Basics</option>
            <option>Tech</option>
            <option>Documents</option>
            <option>Other</option>
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
      case 'staples':
        renderStaples();
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

  main.addEventListener('scroll', () => {}, { passive: true });
  window.addEventListener(
    'scroll',
    () => {
      topbar.classList.toggle('scrolled', window.scrollY > 4);
    },
    { passive: true }
  );

  // Keyboard: Escape closes sheet
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.classList.contains('hidden')) {
      closeSheet();
    }
  });

  // Boot
  render();
})();
