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
    Layers: [
      'Cardigan',
      'Blazer',
      'Jacket',
      'Coat',
      'Vest',
      'Hoodie',
      'Denim jacket',
      'Trench coat',
      'Windbreaker',
      'Fleece',
      'Overshirt',
      'Puffer',
    ],
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
    Shoes: [
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
    Layers: [
      'Jacket',
      'Blazer',
      'Coat',
      'Vest',
      'Cardigan',
      'Overshirt',
      'Windbreaker',
      'Denim jacket',
      'Puffer',
      'Fleece',
    ],
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
    Shoes: [
      'Sneakers',
      'Dress shoes',
      'Boots',
      'Sandals',
      'Loafers',
      'Walking shoes',
    ],
  };

  const ACCESSORY_TABS = {
    Jewelry: ['Earrings', 'Necklace', 'Bracelet', 'Ring', 'Watch', 'Hoops', 'Studs'],
    Bags: ['Tote bag', 'Crossbody bag', 'Clutch', 'Backpack', 'Belt bag'],
    Other: ['Belt', 'Sunglasses', 'Hat', 'Scarf', 'Hair ties', 'Hair clip'],
  };

  function groupsFor(gender) {
    return gender === 'men' ? MEN : WOMEN;
  }

  function tabsFor(gender) {
    return [...Object.keys(groupsFor(gender)), 'Accessories'];
  }

  function pillsFor(gender, tab) {
    if (tab === 'Accessories') return null;
    const groups = groupsFor(gender);
    return groups[tab] || [];
  }

  function searchAll(gender, query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    const groups = groupsFor(gender);
    Object.entries(groups).forEach(([group, items]) => {
      items.forEach((name) => {
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
    tabsFor,
    pillsFor,
    searchAll,
    ACCESSORY_TABS,
  };
})();
