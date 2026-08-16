/**
 * Clothing category catalog for the item picker.
 * Women / Men lists, grouped like a closet taxonomy.
 * Active = swim + workout; Intimates = special bras/underwear/sleep
 * that belong on an outfit (trip Basics still cover bulk underwear/socks).
 */
const ClothingCatalog = (() => {
  const WOMEN = {
    Tops: {
      'Tees short sleeve': [
        'T-shirt',
        'Basic t-shirt',
        'Graphic tee',
        'Oversized t-shirt',
        'Polo shirt',
      ],
      'Tees long sleeve': [
        'Long sleeve t-shirt',
        'Long sleeve top',
        'Thin long sleeve shirt',
      ],
      'Blouses short sleeve': [
        'Blouse',
        'Top',
        'Crop top',
        'Tank top',
        'Short sleeve top',
        'Sleeveless top',
        'Basic top',
        'Casual shirt',
      ],
      'Blouses long sleeve': [
        'Shirt',
        'Dress shirt',
        'Long sleeve blouse',
        'Bodysuit',
      ],
      Sweatshirts: ['Sweater', 'Sweatshirt', 'Turtleneck'],
    },
    Layers: {
      Sweaters: ['Cardigan', 'Hoodie', 'Fleece'],
      Blazers: ['Blazer'],
      Jackets: ['Jacket', 'Denim jacket', 'Windbreaker', 'Overshirt'],
      Coats: ['Coat', 'Trench coat', 'Puffer'],
      Vests: ['Vest'],
    },
    Bottoms: {
      Jeans: ['Jeans'],
      Pants: ['Pants', 'Trousers', 'Joggers', 'Wide-leg pants', 'Culottes'],
      Shorts: ['Shorts', 'Bike shorts'],
      Leggings: ['Leggings'],
      Skirts: ['Skirt', 'Mini skirt', 'Midi skirt', 'Maxi skirt'],
    },
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
    Active: {
      Swim: [
        'One-piece swimsuit',
        'Bikini top',
        'Bikini bottom',
        'Swim shorts',
        'Cover-up',
        'Rash guard',
      ],
      Workout: [
        'Sports bra',
        'Workout top',
        'Workout tank',
        'Workout shorts',
        'Athletic leggings',
        'Track pants',
      ],
    },
    Intimates: {
      Bras: [
        'Everyday bra',
        'Strapless bra',
        'Convertible bra',
        'Backless bra',
        'Bralette',
      ],
      Underwear: ['Underwear', 'Thong', 'Shapewear', 'Slip'],
      Sleep: ['Pajamas', 'Sleep shirt', 'Nightgown', 'Robe'],
    },
  };

  const MEN = {
    Tops: {
      'Tees short sleeve': [
        'T-shirt',
        'Polo',
        'Tank',
        'Graphic tee',
        'Oversized t-shirt',
      ],
      'Tees long sleeve': ['Long sleeve shirt', 'Henley'],
      'Blouses short sleeve': ['Shirt'],
      'Blouses long sleeve': ['Dress shirt'],
      Sweatshirts: ['Sweater', 'Hoodie'],
    },
    Layers: {
      Sweaters: ['Cardigan', 'Fleece'],
      Blazers: ['Blazer'],
      Jackets: ['Jacket', 'Overshirt', 'Windbreaker', 'Denim jacket'],
      Coats: ['Coat', 'Puffer'],
      Vests: ['Vest'],
    },
    Bottoms: {
      Jeans: ['Jeans'],
      Pants: ['Chinos', 'Trousers', 'Joggers', 'Sweatpants', 'Dress pants'],
      Shorts: ['Shorts'],
      Leggings: [],
      Skirts: [],
    },
    Suits: [
      'Suit',
      'Suit jacket',
      'Suit pants',
      'Tuxedo',
      'Waistcoat',
    ],
    Active: {
      Swim: ['Swim trunks', 'Board shorts', 'Swim briefs', 'Rash guard'],
      Workout: [
        'Workout tee',
        'Workout tank',
        'Workout shorts',
        'Compression shorts',
        'Joggers',
        'Track pants',
      ],
    },
    Intimates: {
      Underwear: ['Underwear', 'Boxers', 'Briefs'],
      Sleep: ['Pajamas', 'Sleep pants', 'Robe'],
    },
  };

  const ACCESSORY_TABS = {
    Jewelry: ['Earrings', 'Necklace', 'Bracelet', 'Ring', 'Watch', 'Hoops', 'Studs'],
    Bags: ['Tote bag', 'Crossbody bag', 'Clutch', 'Backpack', 'Belt bag'],
    Shoes: {
      Sandals: ['Sandals', 'Slides'],
      Sneakers: ['Sneakers', 'Walking shoes'],
      Flats: ['Flats', 'Loafers'],
      Heels: ['Heels', 'Dress shoes'],
      Boots: ['Boots', 'Ankle boots'],
    },
    Other: ['Belt', 'Sunglasses', 'Hat', 'Scarf', 'Hair ties', 'Hair clip'],
  };

  function flattenGroup(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') {
      return Object.values(value).flatMap((items) => (Array.isArray(items) ? items : []));
    }
    return [];
  }

  function subgroupKeys(value) {
    if (value && !Array.isArray(value) && typeof value === 'object') return Object.keys(value);
    return [];
  }

  function pillsFromSubgroups(value) {
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    const out = {};
    Object.keys(value).forEach((sub) => {
      out[sub] = Array.isArray(value[sub]) ? value[sub].slice() : [];
    });
    return out;
  }

  function defaultSubIn(groups, name) {
    if (!groups) return null;
    const key = String(name || '').trim().toLowerCase();
    if (!key) return null;
    const found = Object.keys(groups).find((sub) =>
      groups[sub].some((item) => item.toLowerCase() === key)
    );
    return found || null;
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
    return subgroupKeys(groupsFor(gender)[tab]);
  }

  function pillsBySubgroup(gender, tab) {
    return pillsFromSubgroups(groupsFor(gender)[tab]);
  }

  function defaultSubgroup(gender, tab, name) {
    return defaultSubIn(pillsBySubgroup(gender, tab), name);
  }

  function accessorySubgroupsFor(category) {
    return subgroupKeys(ACCESSORY_TABS[category]);
  }

  function accessoryPillsBySubgroup(category) {
    return pillsFromSubgroups(ACCESSORY_TABS[category]);
  }

  function defaultAccessorySubgroup(category, name) {
    return defaultSubIn(accessoryPillsBySubgroup(category), name);
  }

  function accessoryPillsFor(category) {
    return flattenGroup(ACCESSORY_TABS[category]);
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
    accessorySubgroupsFor,
    accessoryPillsBySubgroup,
    defaultAccessorySubgroup,
    accessoryPillsFor,
    searchAll,
    ACCESSORY_TABS,
  };
})();
