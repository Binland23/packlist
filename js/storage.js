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
    { name: 'Phone charger', category: 'Tech' },
    { name: 'Headphones', category: 'Tech' },
    { name: 'Passport / ID', category: 'Documents' },
    { name: 'Wallet', category: 'Documents' },
  ];

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
      trips: [],
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
      const parsed = JSON.parse(raw);
      return {
        outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
        staples: Array.isArray(parsed.staples) ? parsed.staples : emptyState().staples,
        trips: Array.isArray(parsed.trips) ? parsed.trips : [],
      };
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
      // Remove outfit refs from trips
      state.trips.forEach((trip) => {
        trip.days.forEach((day) => {
          day.outfitIds = (day.outfitIds || []).filter((oid) => oid !== id);
        });
      });
    });
    return outfit;
  }

  // ——— Staples ———
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

  // ——— Trips ———
  function listTrips() {
    return load().trips.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function getTrip(id) {
    return load().trips.find((t) => t.id === id) || null;
  }

  function createTrip({ name, days }) {
    const id = uid();
    const now = Date.now();
    const dayCount = Math.max(1, Number(days) || 1);
    const dayList = Array.from({ length: dayCount }, (_, i) => ({
      id: uid(),
      label: `Day ${i + 1}`,
      outfitIds: [],
    }));
    update((state) => {
      state.trips.unshift({
        id,
        name: (name || 'New trip').trim(),
        days: dayList,
        packed: {},
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
        days.push({ id: uid(), label: `Day ${i + 1}`, outfitIds: [] });
      }
    } else if (n < days.length) {
      days = days.slice(0, n);
    }
    days = days.map((d, i) => ({ ...d, label: d.label || `Day ${i + 1}` }));
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

  function setPacked(tripId, itemKey, packed) {
    const trip = getTrip(tripId);
    if (!trip) return null;
    const next = { ...(trip.packed || {}) };
    if (packed) next[itemKey] = true;
    else delete next[itemKey];
    return updateTrip(tripId, { packed: next });
  }

  /**
   * Build packing list for a trip.
   * Outfit items are de-duplicated by case-insensitive name but keep source labels.
   * Staples always included.
   */
  function buildPackingList(tripId) {
    const state = load();
    const trip = state.trips.find((t) => t.id === tripId);
    if (!trip) return { groups: [], total: 0, packedCount: 0 };

    const outfitMap = new Map(state.outfits.map((o) => [o.id, o]));
    const itemSources = new Map(); // lower name -> { name, sources: Set }

    trip.days.forEach((day) => {
      (day.outfitIds || []).forEach((oid) => {
        const outfit = outfitMap.get(oid);
        if (!outfit) return;
        (outfit.items || []).forEach((item) => {
          const key = item.toLowerCase();
          if (!itemSources.has(key)) {
            itemSources.set(key, { name: item, sources: new Set(), type: 'clothing' });
          }
          itemSources.get(key).sources.add(outfit.name);
        });
      });
    });

    const clothingItems = [...itemSources.values()]
      .map((entry) => ({
        key: `cloth:${entry.name.toLowerCase()}`,
        name: entry.name,
        note: [...entry.sources].join(', '),
        type: 'clothing',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const staplesByCat = new Map();
    state.staples.forEach((s) => {
      const cat = s.category || 'Other';
      if (!staplesByCat.has(cat)) staplesByCat.set(cat, []);
      staplesByCat.get(cat).push({
        key: `staple:${s.id}`,
        name: s.name,
        note: null,
        type: 'staple',
        category: cat,
      });
    });

    const packed = trip.packed || {};
    const groups = [];

    if (clothingItems.length) {
      groups.push({
        id: 'clothing',
        label: 'From outfits',
        items: clothingItems.map((i) => ({ ...i, packed: !!packed[i.key] })),
      });
    }

    // Stable category order
    const catOrder = ['Toiletries', 'Basics', 'Tech', 'Documents', 'Other'];
    const cats = [...staplesByCat.keys()].sort((a, b) => {
      const ia = catOrder.indexOf(a);
      const ib = catOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    cats.forEach((cat) => {
      groups.push({
        id: `cat-${cat}`,
        label: cat,
        items: staplesByCat.get(cat).map((i) => ({ ...i, packed: !!packed[i.key] })),
      });
    });

    const all = groups.flatMap((g) => g.items);
    return {
      groups,
      total: all.length,
      packedCount: all.filter((i) => i.packed).length,
    };
  }

  return {
    uid,
    getState,
    listOutfits,
    getOutfit,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    listStaples,
    addStaple,
    deleteStaple,
    reorderStaples,
    listTrips,
    getTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    setTripDays,
    addOutfitToDay,
    removeOutfitFromDay,
    setPacked,
    buildPackingList,
  };
})();
