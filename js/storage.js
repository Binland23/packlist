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
    { name: 'Belt', category: 'Other' },
    { name: 'Sunglasses', category: 'Other' },
    { name: 'Crossbody bag', category: 'Bags' },
    { name: 'Tote bag', category: 'Bags' },
    { name: 'Hair ties', category: 'Other' },
    { name: 'Scarf', category: 'Other' },
  ];

  const STAPLE_CAT_ORDER = ['Toiletries', 'Basics', 'Tech', 'Documents', 'Other'];
  const ACCESSORY_CAT_ORDER = ['Jewelry', 'Bags', 'Shoes', 'Other'];
  const THEME_IDS = ['linen', 'midnight', 'harbor', 'ink', 'orchard', 'ember'];

  const DEFAULT_PREFS = {
    clothingGender: 'women',
    theme: 'linen',
    textSize: 'default',
    compactLists: false,
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
  };

  function mergePrefs(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const hiddenHints = p.hiddenHints && typeof p.hiddenHints === 'object' ? { ...p.hiddenHints } : {};
    const stapleCategories = Array.isArray(p.stapleCategories) && p.stapleCategories.length
      ? p.stapleCategories.map((c) => String(c).trim()).filter(Boolean)
      : STAPLE_CAT_ORDER.slice();
    const accessoryCategories = Array.isArray(p.accessoryCategories) && p.accessoryCategories.length
      ? p.accessoryCategories.map((c) => String(c).trim()).filter(Boolean)
      : ACCESSORY_CAT_ORDER.slice();
    const days = Math.max(1, Math.min(30, Number(p.defaultTripDays) || 3));
    return {
      ...DEFAULT_PREFS,
      ...p,
      clothingGender: p.clothingGender === 'men' ? 'men' : 'women',
      theme: THEME_IDS.includes(p.theme) ? p.theme : 'linen',
      textSize: ['default', 'large', 'xlarge'].includes(p.textSize) ? p.textSize : 'default',
      compactLists: !!p.compactLists,
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
      prefs: { ...DEFAULT_PREFS, hiddenHints: {}, stapleCategories: STAPLE_CAT_ORDER.slice(), accessoryCategories: ACCESSORY_CAT_ORDER.slice() },
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

  function migrateTrip(trip) {
    return {
      ...trip,
      excludedStapleIds: Array.isArray(trip.excludedStapleIds) ? trip.excludedStapleIds : [],
      extraStaples: Array.isArray(trip.extraStaples) ? trip.extraStaples : [],
      packed: migratePacked(trip.packed),
      days: (trip.days || []).map((d) => ({
        ...d,
        outfitIds: Array.isArray(d.outfitIds) ? d.outfitIds : [],
        items: Array.isArray(d.items) ? d.items : [],
      })),
    };
  }

  function migrateState(parsed) {
    const defaults = emptyState();
    return {
      outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
      staples: Array.isArray(parsed.staples) ? parsed.staples : defaults.staples,
      accessories: Array.isArray(parsed.accessories) ? parsed.accessories : defaults.accessories,
      trips: Array.isArray(parsed.trips) ? parsed.trips.map(migrateTrip) : [],
      prefs: mergePrefs(parsed.prefs),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const state = emptyState();
        save(state);
        return state;
      }
      return migrateState(JSON.parse(raw));
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

  function addStaple({ name, category }) {
    const id = uid();
    update((state) => {
      state.staples.push({
        id,
        name: (name || '').trim(),
        category: (category || 'Other').trim() || 'Other',
      });
    });
    return listStaples().find((s) => s.id === id);
  }

  function deleteStaple(id) {
    update((state) => {
      state.staples = state.staples.filter((s) => s.id !== id);
      state.trips.forEach((trip) => {
        trip.excludedStapleIds = (trip.excludedStapleIds || []).filter((sid) => sid !== id);
      });
    });
  }

  function reorderStaples(ids) {
    update((state) => {
      const map = new Map(state.staples.map((s) => [s.id, s]));
      const next = ids.map((id) => map.get(id)).filter(Boolean);
      const leftovers = state.staples.filter((s) => !ids.includes(s.id));
      state.staples = [...next, ...leftovers];
    });
  }

  // ——— Accessories (reusable bank) ———
  function listAccessories() {
    return load().accessories.slice();
  }

  function addAccessory({ name, category }) {
    const trimmed = normalizeName(name);
    if (!trimmed) return null;
    const existing = listAccessories().find(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const id = uid();
    update((state) => {
      state.accessories.push({
        id,
        name: trimmed,
        category: (category || 'Other').trim() || 'Other',
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
      state.accessories[idx] = {
        ...cur,
        name,
        category:
          patch.category != null
            ? String(patch.category).trim() || 'Other'
            : cur.category,
      };
    });
    return listAccessories().find((a) => a.id === id) || null;
  }

  function deleteAccessory(id) {
    update((state) => {
      state.accessories = state.accessories.filter((a) => a.id !== id);
    });
  }

  // ——— Trips ———
  function listTrips() {
    return load().trips.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function getTrip(id) {
    const trip = load().trips.find((t) => t.id === id);
    return trip ? migrateTrip(trip) : null;
  }

  function emptyDay(index) {
    return {
      id: uid(),
      label: `Day ${index + 1}`,
      outfitIds: [],
      items: [],
    };
  }

  function createTrip({ name, days }) {
    const id = uid();
    const now = Date.now();
    const dayCount = Math.max(1, Number(days) || 1);
    const dayList = Array.from({ length: dayCount }, (_, i) => emptyDay(i));
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

  function setTripDays(tripId, dayCount) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const n = Math.max(1, Math.min(30, Number(dayCount) || 1));
    let days = trip.days.slice();
    if (n > days.length) {
      for (let i = days.length; i < n; i++) {
        days.push(emptyDay(i));
      }
    } else if (n < days.length) {
      days = days.slice(0, n);
    }
    days = days.map((d, i) => ({
      ...d,
      label: d.label || `Day ${i + 1}`,
      items: Array.isArray(d.items) ? d.items : [],
    }));
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

  function addItemToDay(tripId, dayId, { name }) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const trimmed = normalizeName(name);
    if (!trimmed) return trip;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      const already = (d.items || []).some(
        (item) => item.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (already) return d;
      return {
        ...d,
        items: [...(d.items || []), { id: uid(), name: trimmed }],
      };
    });
    return updateTrip(tripId, { days });
  }

  function removeItemFromDay(tripId, dayId, itemId) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const days = trip.days.map((d) => {
      if (d.id !== dayId) return d;
      return { ...d, items: (d.items || []).filter((item) => item.id !== itemId) };
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
    if (source === 'trip') {
      return updateTrip(tripId, {
        extraStaples: (trip.extraStaples || []).filter((s) => s.id !== stapleId),
      });
    }
    return excludeStapleFromTrip(tripId, stapleId);
  }

  function setPacked(tripId, packedKey, packed) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const next = { ...(trip.packed || {}) };
    if (packed) next[packedKey] = true;
    else delete next[packedKey];
    return updateTrip(tripId, { packed: next });
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
   * Outfit + day items expand per day (repeats shown again).
   * Packed state is shared by item name across every day it appears.
   * Staples are this trip's list (global minus removals, plus extras).
   */
  function buildPackingList(tripId) {
    const state = load();
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return { dayGroups: [], stapleGroups: [], groups: [], total: 0, packedCount: 0 };

    const outfitMap = new Map(state.outfits.map((o) => [o.id, o]));
    const packed = trip.packed || {};
    const unique = new Map();

    function remember(key, name, type) {
      if (!unique.has(key)) {
        unique.set(key, { key, name, packed: !!packed[key], type });
      }
      return unique.get(key);
    }

    const dayGroups = (trip.days || []).map((day) => {
      const outfits = (day.outfitIds || []).map((oid) => {
        const outfit = outfitMap.get(oid);
        if (!outfit) {
          return { id: oid, name: 'Missing outfit', missing: true, items: [] };
        }
        const items = (outfit.items || []).map((name) => {
          const key = itemKey(name);
          const entry = remember(key, name, 'clothing');
          return { key, name, packed: entry.packed, source: outfit.name };
        });
        return { id: outfit.id, name: outfit.name, missing: false, items };
      });

      const extras = (day.items || []).map((item) => {
        const key = itemKey(item.name);
        const entry = remember(key, item.name, 'day');
        return { id: item.id, key, name: item.name, packed: entry.packed };
      });

      return {
        id: day.id,
        label: day.label,
        outfits,
        extras,
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
        key,
        name: staple.name,
        note: type === 'trip' ? 'This trip only' : null,
        type: 'staple',
        category: cat,
        packed: !!packed[key],
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
      day.outfits.forEach((outfit) => clothingFromDays.push(...outfit.items));
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
    restoreMissingDefaults,
    exportBackup,
    importBackup,
    clearAllPacked,
    resetAllData,
    itemKey,
    listOutfits,
    getOutfit,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    listStaples,
    addStaple,
    deleteStaple,
    reorderStaples,
    listAccessories,
    addAccessory,
    updateAccessory,
    deleteAccessory,
    listTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    setTripDays,
    addOutfitToDay,
    removeOutfitFromDay,
    addItemToDay,
    removeItemFromDay,
    getTripStaples,
    excludeStapleFromTrip,
    restoreStapleToTrip,
    addTripStaple,
    removeTripStaple,
    setPacked,
    buildPackingList,
    STAPLE_CAT_ORDER,
    ACCESSORY_CAT_ORDER,
  };
})();
