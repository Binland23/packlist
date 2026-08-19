/**
 * Headless checks for category, trip-day, and staple APIs.
 * Mocks localStorage then evaluates the browser scripts.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
const localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const context = vm.createContext({
  localStorage,
  console,
  Date,
  Math,
  Map,
  Set,
  Object,
  Array,
  String,
  Number,
  Boolean,
  JSON,
  Intl,
});

vm.runInContext(fs.readFileSync(path.join(root, 'js/categories.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8'), context);

const PackStore = vm.runInContext('PackStore', context);
const ClothingCatalog = vm.runInContext('ClothingCatalog', context);
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`ok  ${msg}`);
  }
}

assert(ClothingCatalog.accessorySubgroupsFor('Jewelry').includes('Bracelets'), 'Jewelry has Bracelets type');
assert(Object.keys(ClothingCatalog.ACCESSORY_TABS).includes('Hats'), 'Hats accessory heading exists');
assert(Object.keys(ClothingCatalog.ACCESSORY_TABS).includes('Scarves'), 'Scarves accessory heading exists');
assert(Object.keys(ClothingCatalog.ACCESSORY_TABS).includes('Belts'), 'Belts accessory heading exists');
assert(!PackStore.listPickerTabs('women').includes('Men'), 'Picker tabs do not include Men');

const cats = PackStore.listAccessoryCategories();
assert(cats.includes('Hats') && cats.includes('Scarves') && cats.includes('Belts'), 'Default accessory folders include Hats, Scarves, Belts');

const hat = PackStore.listAccessories().find((a) => a.category === 'Hats');
assert(!!hat, 'Starter hat lives under Hats');
const belt = PackStore.listAccessories().find((a) => a.name === 'Belt');
assert(belt?.category === 'Belts', 'Starter belt lives under Belts');

const addedTab = PackStore.addClothingTab('women', 'Formal');
assert(addedTab.action === 'added', 'Can add a clothing heading');
assert(PackStore.listClothingTabs('women').includes('Formal'), 'Formal heading is listed');

const addedSub = PackStore.addClothingSubgroup('women', 'Tops', 'Tanks');
assert(addedSub.action === 'added', 'Can add a type under Tops');
assert(PackStore.listClothingSubgroups('women', 'Tops').includes('Tanks'), 'Tanks type is listed under Tops');

PackStore.addClothingItem('women', 'Tops', 'Ribbed tank', 'Tanks');
assert(PackStore.listClothingItems('women', 'Tops').includes('Ribbed tank'), 'Custom item saved under Tops');
assert(PackStore.clothingSubgroup('women', 'Tops', 'Ribbed tank') === 'Tanks', 'Custom item assigned to Tanks');

const accCat = PackStore.addAccessoryCategory('Hair');
assert(accCat.action === 'added', 'Can add an accessory heading');
const accSub = PackStore.addAccessorySubgroup('Jewelry', 'Anklets');
assert(accSub.action === 'added', 'Can add Jewelry type');
assert(PackStore.listAccessorySubgroups('Jewelry').includes('Anklets'), 'Anklets listed under Jewelry');

const trip = PackStore.createTrip({ name: 'Lisbon', days: 3, startDate: '2026-08-17' });
assert(trip.days[0].label === 'Monday', 'First day named Monday from calendar start');
assert(trip.days[1].label === 'Tuesday', 'Second day named Tuesday');
assert(trip.days[0].date === '2026-08-17', 'First day stores ISO date');
assert(PackStore.weekdayName('2026-09-28') === 'Monday', 'Sep 28 2026 is Monday');
assert(PackStore.formatDayDate('2026-09-28') === 'Sep 28', 'Formats Sep 28 without a timezone shift');
assert(
  PackStore.displayDayTitle({ label: 'Day 1', date: '2026-09-28' }, 0) === 'Monday, Sep 28',
  'Dated Day 1 shows weekday and date'
);
assert(
  PackStore.displayDayTitle({ label: 'Beach day', date: '2026-09-28' }, 0) === 'Beach day · Sep 28',
  'Custom day names keep the date'
);
assert(PackStore.displayDayTitle({ label: 'Day 2' }, 1) === 'Day 2', 'Undated days keep Day N');
assert(
  PackStore.displayDayTitle({ label: 'Tuesday', date: '2026-09-28' }, 0) === 'Monday, Sep 28',
  'Wrong stored weekday is corrected in the title'
);
assert(
  PackStore.displayDayTitle(trip.days[0], 0) === 'Monday, Aug 17',
  'New trip days list weekday and date'
);
const undatedStart = PackStore.createTrip({ name: 'No date given', days: 2 });
assert(undatedStart.days[0].date === PackStore.toISODate(new Date()), 'New trips default to today');
assert(
  PackStore.displayDayTitle(undatedStart.days[0], 0).includes(', '),
  'Defaulted trip days show weekday and date'
);

PackStore.updateDay(trip.id, trip.days[0].id, { notes: 'Early flight' });
PackStore.addEventToDay(trip.id, trip.days[0].id, { name: 'Brunch' });
let day = PackStore.getTrip(trip.id).days[0];
assert(day.notes === 'Early flight', 'Day notes persist');
assert(day.events[0].name === 'Brunch', 'Brunch event added');

PackStore.addItemToDay(trip.id, day.id, { name: 'White tee', eventId: day.events[0].id });
day = PackStore.getTrip(trip.id).days[0];
assert(day.events[0].items[0].name === 'White tee', 'Item grouped under brunch');
PackStore.removeItemFromDayByName(trip.id, day.id, 'White tee', day.events[0].id);
day = PackStore.getTrip(trip.id).days[0];
assert(day.events[0].items.length === 0, 'Second tap removes the brunch item');

PackStore.addItemToDay(trip.id, day.id, { name: 'Sun hat' });
PackStore.addItemToDay(trip.id, day.id, { name: 'Scarf' });
day = PackStore.getTrip(trip.id).days[0];
PackStore.reorderDayItems(trip.id, day.id, [day.items[1].id, day.items[0].id]);
day = PackStore.getTrip(trip.id).days[0];
assert(day.items.map((i) => i.name).join(',') === 'Scarf,Sun hat', 'Day items reorder');

PackStore.addEventToDay(trip.id, day.id, { name: 'Dinner' });
day = PackStore.getTrip(trip.id).days[0];
PackStore.reorderDayEvents(trip.id, day.id, [day.events[1].id, day.events[0].id]);
day = PackStore.getTrip(trip.id).days[0];
assert(day.events.map((e) => e.name).join(',') === 'Dinner,Brunch', 'Events reorder');

const staples = PackStore.listStaples();
const firstTwo = staples.slice(0, 2);
PackStore.removeTripStaples(trip.id, firstTwo.map((s) => ({ id: s.id, source: 'global' })));
const after = PackStore.getTripStaples(trip.id);
assert(after.hidden.length >= 2, 'Bulk staple skip hides more than one item');
assert(after.active.every((s) => s.id !== firstTwo[0].id), 'Removed staple is not active');

const acc = PackStore.listAccessories();
PackStore.reorderAccessories([acc[1].id, acc[0].id]);
const acc2 = PackStore.listAccessories();
assert(acc2[0].id === acc[1].id || acc2.findIndex((a) => a.id === acc[1].id) <= acc2.findIndex((a) => a.id === acc[0].id), 'Accessories can be reordered');

PackStore.setSplitView({ enabled: true, left: 'Tops', right: 'Bottoms' });
const split = PackStore.getSplitView();
assert(split.enabled && split.left === 'Tops' && split.right === 'Bottoms', 'Split view prefs persist');

assert(PackStore.getPrefs().compactLists === true, 'Compact lists defaults on');
PackStore.setPref('compactLists', false);
assert(PackStore.getPrefs().compactLists === false, 'Compact lists can be turned off');
PackStore.setPref('compactLists', true);
assert(PackStore.getPrefs().compactLists === true, 'Compact lists persists on');
PackStore.setPref('dayItemSpacing', 'spaced');
assert(PackStore.getPrefs().compactLists === false, 'Legacy spaced setting turns compact off');
PackStore.setPref('dayItemSpacing', 'close');
assert(PackStore.getPrefs().compactLists === true, 'Legacy close setting turns compact on');

assert(PackStore.getPrefs().catAddFormHidden == null, 'Add form hidden pref starts unset');
PackStore.setPref('catAddFormHidden', true);
assert(PackStore.getPrefs().catAddFormHidden === true, 'Add form hidden pref persists');
PackStore.setPref('catAddFormHidden', false);
assert(PackStore.getPrefs().catAddFormHidden === false, 'Add form can be shown again');

const splitReturn = PackStore.setSplitView({ enabled: true, left: 'Layers', right: 'Layers' });
assert(splitReturn.enabled === true, 'setSplitView returns the split view, not all prefs');
assert(splitReturn.left === 'Layers' && splitReturn.right !== 'Layers', 'Split panes cannot be the same category');
assert(PackStore.getSplitView().right === splitReturn.right, 'Coerced split pair is persisted');

const splitInvalid = PackStore.setSplitView({ left: 'Not a tab', right: 'Bottoms' });
assert(splitInvalid.left !== 'Not a tab', 'Invalid split category falls back to a real heading');
assert(splitInvalid.left !== splitInvalid.right, 'Fallback split still uses two headings');

PackStore.addItemToDay(trip.id, day.id, { name: 'White tee' });
day = PackStore.getTrip(trip.id).days[0];
const extraTee = day.items.find((i) => i.name === 'White tee');
PackStore.placeDayItem(trip.id, day.id, extraTee.id, day.events[0].id);
day = PackStore.getTrip(trip.id).days[0];
assert(
  day.events[0].items.some((i) => i.name === 'White tee') && !day.items.some((i) => i.name === 'White tee'),
  'Existing extra can move onto an event'
);

const brunchTee = day.events[0].items.find((i) => i.name === 'White tee');
PackStore.placeDayItem(trip.id, day.id, brunchTee.id, day.events[1].id);
day = PackStore.getTrip(trip.id).days[0];
assert(
  day.events[1].items.some((i) => i.name === 'White tee') && !day.events[0].items.some((i) => i.name === 'White tee'),
  'Item can move from one event to another'
);

const dinnerTee = day.events[1].items.find((i) => i.name === 'White tee');
PackStore.placeDayItem(trip.id, day.id, dinnerTee.id, '', [dinnerTee.id, ...day.items.map((i) => i.id)]);
day = PackStore.getTrip(trip.id).days[0];
assert(
  day.items[0].name === 'White tee' && !day.events[1].items.some((i) => i.name === 'White tee'),
  'Item can drag back off an event onto the day'
);

const pack = PackStore.buildPackingList(trip.id);
assert(pack.dayGroups[0].extras.some((e) => e.eventName === 'Dinner' || e.name === 'Scarf'), 'Packing list includes day extras and events');

store.clear();
const old = {
  outfits: [],
  staples: [{ id: 's1', name: 'Toothbrush', category: 'Toiletries' }],
  accessories: [
    { id: 'a1', name: 'Belt', category: 'Other' },
    { id: 'a2', name: 'Sun hat', category: 'Other' },
    { id: 'a3', name: 'Silk scarf', category: 'Other' },
  ],
  trips: [],
  prefs: { accessoryCategories: ['Jewelry', 'Bags', 'Shoes', 'Other'] },
};
localStorage.setItem('packlist-data-v1', JSON.stringify(old));
const migrated = PackStore.getState();
const byName = Object.fromEntries(migrated.accessories.map((a) => [a.name, a.category]));
assert(byName.Belt === 'Belts', 'Migration moves Belt into Belts');
assert(byName['Sun hat'] === 'Hats', 'Migration moves hat into Hats');
assert(byName['Silk scarf'] === 'Scarves', 'Migration moves scarf into Scarves');
assert(migrated.prefs.accessoryCategories.includes('Hats'), 'Migration inserts Hats folder');

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
