/**
 * App data in localStorage. Photos live in IndexedDB (see db.js).
 */
const PackStore = (() => {
  const KEY = 'packlist-data-v1';

  const DEFAULT_STAPLES = [
    { name: 'Toothbrush', category: 'Toiletries' },
    { name: 'Toothpaste', category: 'Toiletries' },
    { name: 'Deodorant', category: 'Toiletries' },
    { name: 'Shampoo / body wash', category: 'Toiletries' },
    { name: 'Face wash / moisturizer', category: 'Toiletries' },
    { name: 'Sunscreen', category: 'Toiletries' },
    { name: 'Medications', category: 'Toiletries' },
    { name: 'Underwear (per day + 1)', category: 'Basics' },
    { name: 'Socks (per day + 1)', category: 'Basics' },
    { name: 'Sleepwear', category: 'Basics' },
    { name: 'Gloves', category: 'Basics' },
    { name: 'Phone charger', category: 'Tech' },
    { name: 'Headphones', category: 'Tech' },
    { name: 'Passport / ID', category: 'Documents' },
    { name: 'Wallet', category: 'Documents' },
  ];

  const DEFAULT_ACCESSORIES = [
    { name: 'Gold hoop earrings', category: 'Jewelry' },
    { name: 'Stud earrings', category: 'Jewelry' },
    { name: 'Everyday necklace', category: 'Jewelry' },
    { name: 'Watch', category: 'Jewelry' },
    { name: 'Belt', category: 'Belts' },
    { name: 'Sunglasses', category: 'Other' },
    { name: 'Crossbody bag', category: 'Bags' },
    { name: 'Tote bag', category: 'Bags' },
    { name: 'Hair ties', category: 'Other' },
    { name: 'Scarf', category: 'Scarves' },
    { name: 'Sun hat', category: 'Hats' },
    { name: 'Sneakers', category: 'Shoes' },
    { name: 'Sandals', category: 'Shoes' },
    { name: 'Heels', category: 'Shoes' },
    { name: 'Flats', category: 'Shoes' },
    { name: 'Boots', category: 'Shoes' },
    { name: 'Ankle boots', category: 'Shoes' },
    { name: 'Loafers', category: 'Shoes' },
    { name: 'Slides', category: 'Shoes' },
    { name: 'Walking shoes', category: 'Shoes' },
    { name: 'Dress shoes', category: 'Shoes' },
  ];

  const STAPLE_CAT_ORDER = ['Toiletries', 'Basics', 'Tech', 'Documents', 'Other'];
  const ACCESSORY_CAT_ORDER = ['Jewelry', 'Bags', 'Shoes', 'Hats', 'Scarves', 'Belts', 'Other'];
  const DAY_EVENT_PRESETS = [
    'Coffee run',
    'Brunch',
    'Lunch',
    'Dinner',
    'Beach',
    'Flight',
    'Sightseeing',
    'Workout',
    'Shopping',
    'Miscellaneous',
    'Alternate',
  ];
  const LEGACY_CLOTHING_SHOES = {
    women: [
      'Sneakers',
      'Sandals',
      'Heels',
      'Flats',
      'Boots',
      'Loafers',
      'Slides',
      'Ankle boots',
      'Walking shoes',
    ],
    men: ['Sneakers', 'Dress shoes', 'Boots', 'Sandals', 'Loafers', 'Walking shoes'],
  };
  const THEME_IDS = ['linen', 'midnight', 'harbor', 'ink', 'orchard', 'ember'];

  const DEFAULT_PREFS = {
    clothingGender: 'women',
    theme: 'linen',
    textSize: 'default',
    compactLists: true,
    reduceMotion: false,
    defaultTripDays: 3,
    hideEmptyDays: true,
    showOutfitHeadings: true,
    hidePackedItems: false,
    confirmDeletes: true,
    showPhotos: true,
    startingTab: 'trips',
    hiddenHints: {},
    stapleCategories: STAPLE_CAT_ORDER.slice(),
    accessoryCategories: ACCESSORY_CAT_ORDER.slice(),
    clothingCatalog: { women: {}, men: {} },
    extraClothingTabs: [],
    hiddenClothingTabs: [],
    clothingTabOrder: [],
    accessoryCatalog: {},
    splitView: { enabled: false, left: 'Tops', right: 'Bottoms' },
    catAddFormHidden: null,
    migratedShoesToAccessories: false,
    migratedHatsScarvesBelts: false,
  };

  function resolveCompactLists(p) {
    if (p.dayItemSpacing === 'spaced') return false;
    if (p.dayItemSpacing === 'close') return true;
    if (typeof p.compactLists === 'boolean') return p.compactLists;
    return true;
  }

  function mergePrefs(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const hiddenHints = p.hiddenHints && typeof p.hiddenHints === 'object' ? { ...p.hiddenHints } : {};
    const stapleCategories = Array.isArray(p.stapleCategories) && p.stapleCategories.length
      ? p.stapleCategories.map((c) => String(c).trim()).filter(Boolean)
      : STAPLE_CAT_ORDER.slice();
    const accessoryCategories = Array.isArray(p.accessoryCategories) && p.accessoryCategories.length
      ? p.accessoryCategories.map((c) => String(c).trim()).filter(Boolean)
      : ACCESSORY_CAT_ORDER.slice();
    const clothingCatalog = normalizeClothingCatalog(p.clothingCatalog);
    const extraClothingTabs = uniqueItemNames(p.extraClothingTabs);
    const hiddenClothingTabs = uniqueItemNames(p.hiddenClothingTabs);
    const clothingTabOrder = uniqueItemNames(p.clothingTabOrder);
    const accessoryCatalog = normalizeAccessoryCatalog(p.accessoryCatalog);
    const splitView = normalizeSplitView(p.splitView);
    const days = Math.max(1, Math.min(30, Number(p.defaultTripDays) || 3));
    return {
      ...DEFAULT_PREFS,
      ...p,
      clothingGender: p.clothingGender === 'men' ? 'men' : 'women',
      theme: THEME_IDS.includes(p.theme) ? p.theme : 'linen',
      textSize: ['default', 'large', 'xlarge'].includes(p.textSize) ? p.textSize : 'default',
      compactLists: resolveCompactLists(p),
      reduceMotion: !!p.reduceMotion,
      defaultTripDays: days,
      hideEmptyDays: p.hideEmptyDays !== false,
      showOutfitHeadings: p.showOutfitHeadings !== false,
      hidePackedItems: !!p.hidePackedItems,
      confirmDeletes: p.confirmDeletes !== false,
      showPhotos: p.showPhotos !== false,
      startingTab: ['trips', 'outfits', 'staples', 'settings'].includes(p.startingTab) ? p.startingTab : 'trips',
      hiddenHints,
      stapleCategories,
      accessoryCategories,
      clothingCatalog,
      extraClothingTabs,
      hiddenClothingTabs,
      clothingTabOrder,
      accessoryCatalog,
      splitView,
      catAddFormHidden: p.catAddFormHidden === true ? true : p.catAddFormHidden === false ? false : null,
      migratedShoesToAccessories: !!p.migratedShoesToAccessories,
      migratedHatsScarvesBelts: !!p.migratedHatsScarvesBelts,
    };
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function emptyState() {
    return {
      outfits: [],
      staples: DEFAULT_STAPLES.map((s) => ({
        id: uid(),
        name: s.name,
        category: s.category,
      })),
      accessories: DEFAULT_ACCESSORIES.map((s) => ({
        id: uid(),
        name: s.name,
        category: s.category,
      })),
      trips: [],
      prefs: {
        ...DEFAULT_PREFS,
        hiddenHints: {},
        stapleCategories: STAPLE_CAT_ORDER.slice(),
        accessoryCategories: ACCESSORY_CAT_ORDER.slice(),
        clothingCatalog: { women: {}, men: {} },
        extraClothingTabs: [],
        hiddenClothingTabs: [],
        clothingTabOrder: [],
        accessoryCatalog: {},
        splitView: { enabled: false, left: 'Tops', right: 'Bottoms' },
        migratedShoesToAccessories: true,
        migratedHatsScarvesBelts: true,
      },
    };
  }

  function migratePacked(packed) {
    if (!packed || typeof packed !== 'object') return {};
    const next = {};
    Object.keys(packed).forEach((key) => {
      if (!packed[key]) return;
      if (key.startsWith('cloth:')) next[`item:${key.slice(6)}`] = true;
      else next[key] = true;
    });
    return next;
  }

  function migrateEvent(ev) {
    return {
      id: ev?.id || uid(),
      name: String(ev?.name || 'Event').trim() || 'Event',
      items: Array.isArray(ev?.items)
        ? ev.items
            .map((item) => ({
              id: item?.id || uid(),
              name: normalizeName(item?.name),
            }))
            .filter((item) => item.name)
        : [],
    };
  }

  function migrateDay(day, index) {
    const date = typeof day?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date) ? day.date : null;
    let label = day?.label || `Day ${index + 1}`;
    if (date && isWeekdayLabel(label)) label = weekdayName(date);
    return {
      ...day,
      id: day?.id || uid(),
      label,
      date,
      notes: String(day?.notes || ''),
      outfitIds: Array.isArray(day?.outfitIds) ? day.outfitIds : [],
      items: Array.isArray(day?.items) ? day.items : [],
      events: Array.isArray(day?.events) ? day.events.map(migrateEvent) : [],
    };
  }

  function migrateTrip(trip) {
    return {
      ...trip,
      excludedStapleIds: Array.isArray(trip.excludedStapleIds) ? trip.excludedStapleIds : [],
      extraStaples: Array.isArray(trip.extraStaples) ? trip.extraStaples : [],
      packed: migratePacked(trip.packed),
      days: (trip.days || []).map((d, i) => migrateDay(d, i)),
    };
  }

  function migrateShoesToAccessories(state) {
    const catalog = state.prefs.clothingCatalog || { women: {}, men: {} };
    const hasShoesPatch = ['women', 'men'].some((gender) => catalog[gender]?.Shoes);
    if (state.prefs.migratedShoesToAccessories && !hasShoesPatch) return false;

    const alreadyMigrated = !!state.prefs.migratedShoesToAccessories;
    const have = new Set((state.accessories || []).map((a) => a.name.toLowerCase()));
    let hadShoesPatch = false;

    function addShoe(name) {
      const trimmed = String(name || '').trim();
      if (!trimmed || have.has(trimmed.toLowerCase())) return;
      have.add(trimmed.toLowerCase());
      state.accessories.push({
        id: uid(),
        name: trimmed,
        category: 'Shoes',
      });
    }

    ['women', 'men'].forEach((gender) => {
      const patch = catalog[gender]?.Shoes;
      if (!patch) return;
      hadShoesPatch = true;
      const hidden = new Set(
        (patch.hidden || []).map((n) => String(n || '').trim().toLowerCase()).filter(Boolean)
      );
      (patch.extras || []).forEach((raw) => {
        if (!hidden.has(String(raw || '').trim().toLowerCase())) addShoe(raw);
      });
      if (!alreadyMigrated) {
        (LEGACY_CLOTHING_SHOES[gender] || []).forEach((name) => {
          if (!hidden.has(name.toLowerCase())) addShoe(name);
        });
      }
      delete catalog[gender].Shoes;
    });

    if (!alreadyMigrated && !hadShoesPatch) {
      DEFAULT_ACCESSORIES.filter((item) => item.category === 'Shoes').forEach((item) => {
        addShoe(item.name);
      });
    }

    state.prefs.clothingCatalog = normalizeClothingCatalog(catalog);
    if (!alreadyMigrated) {
      state.prefs.accessoryCategories = ensureAccessoryCategory(
        state.prefs.accessoryCategories,
        'Shoes',
        'Other'
      );
    }
    state.prefs.migratedShoesToAccessories = true;
    return true;
  }

  function migrateHatsScarvesBelts(state) {
    if (state.prefs.migratedHatsScarvesBelts) return false;
    ['Hats', 'Scarves', 'Belts'].forEach((name) => {
      state.prefs.accessoryCategories = ensureAccessoryCategory(
        state.prefs.accessoryCategories,
        name,
        'Other'
      );
    });
    const rules = [
      ['Hats', /\bhat\b|\bcaps?\b|\bbeanie\b|\bvisor\b/i],
      ['Scarves', /\bscarf\b|\bscarves\b/i],
      ['Belts', /\bbelt\b/i],
    ];
    (state.accessories || []).forEach((item) => {
      const cat = item.category || 'Other';
      if (cat !== 'Other') return;
      for (const [next, re] of rules) {
        if (re.test(item.name || '')) {
          item.category = next;
          break;
        }
      }
    });
    const have = new Set((state.accessories || []).map((a) => a.name.toLowerCase()));
    DEFAULT_ACCESSORIES.filter((item) => ['Hats', 'Scarves', 'Belts'].includes(item.category)).forEach(
      (item) => {
        if (have.has(item.name.toLowerCase())) return;
        have.add(item.name.toLowerCase());
        state.accessories.push({
          id: uid(),
          name: item.name,
          category: item.category,
        });
      }
    );
    state.prefs.migratedHatsScarvesBelts = true;
    return true;
  }

  function migrateState(parsed) {
    const defaults = emptyState();
    const state = {
      outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
      staples: Array.isArray(parsed.staples) ? parsed.staples : defaults.staples,
      accessories: Array.isArray(parsed.accessories) ? parsed.accessories.slice() : defaults.accessories,
      trips: Array.isArray(parsed.trips) ? parsed.trips.map(migrateTrip) : [],
      prefs: mergePrefs(parsed.prefs),
    };
    migrateShoesToAccessories(state);
    migrateHatsScarvesBelts(state);
    return state;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const state = emptyState();
        save(state);
        return state;
      }
      const parsed = JSON.parse(raw);
      const state = migrateState(parsed);
      const hadClothingShoes =
        parsed.prefs?.clothingCatalog?.women?.Shoes || parsed.prefs?.clothingCatalog?.men?.Shoes;
      if (
        !parsed.prefs?.migratedShoesToAccessories ||
        hadClothingShoes ||
        !parsed.prefs?.migratedHatsScarvesBelts
      ) {
        save(state);
      }
      return state;
    } catch {
      return emptyState();
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function getState() {
    return load();
  }

  function update(mutator) {
    const state = load();
    mutator(state);
    save(state);
    return state;
  }

  function getPrefs() {
    return mergePrefs(load().prefs);
  }

  function setPref(key, value) {
    update((state) => {
      state.prefs = mergePrefs({ ...state.prefs, [key]: value });
    });
    return getPrefs();
  }

  function setPrefs(patch) {
    update((state) => {
      state.prefs = mergePrefs({ ...state.prefs, ...patch });
    });
    return getPrefs();
  }

  function isHintHidden(id) {
    return !!getPrefs().hiddenHints[id];
  }

  function hideHint(id) {
    const hiddenHints = { ...getPrefs().hiddenHints, [id]: true };
    return setPref('hiddenHints', hiddenHints);
  }

  function resetHints() {
    return setPref('hiddenHints', {});
  }

  function uniqueCats(preferred, extras) {
    const seen = new Set();
    const out = [];
    [...preferred, ...extras].forEach((cat) => {
      const name = String(cat || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(name);
    });
    return out;
  }

  function ensureAccessoryCategory(list, name, before) {
    const cats = Array.isArray(list) ? list.slice() : [];
    if (cats.some((c) => c.toLowerCase() === String(name).toLowerCase())) return cats;
    const idx = before ? cats.findIndex((c) => c.toLowerCase() === String(before).toLowerCase()) : -1;
    if (idx >= 0) cats.splice(idx, 0, name);
    else cats.push(name);
    return cats;
  }

  function listStapleCategories() {
    const used = listStaples().map((s) => s.category);
    load().trips.forEach((trip) => {
      (trip.extraStaples || []).forEach((s) => used.push(s.category));
    });
    return uniqueCats(getPrefs().stapleCategories, used);
  }

  function listAccessoryCategories() {
    const used = listAccessories().map((a) => a.category);
    return uniqueCats(getPrefs().accessoryCategories, used);
  }

  function listAccessorySubgroups(category) {
    const defaults = ClothingCatalog.accessorySubgroupsFor(category);
    const patch = getAccessoryPatch(category);
    const hidden = new Set((patch.hiddenGroups || []).map((n) => n.toLowerCase()));
    const extras = patch.extraGroups || [];
    const kept = defaults.filter((name) => !hidden.has(name.toLowerCase()));
    const merged = uniqueCats(kept, extras);
    return applyNamedOrder(merged, extras, patch.groupOrder || []);
  }

  function accessorySubgroup(item) {
    if (!item) return null;
    const subs = listAccessorySubgroups(item.category);
    if (!subs.length) return null;
    if (item.sub && subs.includes(item.sub)) return item.sub;
    const fromCatalog = ClothingCatalog.defaultAccessorySubgroup(item.category, item.name);
    if (fromCatalog) return fromCatalog;
    return guessSubgroup(item.name, subs);
  }

  function listAccessorySections(category) {
    const items = listAccessories().filter((a) => (a.category || 'Other') === category);
    const subs = listAccessorySubgroups(category);
    if (!subs.length) {
      return [{ id: '', label: null, items }];
    }
    const sections = subs.map((sub) => ({
      id: sub,
      label: sub,
      items: items.filter((a) => accessorySubgroup(a) === sub),
    }));
    const assigned = new Set(sections.flatMap((s) => s.items.map((a) => a.id)));
    const leftover = items.filter((a) => !assigned.has(a.id));
    if (leftover.length) {
      sections.push({ id: '', label: 'Other', items: leftover });
    }
    return sections;
  }

  function uniqueItemNames(list) {
    const seen = new Set();
    const out = [];
    (list || []).forEach((raw) => {
      const name = String(raw || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(name);
    });
    return out;
  }

  function emptyClothingPatch() {
    return {
      extras: [],
      hidden: [],
      order: [],
      extraSubs: {},
      orderBySub: {},
      photos: {},
      extraGroups: [],
      hiddenGroups: [],
      groupOrder: [],
    };
  }

  function normalizeSubMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    Object.keys(raw).forEach((name) => {
      const item = String(name || '').trim();
      const sub = String(raw[name] || '').trim();
      if (!item || !sub) return;
      out[item] = sub;
    });
    return out;
  }

  function normalizeOrderBySub(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    Object.keys(raw).forEach((sub) => {
      const key = String(sub || '').trim();
      if (!key) return;
      const names = uniqueItemNames(raw[sub]);
      if (names.length) out[key] = names;
    });
    return out;
  }

  function normalizePhotoMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out = {};
    Object.keys(raw).forEach((name) => {
      const item = String(name || '').trim();
      const id = String(raw[name] || '').trim();
      if (!item || !id) return;
      out[item] = id;
    });
    return out;
  }

  function normalizeClothingPatch(raw) {
    if (!raw || typeof raw !== 'object') return emptyClothingPatch();
    return {
      extras: uniqueItemNames(raw.extras),
      hidden: uniqueItemNames(raw.hidden),
      order: uniqueItemNames(raw.order),
      extraSubs: normalizeSubMap(raw.extraSubs),
      orderBySub: normalizeOrderBySub(raw.orderBySub),
      photos: normalizePhotoMap(raw.photos),
      extraGroups: uniqueItemNames(raw.extraGroups),
      hiddenGroups: uniqueItemNames(raw.hiddenGroups),
      groupOrder: uniqueItemNames(raw.groupOrder),
    };
  }

  function clothingPatchIsEmpty(patch) {
    return (
      !patch.extras.length &&
      !patch.hidden.length &&
      !patch.order.length &&
      !Object.keys(patch.extraSubs || {}).length &&
      !Object.keys(patch.orderBySub || {}).length &&
      !Object.keys(patch.photos || {}).length &&
      !(patch.extraGroups || []).length &&
      !(patch.hiddenGroups || []).length &&
      !(patch.groupOrder || []).length
    );
  }

  function emptyAccessoryPatch() {
    return { extraGroups: [], hiddenGroups: [], groupOrder: [] };
  }

  function normalizeAccessoryPatch(raw) {
    if (!raw || typeof raw !== 'object') return emptyAccessoryPatch();
    return {
      extraGroups: uniqueItemNames(raw.extraGroups),
      hiddenGroups: uniqueItemNames(raw.hiddenGroups),
      groupOrder: uniqueItemNames(raw.groupOrder),
    };
  }

  function accessoryPatchIsEmpty(patch) {
    return (
      !(patch.extraGroups || []).length &&
      !(patch.hiddenGroups || []).length &&
      !(patch.groupOrder || []).length
    );
  }

  function normalizeAccessoryCatalog(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).forEach((cat) => {
      const name = String(cat || '').trim();
      if (!name) return;
      const patch = normalizeAccessoryPatch(raw[cat]);
      if (!accessoryPatchIsEmpty(patch)) out[name] = patch;
    });
    return out;
  }

  function getAccessoryPatch(category) {
    const catalog = getPrefs().accessoryCatalog || {};
    const key = Object.keys(catalog).find((c) => c.toLowerCase() === String(category || '').toLowerCase());
    return normalizeAccessoryPatch(key ? catalog[key] : null);
  }

  function setAccessoryPatch(category, patch) {
    const name = String(category || '').trim();
    if (!name) return emptyAccessoryPatch();
    const catalog = normalizeAccessoryCatalog(getPrefs().accessoryCatalog);
    const next = normalizeAccessoryPatch(patch);
    Object.keys(catalog).forEach((key) => {
      if (key.toLowerCase() === name.toLowerCase()) delete catalog[key];
    });
    if (!accessoryPatchIsEmpty(next)) catalog[name] = next;
    setPref('accessoryCatalog', catalog);
    return next;
  }

  function normalizeSplitView(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const left = String(src.left || 'Tops').trim() || 'Tops';
    const right = String(src.right || 'Bottoms').trim() || 'Bottoms';
    return {
      enabled: !!src.enabled,
      left,
      right,
    };
  }

  function coerceSplitView(raw, tabs) {
    const names = Array.isArray(tabs) && tabs.length ? tabs.slice() : ['Tops', 'Bottoms'];
    const src = normalizeSplitView(raw);
    const match = (value) => {
      const want = String(value || '').trim().toLowerCase();
      if (!want) return null;
      return names.find((t) => t.toLowerCase() === want) || null;
    };
    const other = (avoid) =>
      names.find((t) => t.toLowerCase() !== String(avoid || '').toLowerCase()) || names[0];
    const left = match(src.left) || names[0];
    let right = match(src.right);
    if (!right || right.toLowerCase() === left.toLowerCase()) right = other(left);
    return { enabled: !!src.enabled, left, right };
  }

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function parseISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  }

  function utcCalendarDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
  }

  function toISODate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysISO(value, days) {
    const date = parseISODate(value);
    if (!date) return null;
    date.setDate(date.getDate() + Number(days) || 0);
    return toISODate(date);
  }

  function weekdayName(value) {
    const date = utcCalendarDate(value);
    if (!date) return '';
    return WEEKDAY_NAMES[date.getUTCDay()];
  }

  function formatDayDate(value) {
    const date = utcCalendarDate(value);
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function isWeekdayLabel(label) {
    const key = String(label || '').trim().toLowerCase();
    return WEEKDAY_NAMES.some((name) => name.toLowerCase() === key);
  }

  function isDefaultDayLabel(label, index) {
    const expected = `Day ${index + 1}`;
    return !label || String(label).trim().toLowerCase() === expected.toLowerCase();
  }

  function displayDayTitle(day, index = 0) {
    const idx = Math.max(0, Number(index) || 0);
    const fallback = `Day ${idx + 1}`;
    const dateText = formatDayDate(day?.date);
    const weekday = weekdayName(day?.date);
    const label = String(day?.label || '').trim();
    const auto = !label || isDefaultDayLabel(label, idx) || isWeekdayLabel(label);
    if (auto) {
      if (weekday && dateText) return `${fallback} · ${weekday}, ${dateText}`;
      if (dateText) return `${fallback} · ${dateText}`;
      return label || fallback;
    }
    return dateText ? `${label} · ${dateText}` : label;
  }

  function normalizeClothingCatalog(raw) {
    const out = { women: {}, men: {} };
    if (!raw || typeof raw !== 'object') return out;
    ['women', 'men'].forEach((gender) => {
      const src = raw[gender] && typeof raw[gender] === 'object' ? raw[gender] : {};
      Object.keys(src).forEach((tab) => {
        const patch = normalizeClothingPatch(src[tab]);
        if (!clothingPatchIsEmpty(patch)) out[gender][tab] = patch;
      });
    });
    return out;
  }

  function clothingGender(value) {
    return value === 'men' ? 'men' : 'women';
  }

  function getClothingPatch(gender, tab) {
    const catalog = getPrefs().clothingCatalog || { women: {}, men: {} };
    return normalizeClothingPatch(catalog[clothingGender(gender)]?.[tab]);
  }

  function setClothingPatch(gender, tab, patch) {
    const g = clothingGender(gender);
    const catalog = normalizeClothingCatalog(getPrefs().clothingCatalog);
    const next = normalizeClothingPatch(patch);
    if (!catalog[g]) catalog[g] = {};
    if (clothingPatchIsEmpty(next)) delete catalog[g][tab];
    else catalog[g][tab] = next;
    setPref('clothingCatalog', catalog);
    return next;
  }

  function listClothingTabs(gender) {
    const g = clothingGender(gender);
    const defaults = ClothingCatalog.groupNamesFor(g);
    const prefs = getPrefs();
    const hidden = new Set((prefs.hiddenClothingTabs || []).map((n) => n.toLowerCase()));
    const extras = prefs.extraClothingTabs || [];
    const kept = defaults.filter((name) => !hidden.has(name.toLowerCase()));
    const merged = uniqueCats(kept, extras);
    return applyNamedOrder(merged, extras, prefs.clothingTabOrder || []);
  }

  function listPickerTabs(gender) {
    return [...listClothingTabs(gender), 'Accessories'];
  }

  function listClothingSubgroups(gender, tab) {
    const g = clothingGender(gender);
    const defaults = ClothingCatalog.subgroupNamesFor(g, tab);
    const patch = getClothingPatch(g, tab);
    const hidden = new Set((patch.hiddenGroups || []).map((n) => n.toLowerCase()));
    const extras = patch.extraGroups || [];
    const kept = defaults.filter((name) => !hidden.has(name.toLowerCase()));
    const merged = uniqueCats(kept, extras);
    return applyNamedOrder(merged, extras, patch.groupOrder || []);
  }

  function isCustomClothingTab(gender, tab) {
    const key = String(tab || '').trim().toLowerCase();
    if (!key) return false;
    return (getPrefs().extraClothingTabs || []).some((n) => n.toLowerCase() === key);
  }

  function isCustomClothingGroup(gender, tab, sub) {
    const key = String(sub || '').trim().toLowerCase();
    if (!key) return false;
    const patch = getClothingPatch(gender, tab);
    return (patch.extraGroups || []).some((n) => n.toLowerCase() === key);
  }

  function addClothingTab(gender, name) {
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const existing = listClothingTabs(gender);
    if (existing.some((n) => n.toLowerCase() === trimmed.toLowerCase()) || trimmed.toLowerCase() === 'accessories') {
      return { action: 'exists', name: trimmed };
    }
    const extras = [...(getPrefs().extraClothingTabs || []), trimmed];
    const hidden = (getPrefs().hiddenClothingTabs || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    setPrefs({ extraClothingTabs: extras, hiddenClothingTabs: hidden });
    return { action: 'added', name: trimmed };
  }

  function renameClothingTab(gender, oldName, newName) {
    const next = normalizeName(newName);
    if (!next) return { action: 'empty' };
    const g = clothingGender(gender);
    const current = listClothingTabs(g);
    if (!current.some((n) => n.toLowerCase() === String(oldName).toLowerCase())) {
      return { action: 'missing' };
    }
    if (current.some((n) => n.toLowerCase() === next.toLowerCase() && n.toLowerCase() !== String(oldName).toLowerCase())) {
      return { action: 'exists', name: next };
    }
    if (next.toLowerCase() === 'accessories') return { action: 'invalid' };
    const prefs = getPrefs();
    const extras = (prefs.extraClothingTabs || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    if (!extras.some((n) => n.toLowerCase() === next.toLowerCase()) && isCustomClothingTab(g, oldName)) {
      extras.push(next);
    }
    const catalog = normalizeClothingCatalog(prefs.clothingCatalog);
    if (catalog[g]?.[oldName]) {
      catalog[g][next] = catalog[g][oldName];
      delete catalog[g][oldName];
    }
    const order = (prefs.clothingTabOrder || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    const hidden = (prefs.hiddenClothingTabs || []).filter((n) => n.toLowerCase() !== String(oldName).toLowerCase());
    if (!isCustomClothingTab(g, oldName) && ClothingCatalog.groupNamesFor(g).includes(oldName)) {
      hidden.push(oldName);
      if (!extras.some((n) => n.toLowerCase() === next.toLowerCase())) extras.push(next);
    }
    setPrefs({ extraClothingTabs: extras, hiddenClothingTabs: hidden, clothingTabOrder: order, clothingCatalog: catalog });
    return { action: 'renamed', name: next };
  }

  function removeClothingTab(gender, name) {
    const g = clothingGender(gender);
    const tabs = listClothingTabs(g);
    if (tabs.length <= 1) return { action: 'last' };
    const trimmed = normalizeName(name);
    if (!tabs.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return { action: 'missing' };
    const prefs = getPrefs();
    if (isCustomClothingTab(g, trimmed)) {
      const extras = (prefs.extraClothingTabs || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
      const catalog = normalizeClothingCatalog(prefs.clothingCatalog);
      if (catalog[g]) delete catalog[g][trimmed];
      setPrefs({ extraClothingTabs: extras, clothingCatalog: catalog });
      return { action: 'removed', name: trimmed };
    }
    const hidden = uniqueItemNames([...(prefs.hiddenClothingTabs || []), trimmed]);
    setPref('hiddenClothingTabs', hidden);
    return { action: 'hidden', name: trimmed };
  }

  function addClothingSubgroup(gender, tab, name) {
    const g = clothingGender(gender);
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const current = listClothingSubgroups(g, tab);
    if (current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return { action: 'exists', name: trimmed };
    }
    const patch = getClothingPatch(g, tab);
    patch.extraGroups = [...(patch.extraGroups || []), trimmed];
    patch.hiddenGroups = (patch.hiddenGroups || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    setClothingPatch(g, tab, patch);
    return { action: 'added', name: trimmed };
  }

  function renameClothingSubgroup(gender, tab, oldName, newName) {
    const g = clothingGender(gender);
    const next = normalizeName(newName);
    if (!next) return { action: 'empty' };
    const current = listClothingSubgroups(g, tab);
    if (!current.some((n) => n.toLowerCase() === String(oldName).toLowerCase())) return { action: 'missing' };
    if (current.some((n) => n.toLowerCase() === next.toLowerCase() && n.toLowerCase() !== String(oldName).toLowerCase())) {
      return { action: 'exists', name: next };
    }
    const patch = getClothingPatch(g, tab);
    patch.extraGroups = (patch.extraGroups || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    if (!patch.extraGroups.some((n) => n.toLowerCase() === next.toLowerCase())) patch.extraGroups.push(next);
    if (ClothingCatalog.subgroupNamesFor(g, tab).includes(oldName)) {
      if (!(patch.hiddenGroups || []).some((n) => n.toLowerCase() === String(oldName).toLowerCase())) {
        patch.hiddenGroups = [...(patch.hiddenGroups || []), oldName];
      }
    }
    Object.keys(patch.extraSubs || {}).forEach((item) => {
      if (patch.extraSubs[item] === oldName) patch.extraSubs[item] = next;
    });
    if (patch.orderBySub?.[oldName]) {
      patch.orderBySub[next] = patch.orderBySub[oldName];
      delete patch.orderBySub[oldName];
    }
    patch.groupOrder = (patch.groupOrder || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    setClothingPatch(g, tab, patch);
    return { action: 'renamed', name: next };
  }

  function removeClothingSubgroup(gender, tab, name) {
    const g = clothingGender(gender);
    const trimmed = normalizeName(name);
    const current = listClothingSubgroups(g, tab);
    if (!current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return { action: 'missing' };
    const patch = getClothingPatch(g, tab);
    patch.extraGroups = (patch.extraGroups || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    Object.keys(patch.extraSubs || {}).forEach((item) => {
      if (patch.extraSubs[item] === trimmed || patch.extraSubs[item] === name) delete patch.extraSubs[item];
    });
    if (patch.orderBySub) delete patch.orderBySub[trimmed];
    patch.groupOrder = (patch.groupOrder || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    if (ClothingCatalog.subgroupNamesFor(g, tab).includes(name) || ClothingCatalog.subgroupNamesFor(g, tab).includes(trimmed)) {
      if (!(patch.hiddenGroups || []).some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.hiddenGroups = [...(patch.hiddenGroups || []), trimmed];
      }
    }
    setClothingPatch(g, tab, patch);
    return { action: 'removed', name: trimmed };
  }

  function addAccessoryCategory(name) {
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const cats = listAccessoryCategories();
    if (cats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return { action: 'exists', name: trimmed };
    setPref('accessoryCategories', [...getPrefs().accessoryCategories, trimmed]);
    return { action: 'added', name: trimmed };
  }

  function renameAccessoryCategory(oldName, newName) {
    const next = normalizeName(newName);
    if (!next) return { action: 'empty' };
    const cats = listAccessoryCategories();
    if (!cats.some((c) => c.toLowerCase() === String(oldName).toLowerCase())) return { action: 'missing' };
    if (cats.some((c) => c.toLowerCase() === next.toLowerCase() && c.toLowerCase() !== String(oldName).toLowerCase())) {
      return { action: 'exists', name: next };
    }
    const prefs = getPrefs();
    const accessoryCategories = (prefs.accessoryCategories || []).map((c) =>
      c.toLowerCase() === String(oldName).toLowerCase() ? next : c
    );
    if (!accessoryCategories.some((c) => c.toLowerCase() === next.toLowerCase())) accessoryCategories.push(next);
    update((state) => {
      state.prefs = mergePrefs({ ...state.prefs, accessoryCategories });
      state.accessories.forEach((item) => {
        if ((item.category || '').toLowerCase() === String(oldName).toLowerCase()) item.category = next;
      });
      const catalog = normalizeAccessoryCatalog(state.prefs.accessoryCatalog);
      if (catalog[oldName]) {
        catalog[next] = catalog[oldName];
        delete catalog[oldName];
        state.prefs.accessoryCatalog = catalog;
      }
    });
    return { action: 'renamed', name: next };
  }

  function removeAccessoryCategory(name) {
    const cats = getPrefs().accessoryCategories || [];
    if (cats.length <= 1) return { action: 'last' };
    const trimmed = normalizeName(name);
    if (!cats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return { action: 'missing' };
    setPref(
      'accessoryCategories',
      cats.filter((c) => c.toLowerCase() !== trimmed.toLowerCase())
    );
    return { action: 'removed', name: trimmed };
  }

  function addAccessorySubgroup(category, name) {
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const current = listAccessorySubgroups(category);
    if (current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return { action: 'exists', name: trimmed };
    const patch = getAccessoryPatch(category);
    patch.extraGroups = [...(patch.extraGroups || []), trimmed];
    patch.hiddenGroups = (patch.hiddenGroups || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    setAccessoryPatch(category, patch);
    return { action: 'added', name: trimmed };
  }

  function renameAccessorySubgroup(category, oldName, newName) {
    const next = normalizeName(newName);
    if (!next) return { action: 'empty' };
    const current = listAccessorySubgroups(category);
    if (!current.some((n) => n.toLowerCase() === String(oldName).toLowerCase())) return { action: 'missing' };
    if (current.some((n) => n.toLowerCase() === next.toLowerCase() && n.toLowerCase() !== String(oldName).toLowerCase())) {
      return { action: 'exists', name: next };
    }
    const patch = getAccessoryPatch(category);
    patch.extraGroups = (patch.extraGroups || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    if (!patch.extraGroups.some((n) => n.toLowerCase() === next.toLowerCase())) patch.extraGroups.push(next);
    if (ClothingCatalog.accessorySubgroupsFor(category).includes(oldName)) {
      if (!(patch.hiddenGroups || []).some((n) => n.toLowerCase() === String(oldName).toLowerCase())) {
        patch.hiddenGroups = [...(patch.hiddenGroups || []), oldName];
      }
    }
    patch.groupOrder = (patch.groupOrder || []).map((n) =>
      n.toLowerCase() === String(oldName).toLowerCase() ? next : n
    );
    update((state) => {
      state.accessories.forEach((item) => {
        if ((item.category || '') === category && item.sub === oldName) item.sub = next;
      });
    });
    setAccessoryPatch(category, patch);
    return { action: 'renamed', name: next };
  }

  function removeAccessorySubgroup(category, name) {
    const trimmed = normalizeName(name);
    const current = listAccessorySubgroups(category);
    if (!current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return { action: 'missing' };
    const patch = getAccessoryPatch(category);
    patch.extraGroups = (patch.extraGroups || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    patch.groupOrder = (patch.groupOrder || []).filter((n) => n.toLowerCase() !== trimmed.toLowerCase());
    if (ClothingCatalog.accessorySubgroupsFor(category).includes(name) || ClothingCatalog.accessorySubgroupsFor(category).includes(trimmed)) {
      if (!(patch.hiddenGroups || []).some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.hiddenGroups = [...(patch.hiddenGroups || []), trimmed];
      }
    }
    setAccessoryPatch(category, patch);
    return { action: 'removed', name: trimmed };
  }

  function getSplitView(tabs) {
    return coerceSplitView(getPrefs().splitView, tabs || listPickerTabs('women'));
  }

  function setSplitView(patch, tabs) {
    const names = tabs || listPickerTabs('women');
    const next = coerceSplitView({ ...getSplitView(names), ...patch }, names);
    setPref('splitView', next);
    return next;
  }

  function extraSubOf(patch, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return null;
    const hit = Object.entries(patch.extraSubs || {}).find(([n]) => n.toLowerCase() === key);
    return hit ? hit[1] : null;
  }

  function setExtraSub(patch, name, sub) {
    const next = {};
    Object.entries(patch.extraSubs || {}).forEach(([n, s]) => {
      if (n.toLowerCase() !== normalizeName(name).toLowerCase()) next[n] = s;
    });
    if (sub) next[normalizeName(name)] = sub;
    patch.extraSubs = next;
  }

  function clothingPhotoOf(patch, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return null;
    const hit = Object.entries(patch.photos || {}).find(([n]) => n.toLowerCase() === key);
    return hit ? hit[1] : null;
  }

  function dropClothingPhoto(patch, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return;
    const next = {};
    Object.entries(patch.photos || {}).forEach(([n, id]) => {
      if (n.toLowerCase() !== key) next[n] = id;
    });
    patch.photos = next;
  }

  function setClothingPhotoOnPatch(patch, name, photoId) {
    dropClothingPhoto(patch, name);
    const trimmed = normalizeName(name);
    const id = String(photoId || '').trim();
    if (!trimmed || !id) return;
    patch.photos = { ...(patch.photos || {}), [trimmed]: id };
  }

  function clothingPhotoId(gender, tab, name) {
    return clothingPhotoOf(getClothingPatch(gender, tab), name);
  }

  function setClothingPhoto(gender, tab, name, photoId) {
    const g = clothingGender(gender);
    const tabs = listClothingTabs(g);
    if (!tabs.includes(tab)) return null;
    const trimmed = normalizeName(name);
    if (!trimmed) return null;
    const patch = getClothingPatch(g, tab);
    setClothingPhotoOnPatch(patch, trimmed, photoId);
    setClothingPatch(g, tab, patch);
    return clothingPhotoOf(patch, trimmed);
  }

  function findItemPhotoId(name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return null;
    const accessory = listAccessories().find((a) => a.name.toLowerCase() === key);
    if (accessory?.photoId) return accessory.photoId;
    const staple = listStaples().find((s) => s.name.toLowerCase() === key);
    if (staple?.photoId) return staple.photoId;
    const preferred = clothingGender(getPrefs().clothingGender);
    const genders = preferred === 'men' ? ['men', 'women'] : ['women', 'men'];
    for (const g of genders) {
      for (const tab of listClothingTabs(g)) {
        const id = clothingPhotoId(g, tab, name);
        if (id) return id;
      }
    }
    return null;
  }

  function guessSubgroup(name, subs) {
    if (!subs.length) return null;
    const n = String(name || '').toLowerCase();
    const rules = [
      ['Tees long sleeve', /(long[- ]?sleeve).*(tee|t-?shirt|\btop\b)|(tee|t-?shirt).*(long[- ]?sleeve)/],
      ['Blouses long sleeve', /(long[- ]?sleeve).*(blouse|shirt)|\bdress shirt\b|\bbodysuit\b|\blong sleeve blouse\b/],
      ['Tees short sleeve', /(short[- ]?sleeve).*(tee|t-?shirt)|\bgraphic tee\b|\bpolo\b|\bt-?shirt\b|\btee\b/],
      ['Blouses short sleeve', /(short[- ]?sleeve).*(blouse|shirt)|\bblouse\b|\bcrop\b|\btank\b|\bsleeveless\b|\bbasic top\b|\bcasual shirt\b|\btop\b|\bshirt\b/],
      ['Sweatshirts', /(sweatshirt|sweater|hoodie|turtleneck|crewneck)/],
      ['Coats', /(coat|trench|puffer|parka|peacoat|overcoat|raincoat)/],
      ['Blazers', /\bblazer\b/],
      ['Vests', /\bvest\b|\bgilet\b|\bwaistcoat\b/],
      ['Jackets', /(jacket|windbreaker|overshirt|shacket|bomber|anorak)/],
      ['Sweaters', /(sweater|cardigan|hoodie|fleece|turtleneck|crewneck|knit|\bzip\b)/],
      ['Jeans', /\bjeans?\b|\bdenim\b/],
      ['Skirts', /\bskirt\b/],
      ['Leggings', /\blegging|\btights\b/],
      ['Shorts', /\bshorts?\b|\bbermuda\b/],
      ['Pants', /\bpants?\b|\btrousers?\b|\bchinos?\b|\bjoggers?\b|\bsweatpants\b|\bculottes\b|wide-leg/],
      ['Swim', /\bswim|\bbikini|\bone[- ]?piece|\bboard shorts?\b|\btrunks?\b|\brash ?guard\b|\bcover[- ]?up\b/],
      [
        'Workout',
        /\bworkout|\bsport|\bathletic|\bgym|\btrain|\bcompression|\btrack|\bjoggers?\b/,
      ],
      ['Bras', /\bbra\b|\bbralette\b/],
      ['Underwear', /\bunderwear\b|\bthong\b|\bshapewear\b|\bslip\b|\bboxers?\b|\bbriefs?\b/],
      ['Sleep', /\bpajamas?\b|\bpjs?\b|\bsleep|\bnightgown\b|\brobe\b/],
      ['Earrings', /\bearring|\bhoops?\b|\bstuds?\b/],
      ['Necklaces', /\bnecklace|\bpendant|\bchain\b/],
      ['Bracelets', /\bbracelet|\bbangle|\bcuff\b/],
      ['Rings', /\bring\b/],
      ['Watches', /\bwatch\b/],
      ['Hats', /\bhat\b|\bcap\b|\bbeanie\b|\bvisor\b/],
      ['Scarves', /\bscarf\b|\bscarves\b/],
      ['Belts', /\bbelt\b/],
      ['Sandals', /\bsandal|\bslide|\bflip[- ]?flop/],
      ['Sneakers', /\bsneaker|\btrainer|\bwalking shoe/],
      ['Boots', /\bboot/],
      ['Heels', /\bheel|\bpump|\bstiletto/],
      ['Flats', /\bflat|\bloafer|\bballet|\bdress shoe|\boxford|\bderby/],
    ];
    for (const [sub, re] of rules) {
      if (subs.includes(sub) && re.test(n)) return sub;
    }
    const named = subs.find((sub) => {
      const key = sub.toLowerCase();
      return n.includes(key) || key.includes(n);
    });
    return named || null;
  }

  function resolveSubgroup(gender, tab, name, patch, preferred) {
    const g = clothingGender(gender);
    const subs = listClothingSubgroups(g, tab);
    if (!subs.length) return null;
    if (preferred && subs.includes(preferred)) return preferred;
    const extra = extraSubOf(patch, name);
    if (extra && subs.includes(extra)) return extra;
    const fromCatalog = ClothingCatalog.defaultSubgroup(g, tab, name);
    if (fromCatalog) return fromCatalog;
    const guessed = guessSubgroup(name, subs);
    if (guessed) return guessed;
    if (ClothingCatalog.subgroupNamesFor(g, tab).length) return subs[0];
    return null;
  }

  function applyNamedOrder(merged, extras, order) {
    if (!order || !order.length) return merged;
    const byKey = new Map(merged.map((name) => [name.toLowerCase(), name]));
    const seen = new Set();
    const ordered = [];
    order.forEach((name) => {
      const key = name.toLowerCase();
      const match = byKey.get(key);
      if (!match || seen.has(key)) return;
      seen.add(key);
      ordered.push(match);
    });
    const leftoverExtras = extras.filter((name) => !seen.has(name.toLowerCase()));
    const leftoverRest = merged.filter(
      (name) =>
        !seen.has(name.toLowerCase()) &&
        !leftoverExtras.some((extra) => extra.toLowerCase() === name.toLowerCase())
    );
    return [...leftoverExtras, ...ordered, ...leftoverRest];
  }

  function visibleExtrasAndDefaults(gender, tab) {
    const g = clothingGender(gender);
    const defaults = ClothingCatalog.pillsFor(g, tab) || [];
    const patch = getClothingPatch(g, tab);
    const hidden = new Set(patch.hidden.map((n) => n.toLowerCase()));
    const extras = [];
    const extraKeys = new Set();
    patch.extras.forEach((name) => {
      const key = name.toLowerCase();
      if (hidden.has(key) || extraKeys.has(key)) return;
      extraKeys.add(key);
      extras.push(name);
    });
    const kept = defaults.filter(
      (name) => !hidden.has(name.toLowerCase()) && !extraKeys.has(name.toLowerCase())
    );
    return { g, patch, extras, kept };
  }

  function listClothingSections(gender, tab) {
    const { g, patch, extras, kept } = visibleExtrasAndDefaults(gender, tab);
    const subs = listClothingSubgroups(g, tab);
    if (!subs.length) {
      const merged = [...extras, ...kept];
      return [{ id: '', label: null, items: applyNamedOrder(merged, extras, patch.order) }];
    }

    return subs.map((sub) => {
      const extraHere = extras.filter((name) => resolveSubgroup(g, tab, name, patch) === sub);
      const keptHere = kept.filter((name) => resolveSubgroup(g, tab, name, patch) === sub);
      const merged = [...extraHere, ...keptHere];
      const subOrder = patch.orderBySub[sub];
      const order = subOrder && subOrder.length ? subOrder : patch.order;
      return {
        id: sub,
        label: sub,
        items: applyNamedOrder(merged, extraHere, order),
      };
    }).concat((() => {
      const assigned = new Set();
      const leftoverExtras = extras.filter((name) => !resolveSubgroup(g, tab, name, patch));
      const leftoverKept = kept.filter((name) => !resolveSubgroup(g, tab, name, patch));
      leftoverExtras.concat(leftoverKept).forEach((name) => assigned.add(name));
      const leftover = [...leftoverExtras, ...leftoverKept];
      if (!leftover.length) return [];
      return [{
        id: '',
        label: 'Other',
        items: applyNamedOrder(leftover, leftoverExtras, patch.order),
      }];
    })());
  }

  function listClothingItems(gender, tab) {
    return listClothingSections(gender, tab).flatMap((section) => section.items);
  }

  function clothingSubgroup(gender, tab, name) {
    const g = clothingGender(gender);
    const patch = getClothingPatch(g, tab);
    return resolveSubgroup(g, tab, name, patch);
  }

  function clothingGroupsFor(gender) {
    const g = clothingGender(gender);
    const groups = {};
    listClothingTabs(g).forEach((tab) => {
      groups[tab] = listClothingItems(g, tab);
    });
    return groups;
  }

  function searchClothing(gender, query) {
    const g = clothingGender(gender);
    const hits = ClothingCatalog.searchAll(g, query, clothingGroupsFor(g));
    return hits.map((hit) => ({
      ...hit,
      sub: hit.sub || clothingSubgroup(g, hit.group, hit.name),
    }));
  }

  function isCustomClothingItem(gender, tab, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return false;
    return getClothingPatch(gender, tab).extras.some((n) => n.toLowerCase() === key);
  }

  function prependClothingOrder(patch, name) {
    if (!patch.order.length) return;
    const key = normalizeName(name).toLowerCase();
    if (!key) return;
    patch.order = [name, ...patch.order.filter((n) => n.toLowerCase() !== key)];
  }

  function prependClothingOrderBySub(patch, sub, name) {
    if (!sub) return;
    const current = patch.orderBySub[sub] || [];
    if (!current.length) return;
    const key = normalizeName(name).toLowerCase();
    if (!key) return;
    patch.orderBySub = {
      ...patch.orderBySub,
      [sub]: [name, ...current.filter((n) => n.toLowerCase() !== key)],
    };
  }

  function dropFromClothingOrder(patch, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return;
    patch.order = patch.order.filter((n) => n.toLowerCase() !== key);
    const next = {};
    Object.keys(patch.orderBySub || {}).forEach((sub) => {
      const names = (patch.orderBySub[sub] || []).filter((n) => n.toLowerCase() !== key);
      if (names.length) next[sub] = names;
    });
    patch.orderBySub = next;
  }

  function addClothingItem(gender, tab, name, sub) {
    const g = clothingGender(gender);
    const tabs = listClothingTabs(g);
    if (!tabs.includes(tab)) return { action: 'invalid' };
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const current = listClothingItems(g, tab);
    if (current.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return { action: 'exists', name: trimmed };
    }
    const patch = getClothingPatch(g, tab);
    const hiddenIdx = patch.hidden.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
    const assigned = resolveSubgroup(g, tab, trimmed, patch, sub);
    if (hiddenIdx >= 0) {
      patch.hidden.splice(hiddenIdx, 1);
      const defaults = ClothingCatalog.pillsFor(g, tab) || [];
      if (!defaults.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.extras.unshift(trimmed);
        if (assigned) setExtraSub(patch, trimmed, assigned);
      }
      prependClothingOrder(patch, trimmed);
      prependClothingOrderBySub(patch, assigned, trimmed);
      setClothingPatch(g, tab, patch);
      return { action: 'restored', name: trimmed, sub: assigned };
    }
    patch.extras.unshift(trimmed);
    if (assigned) setExtraSub(patch, trimmed, assigned);
    prependClothingOrder(patch, trimmed);
    prependClothingOrderBySub(patch, assigned, trimmed);
    setClothingPatch(g, tab, patch);
    return { action: 'added', name: trimmed, sub: assigned };
  }

  function removeClothingItem(gender, tab, name) {
    const g = clothingGender(gender);
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const patch = getClothingPatch(g, tab);
    const extraIdx = patch.extras.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
    if (extraIdx >= 0) {
      const photoId = clothingPhotoOf(patch, trimmed);
      patch.extras.splice(extraIdx, 1);
      setExtraSub(patch, trimmed, null);
      dropFromClothingOrder(patch, trimmed);
      dropClothingPhoto(patch, trimmed);
      setClothingPatch(g, tab, patch);
      return { action: 'removed', name: trimmed, photoId };
    }
    const defaults = ClothingCatalog.pillsFor(g, tab) || [];
    if (defaults.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      if (!patch.hidden.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.hidden.push(trimmed);
      }
      setExtraSub(patch, trimmed, null);
      dropFromClothingOrder(patch, trimmed);
      setClothingPatch(g, tab, patch);
      return { action: 'hidden', name: trimmed };
    }
    return { action: 'missing', name: trimmed };
  }

  function renameClothingItem(gender, fromTab, oldName, newName, toTab, sub) {
    const g = clothingGender(gender);
    const destTab = toTab || fromTab;
    const tabs = listClothingTabs(g);
    if (!tabs.includes(fromTab) || !tabs.includes(destTab)) return { action: 'invalid' };
    const trimmed = normalizeName(newName);
    if (!trimmed) return { action: 'empty' };
    const sameSlot =
      fromTab === destTab && normalizeName(oldName).toLowerCase() === trimmed.toLowerCase();
    const destSub = resolveSubgroup(
      g,
      destTab,
      trimmed,
      getClothingPatch(g, destTab),
      sub || (fromTab === destTab ? clothingSubgroup(g, fromTab, oldName) : null)
    );
    if (sameSlot && destSub === clothingSubgroup(g, fromTab, oldName)) {
      return { action: 'unchanged', name: trimmed, tab: destTab, sub: destSub };
    }
    if (sameSlot) {
      const patch = getClothingPatch(g, fromTab);
      if (destSub) setExtraSub(patch, oldName, destSub);
      setClothingPatch(g, fromTab, patch);
      return { action: 'moved', name: trimmed, tab: destTab, sub: destSub };
    }

    const destItems = listClothingItems(g, destTab);
    const clash = destItems.some(
      (n) =>
        n.toLowerCase() === trimmed.toLowerCase() &&
        n.toLowerCase() !== normalizeName(oldName).toLowerCase()
    );
    if (clash) return { action: 'exists', name: trimmed };

    const oldKey = normalizeName(oldName).toLowerCase();
    const fromPatch = getClothingPatch(g, fromTab);
    const photoId = clothingPhotoOf(fromPatch, oldName);
    const orderIdx =
      fromTab === destTab
        ? fromPatch.order.findIndex((n) => n.toLowerCase() === oldKey)
        : -1;

    if (photoId) {
      dropClothingPhoto(fromPatch, oldName);
      setClothingPatch(g, fromTab, fromPatch);
    }

    removeClothingItem(g, fromTab, oldName);
    const added = addClothingItem(g, destTab, trimmed, destSub);
    if (added.action === 'exists') {
      if (photoId) setClothingPhoto(g, fromTab, oldName, photoId);
      return added;
    }
    if (fromTab === destTab) {
      const patch = getClothingPatch(g, destTab);
      if (orderIdx >= 0 && patch.order.length) {
        dropFromClothingOrder(patch, trimmed);
        patch.order.splice(Math.min(orderIdx, patch.order.length), 0, trimmed);
        if (destSub) setExtraSub(patch, trimmed, destSub);
        setClothingPatch(g, destTab, patch);
      }
    }
    if (photoId) setClothingPhoto(g, destTab, trimmed, photoId);
    return { action: 'renamed', name: trimmed, tab: destTab, sub: destSub, photoId };
  }

  function reorderClothingItems(gender, tab, names, sub) {
    const g = clothingGender(gender);
    const tabs = listClothingTabs(g);
    if (!tabs.includes(tab)) return listClothingItems(g, tab);
    const sections = listClothingSections(g, tab);
    const patch = getClothingPatch(g, tab);

    if (sub && sections.some((section) => section.id === sub)) {
      const section = sections.find((s) => s.id === sub);
      const visibleKeys = new Set(section.items.map((n) => n.toLowerCase()));
      const ordered = uniqueItemNames(names).filter((n) => visibleKeys.has(n.toLowerCase()));
      section.items.forEach((name) => {
        if (!ordered.some((n) => n.toLowerCase() === name.toLowerCase())) ordered.push(name);
      });
      patch.orderBySub = { ...patch.orderBySub, [sub]: ordered };
      patch.order = sections.flatMap((s) => (s.id === sub ? ordered : s.items));
      setClothingPatch(g, tab, patch);
      return listClothingItems(g, tab);
    }

    const visible = listClothingItems(g, tab);
    const visibleKeys = new Set(visible.map((n) => n.toLowerCase()));
    const ordered = uniqueItemNames(names).filter((n) => visibleKeys.has(n.toLowerCase()));
    visible.forEach((name) => {
      if (!ordered.some((n) => n.toLowerCase() === name.toLowerCase())) ordered.push(name);
    });
    patch.order = ordered;
    setClothingPatch(g, tab, patch);
    return listClothingItems(g, tab);
  }

  function restoreClothingDefaults() {
    const catalog = normalizeClothingCatalog(getPrefs().clothingCatalog);
    let restored = 0;
    ['women', 'men'].forEach((g) => {
      Object.keys(catalog[g] || {}).forEach((tab) => {
        restored += (catalog[g][tab].hidden || []).length;
        catalog[g][tab] = {
          extras: catalog[g][tab].extras || [],
          hidden: [],
          order: catalog[g][tab].order || [],
          extraSubs: catalog[g][tab].extraSubs || {},
          orderBySub: catalog[g][tab].orderBySub || {},
          photos: catalog[g][tab].photos || {},
          extraGroups: catalog[g][tab].extraGroups || [],
          hiddenGroups: catalog[g][tab].hiddenGroups || [],
          groupOrder: catalog[g][tab].groupOrder || [],
        };
        if (clothingPatchIsEmpty(catalog[g][tab])) delete catalog[g][tab];
      });
    });
    setPref('clothingCatalog', catalog);
    return restored;
  }

  function clothingCatalogSummary() {
    const catalog = normalizeClothingCatalog(getPrefs().clothingCatalog);
    let extras = 0;
    let hidden = 0;
    ['women', 'men'].forEach((g) => {
      Object.values(catalog[g] || {}).forEach((patch) => {
        extras += (patch.extras || []).length;
        hidden += (patch.hidden || []).length;
      });
    });
    return { extras, hidden };
  }

  function restoreMissingDefaults(kind) {
    const source = kind === 'accessories' ? DEFAULT_ACCESSORIES : DEFAULT_STAPLES;
    const existing = kind === 'accessories' ? listAccessories() : listStaples();
    const have = new Set(existing.map((i) => i.name.toLowerCase()));
    let added = 0;
    source.forEach((item) => {
      if (have.has(item.name.toLowerCase())) return;
      if (kind === 'accessories') addAccessory(item);
      else addStaple(item);
      added += 1;
    });
    return added;
  }

  function exportBackup() {
    return JSON.stringify(load(), null, 2);
  }

  function importBackup(raw) {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid backup');
    save(migrateState(parsed));
    return getState();
  }

  function clearAllPacked() {
    update((state) => {
      state.trips.forEach((trip) => {
        trip.packed = {};
      });
    });
  }

  function resetAllData() {
    save(emptyState());
    return getState();
  }

  function normalizeName(name) {
    return String(name || '').trim();
  }

  function itemKey(name) {
    return `item:${normalizeName(name).toLowerCase()}`;
  }

  function outfitKey(outfitId) {
    return `outfit:${outfitId}`;
  }

  function uniqueKeys(keys) {
    const seen = new Set();
    const out = [];
    (keys || []).forEach((key) => {
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(key);
    });
    return out;
  }

  function outfitPackKeys(outfit) {
    if (!outfit) return [];
    const names = (outfit.items || []).map((n) => normalizeName(n)).filter(Boolean);
    if (!names.length) return [outfitKey(outfit.id)];
    return uniqueKeys(names.map((n) => itemKey(n)));
  }

  // ——— Outfits ———
  function listOutfits() {
    return load().outfits.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function getOutfit(id) {
    return load().outfits.find((o) => o.id === id) || null;
  }

  function saveOutfit(outfit) {
    return update((state) => {
      const now = Date.now();
      const idx = state.outfits.findIndex((o) => o.id === outfit.id);
      const record = {
        id: outfit.id || uid(),
        name: (outfit.name || 'Untitled outfit').trim(),
        items: (outfit.items || []).map((i) => String(i).trim()).filter(Boolean),
        photoId: outfit.photoId || null,
        createdAt: outfit.createdAt || now,
        updatedAt: now,
      };
      if (idx >= 0) state.outfits[idx] = { ...state.outfits[idx], ...record, createdAt: state.outfits[idx].createdAt };
      else state.outfits.push(record);
    }).outfits.find((o) => o.id === (outfit.id || null)) || listOutfits()[0];
  }

  function createOutfit({ name, items, photoId }) {
    const id = uid();
    const now = Date.now();
    update((state) => {
      state.outfits.unshift({
        id,
        name: (name || 'Untitled outfit').trim(),
        items: (items || []).map((i) => String(i).trim()).filter(Boolean),
        photoId: photoId || null,
        createdAt: now,
        updatedAt: now,
      });
    });
    return getOutfit(id);
  }

  function updateOutfit(id, patch) {
    update((state) => {
      const idx = state.outfits.findIndex((o) => o.id === id);
      if (idx < 0) return;
      const cur = state.outfits[idx];
      state.outfits[idx] = {
        ...cur,
        ...patch,
        id: cur.id,
        name: patch.name != null ? String(patch.name).trim() : cur.name,
        items: patch.items != null
          ? patch.items.map((i) => String(i).trim()).filter(Boolean)
          : cur.items,
        updatedAt: Date.now(),
      };
    });
    return getOutfit(id);
  }

  function deleteOutfit(id) {
    const outfit = getOutfit(id);
    update((state) => {
      state.outfits = state.outfits.filter((o) => o.id !== id);
      state.trips.forEach((trip) => {
        trip.days.forEach((day) => {
          day.outfitIds = (day.outfitIds || []).filter((oid) => oid !== id);
        });
      });
    });
    return outfit;
  }

  // ——— Staples (global library) ———
  function listStaples() {
    return load().staples.slice();
  }

  function addStaple({ name, category, photoId }) {
    const id = uid();
    update((state) => {
      state.staples.push({
        id,
        name: (name || '').trim(),
        category: (category || 'Other').trim() || 'Other',
        photoId: photoId || null,
      });
    });
    return listStaples().find((s) => s.id === id);
  }

  function updateStaple(id, patch) {
    update((state) => {
      const idx = state.staples.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const cur = state.staples[idx];
      const name = patch.name != null ? normalizeName(patch.name) : cur.name;
      if (!name) return;
      state.staples[idx] = {
        ...cur,
        name,
        category:
          patch.category != null
            ? String(patch.category).trim() || 'Other'
            : cur.category,
        photoId: patch.photoId !== undefined ? patch.photoId || null : cur.photoId || null,
      };
    });
    return listStaples().find((s) => s.id === id) || null;
  }

  function deleteStaple(id) {
    const staple = listStaples().find((s) => s.id === id) || null;
    update((state) => {
      state.staples = state.staples.filter((s) => s.id !== id);
      state.trips.forEach((trip) => {
        trip.excludedStapleIds = (trip.excludedStapleIds || []).filter((sid) => sid !== id);
      });
    });
    return staple;
  }

  function spliceReorderById(list, orderedIds) {
    const map = new Map(list.map((item) => [item.id, item]));
    const queue = orderedIds.map((id) => map.get(id)).filter(Boolean);
    const idSet = new Set(queue.map((item) => item.id));
    return list.map((item) => (idSet.has(item.id) ? queue.shift() : item));
  }

  function reorderStaples(ids) {
    update((state) => {
      state.staples = spliceReorderById(state.staples, ids);
    });
  }

  function reorderAccessories(ids) {
    update((state) => {
      state.accessories = spliceReorderById(state.accessories, ids);
    });
  }

  // ——— Accessories (reusable bank) ———
  function listAccessories() {
    return load().accessories.slice();
  }

  function resolveAccessorySub(category, name, preferred) {
    const cat = (category || 'Other').trim() || 'Other';
    const subs = listAccessorySubgroups(cat);
    if (!subs.length) return null;
    if (preferred && subs.includes(preferred)) return preferred;
    const fromCatalog = ClothingCatalog.defaultAccessorySubgroup(cat, name);
    if (fromCatalog) return fromCatalog;
    return guessSubgroup(name, subs);
  }

  function addAccessory({ name, category, photoId, sub }) {
    const trimmed = normalizeName(name);
    if (!trimmed) return null;
    const existing = listAccessories().find(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const id = uid();
    const cat = (category || 'Other').trim() || 'Other';
    const assigned = resolveAccessorySub(cat, trimmed, sub);
    update((state) => {
      state.accessories.push({
        id,
        name: trimmed,
        category: cat,
        sub: assigned || null,
        photoId: photoId || null,
      });
    });
    return listAccessories().find((a) => a.id === id);
  }

  function updateAccessory(id, patch) {
    update((state) => {
      const idx = state.accessories.findIndex((a) => a.id === id);
      if (idx < 0) return;
      const cur = state.accessories[idx];
      const name = patch.name != null ? normalizeName(patch.name) : cur.name;
      if (!name) return;
      const duplicate = state.accessories.find(
        (a) => a.id !== id && a.name.toLowerCase() === name.toLowerCase()
      );
      if (duplicate) return;
      const category =
        patch.category != null
          ? String(patch.category).trim() || 'Other'
          : cur.category;
      const assigned =
        patch.sub !== undefined || patch.category != null || patch.name != null
          ? resolveAccessorySub(category, name, patch.sub !== undefined ? patch.sub : cur.sub)
          : cur.sub || null;
      state.accessories[idx] = {
        ...cur,
        name,
        category,
        sub: assigned || null,
        photoId: patch.photoId !== undefined ? patch.photoId || null : cur.photoId || null,
      };
    });
    return listAccessories().find((a) => a.id === id) || null;
  }

  function deleteAccessory(id) {
    const accessory = listAccessories().find((a) => a.id === id) || null;
    update((state) => {
      state.accessories = state.accessories.filter((a) => a.id !== id);
    });
    return accessory;
  }

  // ——— Trips ———
  function listTrips() {
    return load().trips.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function getTrip(id) {
    const trip = load().trips.find((t) => t.id === id);
    return trip ? migrateTrip(trip) : null;
  }

  function dayAllItemNames(day) {
    const names = [];
    (day?.items || []).forEach((item) => names.push(item.name));
    (day?.events || []).forEach((ev) => {
      (ev.items || []).forEach((item) => names.push(item.name));
    });
    return names;
  }

  function emptyDay(index, startDate) {
    const date = startDate ? addDaysISO(startDate, index) : null;
    return {
      id: uid(),
      label: date ? weekdayName(date) : `Day ${index + 1}`,
      date,
      notes: '',
      outfitIds: [],
      items: [],
      events: [],
    };
  }

  function createTrip({ name, days, startDate }) {
    const id = uid();
    const now = Date.now();
    const dayCount = Math.max(1, Number(days) || 1);
    const start = parseISODate(startDate) ? startDate : null;
    const dayList = Array.from({ length: dayCount }, (_, i) => emptyDay(i, start));
    update((state) => {
      state.trips.unshift({
        id,
        name: (name || 'New trip').trim(),
        days: dayList,
        packed: {},
        excludedStapleIds: [],
        extraStaples: [],
        createdAt: now,
        updatedAt: now,
      });
    });
    return getTrip(id);
  }

  function updateTrip(id, patch) {
    update((state) => {
      const idx = state.trips.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const cur = state.trips[idx];
      state.trips[idx] = {
        ...cur,
        ...patch,
        id: cur.id,
        updatedAt: Date.now(),
      };
    });
    return getTrip(id);
  }

  function deleteTrip(id) {
    update((state) => {
      state.trips = state.trips.filter((t) => t.id !== id);
    });
  }

  function setTripDays(tripId, dayCount, startDate) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const n = Math.max(1, Math.min(30, Number(dayCount) || 1));
    let days = trip.days.slice().map(migrateDay);
    const start = parseISODate(startDate) ? startDate : null;
    if (n > days.length) {
      const lastDated = [...days].reverse().find((d) => d.date);
      const continueFrom = start || lastDated?.date || null;
      const offset = continueFrom && lastDated?.date && !start ? days.length : 0;
      for (let i = days.length; i < n; i++) {
        const next = emptyDay(i);
        if (continueFrom) {
          next.date = addDaysISO(continueFrom, start ? i : i - offset);
          if (isDefaultDayLabel(next.label, i) && next.date) next.label = weekdayName(next.date);
        }
        days.push(next);
      }
    } else if (n < days.length) {
      days = days.slice(0, n);
    }
    if (start) {
      days = days.map((d, i) => {
        const date = addDaysISO(start, i);
        const keepCustom = d.label && !isDefaultDayLabel(d.label, i) && !isWeekdayLabel(d.label);
        return {
          ...d,
          date,
          label: keepCustom ? d.label : weekdayName(date),
        };
      });
    }
    days = days.map((d, i) => migrateDay(d, i));
    return updateTrip(tripId, { days });
  }

  function updateDay(tripId, dayId, patch) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d, i) => {
      if (d.id !== dayId) return d;
      const next = { ...d, ...patch, id: d.id };
      if (patch.date !== undefined) {
        const date = parseISODate(patch.date) ? patch.date : null;
        next.date = date;
        if (date && (isDefaultDayLabel(d.label, i) || isWeekdayLabel(d.label))) {
          next.label = weekdayName(date);
        }
      }
      if (patch.label != null) next.label = String(patch.label).trim() || `Day ${i + 1}`;
      if (patch.notes != null) next.notes = String(patch.notes);
      return next;
    });
    return updateTrip(tripId, { days });
  }

  function applyWeekdayNames(tripId, startDate) {
    const trip = getTrip(tripId);
    if (!trip || !parseISODate(startDate)) return trip;
    const days = trip.days.map((d, i) => {
      const date = addDaysISO(startDate, i);
      return { ...d, date, label: weekdayName(date) };
    });
    return updateTrip(tripId, { days });
  }

  function addEventToDay(tripId, dayId, { name } = {}) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const trimmed = normalizeName(name) || 'Event';
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        events: [...(d.events || []), { id: uid(), name: trimmed, items: [] }],
      };
    });
    return updateTrip(tripId, { days });
  }

  function updateDayEvent(tripId, dayId, eventId, patch) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        events: (d.events || []).map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                name: patch.name != null ? normalizeName(patch.name) || ev.name : ev.name,
                items: patch.items != null ? patch.items : ev.items,
              }
            : ev
        ),
      };
    });
    return updateTrip(tripId, { days });
  }

  function removeEventFromDay(tripId, dayId, eventId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return { ...d, events: (d.events || []).filter((ev) => ev.id !== eventId) };
    });
    return updateTrip(tripId, { days });
  }

  function reorderDayEvents(tripId, dayId, eventIds) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return { ...d, events: spliceReorderById(d.events || [], eventIds) };
    });
    return updateTrip(tripId, { days });
  }

  function reorderDayItems(tripId, dayId, itemIds, eventId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      if (eventId) {
        return {
          ...d,
          events: (d.events || []).map((ev) =>
            ev.id === eventId ? { ...ev, items: spliceReorderById(ev.items || [], itemIds) } : ev
          ),
        };
      }
      return { ...d, items: spliceReorderById(d.items || [], itemIds) };
    });
    return updateTrip(tripId, { days });
  }

  function placeDayItem(tripId, dayId, itemId, destEventId, orderedIds) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const destKey = destEventId ? String(destEventId) : '';
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      let found = null;
      const restItems = (d.items || []).filter((item) => {
        if (item.id === itemId) {
          found = item;
          return false;
        }
        return true;
      });
      const events = (d.events || []).map((ev) => ({
        ...ev,
        items: (ev.items || []).filter((item) => {
          if (item.id === itemId) {
            found = item;
            return false;
          }
          return true;
        }),
      }));
      if (!found) return d;
      const order = Array.isArray(orderedIds) && orderedIds.length ? orderedIds : [itemId];
      if (destKey) {
        const hasDest = events.some((ev) => ev.id === destKey);
        if (!hasDest) {
          return {
            ...d,
            items: spliceReorderById([...restItems, found], order),
            events,
          };
        }
        return {
          ...d,
          items: restItems,
          events: events.map((ev) => {
            if (ev.id !== destKey) return ev;
            return { ...ev, items: spliceReorderById([...ev.items, found], order) };
          }),
        };
      }
      return {
        ...d,
        items: spliceReorderById([...restItems, found], order),
        events,
      };
    });
    return updateTrip(tripId, { days });
  }

  function reorderDayOutfits(tripId, dayId, outfitIds) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      const current = d.outfitIds || [];
      const allowed = new Set(current);
      const next = outfitIds.filter((id) => allowed.has(id));
      current.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      return { ...d, outfitIds: next };
    });
    return updateTrip(tripId, { days });
  }

  function addOutfitToDay(tripId, dayId, outfitId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      const outfitIds = d.outfitIds.includes(outfitId) ? d.outfitIds : [...d.outfitIds, outfitId];
      return { ...d, outfitIds };
    });
    return updateTrip(tripId, { days });
  }

  function removeOutfitFromDay(tripId, dayId, outfitId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return { ...d, outfitIds: d.outfitIds.filter((id) => id !== outfitId) };
    });
    return updateTrip(tripId, { days });
  }

  function addItemToDay(tripId, dayId, { name, eventId } = {}) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const trimmed = normalizeName(name);
    if (!trimmed) return trip;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      const record = { id: uid(), name: trimmed };
      if (eventId) {
        return {
          ...d,
          events: (d.events || []).map((ev) => {
            if (ev.id !== eventId) return ev;
            const already = (ev.items || []).some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
            if (already) return ev;
            return { ...ev, items: [...(ev.items || []), record] };
          }),
        };
      }
      const already = (d.items || []).some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      if (already) return d;
      return { ...d, items: [...(d.items || []), record] };
    });
    return updateTrip(tripId, { days });
  }

  function removeItemFromDay(tripId, dayId, itemId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        items: (d.items || []).filter((item) => item.id !== itemId),
        events: (d.events || []).map((ev) => ({
          ...ev,
          items: (ev.items || []).filter((item) => item.id !== itemId),
        })),
      };
    });
    return updateTrip(tripId, { days });
  }

  function removeItemFromDayByName(tripId, dayId, name, eventId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const key = normalizeName(name).toLowerCase();
    if (!key) return trip;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      if (eventId) {
        return {
          ...d,
          events: (d.events || []).map((ev) =>
            ev.id === eventId
              ? { ...ev, items: (ev.items || []).filter((item) => item.name.toLowerCase() !== key) }
              : ev
          ),
        };
      }
      return {
        ...d,
        items: (d.items || []).filter((item) => item.name.toLowerCase() !== key),
        events: (d.events || []).map((ev) => ({
          ...ev,
          items: (ev.items || []).filter((item) => item.name.toLowerCase() !== key),
        })),
      };
    });
    return updateTrip(tripId, { days });
  }

  function namesMatch(a, b) {
    return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
  }

  function getTripStaples(tripId) {
    const state = load();
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return { active: [], hidden: [] };
    const excluded = new Set(trip.excludedStapleIds || []);
    const active = [
      ...state.staples
        .filter((s) => !excluded.has(s.id))
        .map((s) => ({ ...s, source: 'global' })),
      ...(trip.extraStaples || []).map((s) => ({ ...s, source: 'trip' })),
    ];
    const hidden = state.staples.filter((s) => excluded.has(s.id));
    return { active, hidden };
  }

  function excludeStapleFromTrip(tripId, stapleId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    if ((trip.excludedStapleIds || []).includes(stapleId)) return trip;
    return updateTrip(tripId, {
      excludedStapleIds: [...(trip.excludedStapleIds || []), stapleId],
    });
  }

  function restoreStapleToTrip(tripId, stapleId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    return updateTrip(tripId, {
      excludedStapleIds: (trip.excludedStapleIds || []).filter((id) => id !== stapleId),
    });
  }

  function addTripStaple(tripId, { name, category }) {
    const state = load();
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return { trip: null, action: 'missing' };
    const trimmed = normalizeName(name);
    if (!trimmed) return { trip: getTrip(tripId), action: 'empty' };

    const globalMatch = state.staples.find((s) => namesMatch(s.name, trimmed));
    if (globalMatch) {
      const excluded = new Set(trip.excludedStapleIds || []);
      if (excluded.has(globalMatch.id)) {
        restoreStapleToTrip(tripId, globalMatch.id);
        return { trip: getTrip(tripId), action: 'restored', staple: globalMatch };
      }
      return { trip: getTrip(tripId), action: 'exists', staple: globalMatch };
    }

    const extraMatch = (trip.extraStaples || []).find((s) => namesMatch(s.name, trimmed));
    if (extraMatch) return { trip: getTrip(tripId), action: 'exists', staple: extraMatch };

    const extra = {
      id: uid(),
      name: trimmed,
      category: (category || 'Other').trim() || 'Other',
    };
    updateTrip(tripId, { extraStaples: [...(trip.extraStaples || []), extra] });
    return { trip: getTrip(tripId), action: 'added', staple: extra };
  }

  function removeTripStaple(tripId, stapleId, source) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const packedKey = source === 'trip' ? `trip-staple:${stapleId}` : `staple:${stapleId}`;
    const nextPacked = { ...(trip.packed || {}) };
    delete nextPacked[packedKey];

    if (source === 'trip') {
      return updateTrip(tripId, {
        extraStaples: (trip.extraStaples || []).filter((s) => s.id !== stapleId),
        packed: nextPacked,
      });
    }

    if ((trip.excludedStapleIds || []).includes(stapleId)) {
      return updateTrip(tripId, { packed: nextPacked });
    }
    return updateTrip(tripId, {
      excludedStapleIds: [...(trip.excludedStapleIds || []), stapleId],
      packed: nextPacked,
    });
  }

  function removeTripStaples(tripId, removals) {
    const trip = getTrip(tripId);
    if (!trip || !Array.isArray(removals) || !removals.length) return trip;
    const nextPacked = { ...(trip.packed || {}) };
    const extraIds = new Set();
    const globalIds = new Set(trip.excludedStapleIds || []);
    removals.forEach(({ id, source }) => {
      if (!id) return;
      const packedKey = source === 'trip' ? `trip-staple:${id}` : `staple:${id}`;
      delete nextPacked[packedKey];
      if (source === 'trip') extraIds.add(id);
      else globalIds.add(id);
    });
    return updateTrip(tripId, {
      extraStaples: (trip.extraStaples || []).filter((s) => !extraIds.has(s.id)),
      excludedStapleIds: [...globalIds],
      packed: nextPacked,
    });
  }

  function setPackedKeys(tripId, keys, packed) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const next = { ...(trip.packed || {}) };
    uniqueKeys(keys).forEach((key) => {
      if (packed) next[key] = true;
      else delete next[key];
    });
    return updateTrip(tripId, { packed: next });
  }

  function setPacked(tripId, packedKey, packed) {
    return setPackedKeys(tripId, [packedKey], packed);
  }

  function setOutfitPacked(tripId, outfitId, packed) {
    return setPackedKeys(tripId, outfitPackKeys(getOutfit(outfitId)), packed);
  }

  function sortCategories(cats, order) {
    return cats.slice().sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  /**
   * Build packing list for a trip.
   * Outfits expand into individual pieces per day (repeats shown again).
   * Packed state is shared by item name — and by outfit id when a look has
   * no listed pieces — so checking a repeated outfit on day 1 checks it later.
   * Staples are this trip's list (global minus removals, plus extras).
   */
  function buildPackingList(tripId) {
    const state = load();
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return { dayGroups: [], stapleGroups: [], groups: [], total: 0, packedCount: 0 };

    const outfitMap = new Map(state.outfits.map((o) => [o.id, o]));
    const packed = trip.packed || {};
    const unique = new Map();
    const outfitFirstDay = new Map();

    function remember(key, name, type) {
      if (!unique.has(key)) {
        unique.set(key, { key, name, packed: !!packed[key], type });
      }
      return unique.get(key);
    }

    const dayGroups = (trip.days || []).map((day, index) => {
      const outfits = (day.outfitIds || []).map((oid) => {
        const firstDayLabel = outfitFirstDay.get(oid) || null;
        const isRepeat = outfitFirstDay.has(oid);
        if (!isRepeat) outfitFirstDay.set(oid, displayDayTitle(day, index));

        const outfit = outfitMap.get(oid);
        if (!outfit) {
          return {
            id: oid,
            name: 'Missing outfit',
            missing: true,
            items: [],
            keys: [],
            packed: false,
            packedCount: 0,
            repeat: isRepeat,
            firstDayLabel,
          };
        }

        const keys = outfitPackKeys(outfit);
        if (!(outfit.items || []).length) {
          keys.forEach((key) => remember(key, outfit.name, 'outfit'));
        }
        const items = (outfit.items || []).map((name) => {
          const key = itemKey(name);
          const entry = remember(key, name, 'clothing');
          return {
            key,
            name,
            packed: entry.packed,
            source: outfit.name,
            photoId: findItemPhotoId(name),
          };
        });
        const packedCount = keys.filter((key) => packed[key]).length;
        return {
          id: outfit.id,
          name: outfit.name,
          missing: false,
          items,
          keys,
          packed: keys.length > 0 && packedCount === keys.length,
          packedCount,
          repeat: isRepeat,
          firstDayLabel,
        };
      });

      const extras = [];
      (day.events || []).forEach((ev) => {
        (ev.items || []).forEach((item) => {
          const key = itemKey(item.name);
          const entry = remember(key, item.name, 'day');
          extras.push({
            id: item.id,
            key,
            name: item.name,
            packed: entry.packed,
            photoId: findItemPhotoId(item.name),
            eventId: ev.id,
            eventName: ev.name,
          });
        });
      });
      (day.items || []).forEach((item) => {
        const key = itemKey(item.name);
        const entry = remember(key, item.name, 'day');
        extras.push({
          id: item.id,
          key,
          name: item.name,
          packed: entry.packed,
          photoId: findItemPhotoId(item.name),
        });
      });

      return {
        id: day.id,
        label: displayDayTitle(day, index),
        date: day.date || null,
        notes: day.notes || '',
        outfits,
        extras,
        events: day.events || [],
      };
    });

    const excluded = new Set(trip.excludedStapleIds || []);
    const staplesByCat = new Map();

    function pushStaple(staple, type) {
      const cat = staple.category || 'Other';
      const key = type === 'trip' ? `trip-staple:${staple.id}` : `staple:${staple.id}`;
      remember(key, staple.name, 'staple');
      if (!staplesByCat.has(cat)) staplesByCat.set(cat, []);
      staplesByCat.get(cat).push({
        id: staple.id,
        key,
        name: staple.name,
        note: type === 'trip' ? 'This trip only' : null,
        type: 'staple',
        source: type === 'trip' ? 'trip' : 'global',
        category: cat,
        packed: !!packed[key],
        photoId: staple.photoId || findItemPhotoId(staple.name),
      });
    }

    state.staples.forEach((s) => {
      if (!excluded.has(s.id)) pushStaple(s, 'global');
    });
    (trip.extraStaples || []).forEach((s) => pushStaple(s, 'trip'));

    const stapleGroups = sortCategories([...staplesByCat.keys()], STAPLE_CAT_ORDER).map((cat) => ({
      id: `cat-${cat}`,
      label: cat,
      items: staplesByCat.get(cat),
    }));

    // Flat groups kept for older callers / trip cards
    const clothingFromDays = [];
    dayGroups.forEach((day) => {
      day.outfits.forEach((outfit) => {
        if (outfit.items.length) clothingFromDays.push(...outfit.items);
        else if (!outfit.missing && outfit.keys?.length) {
          clothingFromDays.push({
            key: outfit.keys[0],
            name: outfit.name,
            packed: outfit.packed,
            source: outfit.name,
          });
        }
      });
      clothingFromDays.push(...day.extras);
    });
    const groups = [];
    if (clothingFromDays.length) {
      const seen = new Set();
      const uniqueClothing = [];
      clothingFromDays.forEach((item) => {
        if (seen.has(item.key)) return;
        seen.add(item.key);
        uniqueClothing.push({ ...item, packed: !!packed[item.key] });
      });
      groups.push({ id: 'clothing', label: 'From outfits', items: uniqueClothing });
    }
    stapleGroups.forEach((g) => groups.push(g));

    const all = [...unique.values()];
    return {
      dayGroups,
      stapleGroups,
      groups,
      total: all.length,
      packedCount: all.filter((i) => i.packed).length,
    };
  }

  return {
    uid,
    getState,
    getPrefs,
    setPref,
    setPrefs,
    isHintHidden,
    hideHint,
    resetHints,
    listStapleCategories,
    listAccessoryCategories,
    listAccessorySubgroups,
    listAccessorySections,
    accessorySubgroup,
    listPickerTabs,
    isCustomClothingTab,
    isCustomClothingGroup,
    addClothingTab,
    renameClothingTab,
    removeClothingTab,
    addClothingSubgroup,
    renameClothingSubgroup,
    removeClothingSubgroup,
    addAccessoryCategory,
    renameAccessoryCategory,
    removeAccessoryCategory,
    addAccessorySubgroup,
    renameAccessorySubgroup,
    removeAccessorySubgroup,
    getSplitView,
    setSplitView,
    weekdayName,
    formatDayDate,
    displayDayTitle,
    parseISODate,
    addDaysISO,
    DAY_EVENT_PRESETS,
    listClothingTabs,
    listClothingSubgroups,
    listClothingItems,
    listClothingSections,
    clothingSubgroup,
    clothingPhotoId,
    setClothingPhoto,
    findItemPhotoId,
    clothingGroupsFor,
    searchClothing,
    isCustomClothingItem,
    addClothingItem,
    removeClothingItem,
    renameClothingItem,
    reorderClothingItems,
    restoreClothingDefaults,
    clothingCatalogSummary,
    restoreMissingDefaults,
    exportBackup,
    importBackup,
    clearAllPacked,
    resetAllData,
    itemKey,
    outfitKey,
    outfitPackKeys,
    listOutfits,
    getOutfit,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    listStaples,
    addStaple,
    updateStaple,
    deleteStaple,
    reorderStaples,
    listAccessories,
    addAccessory,
    updateAccessory,
    deleteAccessory,
    reorderAccessories,
    listTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    setTripDays,
    updateDay,
    applyWeekdayNames,
    addEventToDay,
    updateDayEvent,
    removeEventFromDay,
    reorderDayEvents,
    reorderDayItems,
    placeDayItem,
    reorderDayOutfits,
    addOutfitToDay,
    removeOutfitFromDay,
    addItemToDay,
    removeItemFromDay,
    removeItemFromDayByName,
    dayAllItemNames,
    getTripStaples,
    excludeStapleFromTrip,
    restoreStapleToTrip,
    addTripStaple,
    removeTripStaple,
    removeTripStaples,
    setPacked,
    setPackedKeys,
    setOutfitPacked,
    buildPackingList,
    STAPLE_CAT_ORDER,
    ACCESSORY_CAT_ORDER,
  };
})();
