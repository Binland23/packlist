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
    clothingCatalog: { women: {}, men: {} },
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
    const clothingCatalog = normalizeClothingCatalog(p.clothingCatalog);
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
      clothingCatalog,
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
    return { extras: [], hidden: [] };
  }

  function normalizeClothingPatch(raw) {
    if (!raw || typeof raw !== 'object') return emptyClothingPatch();
    return {
      extras: uniqueItemNames(raw.extras),
      hidden: uniqueItemNames(raw.hidden),
    };
  }

  function normalizeClothingCatalog(raw) {
    const out = { women: {}, men: {} };
    if (!raw || typeof raw !== 'object') return out;
    ['women', 'men'].forEach((gender) => {
      const src = raw[gender] && typeof raw[gender] === 'object' ? raw[gender] : {};
      Object.keys(src).forEach((tab) => {
        const patch = normalizeClothingPatch(src[tab]);
        if (patch.extras.length || patch.hidden.length) out[gender][tab] = patch;
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
    if (!next.extras.length && !next.hidden.length) delete catalog[g][tab];
    else catalog[g][tab] = next;
    setPref('clothingCatalog', catalog);
    return next;
  }

  function listClothingTabs(gender) {
    return ClothingCatalog.groupNamesFor(clothingGender(gender));
  }

  function listClothingItems(gender, tab) {
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
    return [...extras, ...kept];
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
    return ClothingCatalog.searchAll(clothingGender(gender), query, clothingGroupsFor(gender));
  }

  function isCustomClothingItem(gender, tab, name) {
    const key = normalizeName(name).toLowerCase();
    if (!key) return false;
    return getClothingPatch(gender, tab).extras.some((n) => n.toLowerCase() === key);
  }

  function addClothingItem(gender, tab, name) {
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
    if (hiddenIdx >= 0) {
      patch.hidden.splice(hiddenIdx, 1);
      const defaults = ClothingCatalog.pillsFor(g, tab) || [];
      if (!defaults.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.extras.push(trimmed);
      }
      setClothingPatch(g, tab, patch);
      return { action: 'restored', name: trimmed };
    }
    patch.extras.push(trimmed);
    setClothingPatch(g, tab, patch);
    return { action: 'added', name: trimmed };
  }

  function removeClothingItem(gender, tab, name) {
    const g = clothingGender(gender);
    const trimmed = normalizeName(name);
    if (!trimmed) return { action: 'empty' };
    const patch = getClothingPatch(g, tab);
    const extraIdx = patch.extras.findIndex((n) => n.toLowerCase() === trimmed.toLowerCase());
    if (extraIdx >= 0) {
      patch.extras.splice(extraIdx, 1);
      setClothingPatch(g, tab, patch);
      return { action: 'removed', name: trimmed };
    }
    const defaults = ClothingCatalog.pillsFor(g, tab) || [];
    if (defaults.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      if (!patch.hidden.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
        patch.hidden.push(trimmed);
      }
      setClothingPatch(g, tab, patch);
      return { action: 'hidden', name: trimmed };
    }
    return { action: 'missing', name: trimmed };
  }

  function renameClothingItem(gender, fromTab, oldName, newName, toTab) {
    const g = clothingGender(gender);
    const destTab = toTab || fromTab;
    const tabs = listClothingTabs(g);
    if (!tabs.includes(fromTab) || !tabs.includes(destTab)) return { action: 'invalid' };
    const trimmed = normalizeName(newName);
    if (!trimmed) return { action: 'empty' };
    const sameSlot =
      fromTab === destTab && normalizeName(oldName).toLowerCase() === trimmed.toLowerCase();
    if (sameSlot) return { action: 'unchanged', name: trimmed };

    const destItems = listClothingItems(g, destTab);
    const clash = destItems.some(
      (n) =>
        n.toLowerCase() === trimmed.toLowerCase() &&
        n.toLowerCase() !== normalizeName(oldName).toLowerCase()
    );
    if (clash) return { action: 'exists', name: trimmed };

    removeClothingItem(g, fromTab, oldName);
    const added = addClothingItem(g, destTab, trimmed);
    if (added.action === 'exists') return added;
    return { action: 'renamed', name: trimmed, tab: destTab };
  }

  function restoreClothingDefaults() {
    const catalog = normalizeClothingCatalog(getPrefs().clothingCatalog);
    let restored = 0;
    ['women', 'men'].forEach((g) => {
      Object.keys(catalog[g] || {}).forEach((tab) => {
        restored += (catalog[g][tab].hidden || []).length;
        catalog[g][tab] = { extras: catalog[g][tab].extras || [], hidden: [] };
        if (!catalog[g][tab].extras.length) delete catalog[g][tab];
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

    const dayGroups = (trip.days || []).map((day) => {
      const outfits = (day.outfitIds || []).map((oid) => {
        const firstDayLabel = outfitFirstDay.get(oid) || null;
        const isRepeat = outfitFirstDay.has(oid);
        if (!isRepeat) outfitFirstDay.set(oid, day.label);

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
          return { key, name, packed: entry.packed, source: outfit.name };
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
    listClothingTabs,
    listClothingItems,
    clothingGroupsFor,
    searchClothing,
    isCustomClothingItem,
    addClothingItem,
    removeClothingItem,
    renameClothingItem,
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
    setPackedKeys,
    setOutfitPacked,
    buildPackingList,
    STAPLE_CAT_ORDER,
    ACCESSORY_CAT_ORDER,
  };
})();
