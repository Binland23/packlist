/**
 * Clothing category catalog for the item picker.
 * Women / Men lists, grouped like a closet taxonomy.
 */
const ClothingCatalog = (() => {
  const WOMEN = {
    Tops: [
      'T-shirt',
      'Top',
      'Blouse',
      'Shirt',
      'Sweater',
      'Turtleneck',
      'Crop top',
      'Tank top',
      'Basic t-shirt',
      'Long sleeve top',
      'Graphic tee',
      'Dress shirt',
      'Bodysuit',
      'Thin long sleeve shirt',
      'Long sleeve t-shirt',
      'Casual shirt',
      'Long sleeve blouse',
      'Short sleeve top',
      'Polo shirt',
      'Oversized t-shirt',
      'Sleeveless top',
      'Basic top',
    ],
    Layers: {
      Sweaters: ['Cardigan', 'Hoodie', 'Fleece'],
      Jackets: ['Blazer', 'Jacket', 'Vest', 'Denim jacket', 'Windbreaker', 'Overshirt'],
      Coats: ['Coat', 'Trench coat', 'Puffer'],
    },
    Bottoms: [
      'Jeans',
      'Pants',
      'Trousers',
      'Shorts',
      'Skirt',
      'Leggings',
      'Culottes',
      'Joggers',
      'Wide-leg pants',
      'Mini skirt',
      'Midi skirt',
      'Maxi skirt',
      'Bike shorts',
    ],
    Dresses: [
      'Dress',
      'Mini dress',
      'Midi dress',
      'Maxi dress',
      'Sundress',
      'Cocktail dress',
      'Shirt dress',
      'Jumpsuit',
      'Romper',
      'Slip dress',
    ],
  };

  const MEN = {
    Tops: [
      'T-shirt',
      'Shirt',
      'Polo',
      'Sweater',
      'Tank',
      'Graphic tee',
      'Dress shirt',
      'Long sleeve shirt',
      'Henley',
      'Hoodie',
      'Oversized t-shirt',
    ],
    Layers: {
      Sweaters: ['Cardigan', 'Fleece'],
      Jackets: ['Jacket', 'Blazer', 'Vest', 'Overshirt', 'Windbreaker', 'Denim jacket'],
      Coats: ['Coat', 'Puffer'],
    },
    Bottoms: [
      'Jeans',
      'Chinos',
      'Shorts',
      'Trousers',
      'Joggers',
      'Sweatpants',
      'Dress pants',
    ],
    Suits: [
      'Suit',
      'Suit jacket',
      'Suit pants',
      'Tuxedo',
      'Waistcoat',
    ],
  };

  const ACCESSORY_TABS = {
    Jewelry: ['Earrings', 'Necklace', 'Bracelet', 'Ring', 'Watch', 'Hoops', 'Studs'],
    Bags: ['Tote bag', 'Crossbody bag', 'Clutch', 'Backpack', 'Belt bag'],
    Shoes: [
      'Sneakers',
      'Sandals',
      'Heels',
      'Flats',
      'Boots',
      'Ankle boots',
      'Loafers',
      'Slides',
      'Walking shoes',
      'Dress shoes',
    ],
    Other: ['Belt', 'Sunglasses', 'Hat', 'Scarf', 'Hair ties', 'Hair clip'],
  };

  function flattenGroup(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') {
      return Object.values(value).flatMap((items) => (Array.isArray(items) ? items : []));
    }
    return [];
  }

  function groupsFor(gender) {
    return gender === 'men' ? MEN : WOMEN;
  }

  function groupNamesFor(gender) {
    return Object.keys(groupsFor(gender));
  }

  function tabsFor(gender) {
    return [...groupNamesFor(gender), 'Accessories'];
  }

  function pillsFor(gender, tab) {
    if (tab === 'Accessories') return null;
    const groups = groupsFor(gender);
    return flattenGroup(groups[tab]);
  }

  function subgroupNamesFor(gender, tab) {
    const value = groupsFor(gender)[tab];
    if (value && !Array.isArray(value) && typeof value === 'object') return Object.keys(value);
    return [];
  }

  function pillsBySubgroup(gender, tab) {
    const value = groupsFor(gender)[tab];
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    const out = {};
    Object.keys(value).forEach((sub) => {
      out[sub] = Array.isArray(value[sub]) ? value[sub].slice() : [];
    });
    return out;
  }

  function defaultSubgroup(gender, tab, name) {
    const groups = pillsBySubgroup(gender, tab);
    if (!groups) return null;
    const key = String(name || '').trim().toLowerCase();
    if (!key) return null;
    const found = Object.keys(groups).find((sub) =>
      groups[sub].some((item) => item.toLowerCase() === key)
    );
    return found || null;
  }

  function searchAll(gender, query, clothingGroups) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    const groups = clothingGroups && typeof clothingGroups === 'object' ? clothingGroups : groupsFor(gender);
    Object.entries(groups).forEach(([group, items]) => {
      if (items && !Array.isArray(items) && typeof items === 'object') {
        Object.entries(items).forEach(([sub, list]) => {
          (list || []).forEach((name) => {
            if (name.toLowerCase().includes(q)) hits.push({ name, group, sub });
          });
        });
        return;
      }
      (items || []).forEach((name) => {
        if (name.toLowerCase().includes(q)) hits.push({ name, group });
      });
    });
    Object.entries(ACCESSORY_TABS).forEach(([group, items]) => {
      items.forEach((name) => {
        if (name.toLowerCase().includes(q)) hits.push({ name, group });
      });
    });
    return hits;
  }

  return {
    groupsFor,
    groupNamesFor,
    tabsFor,
    pillsFor,
    subgroupNamesFor,
    pillsBySubgroup,
    defaultSubgroup,
    searchAll,
    ACCESSORY_TABS,
  };
})();
