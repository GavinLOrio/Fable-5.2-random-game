// Hollowpine game data: items, weapons, recipes, research tree, structures, loot tables.

// kind: melee | bow | gun
const melee = (dmg, range, rate, tree = 0, ore = 0, stam = 6) => ({ kind: 'melee', dmg, range, rate, tree, ore, stam });
const gun = (era, dmg, rpm, auto, mag, reload, spread, recoil, ammo, o = {}) => ({ kind: 'gun', era, dmg, rpm, auto, mag, reload, spread, recoil, ammo, pellets: 1, zoom: 1.35, range: 300, ...o });

export const ITEMS = {
  // resources
  log: { n: 'Log', cat: 'res', icon: 'log', tint: '#9a6b3f', max: 24, d: 'Felled timber. The backbone of every structure.' },
  stick: { n: 'Stick', cat: 'res', icon: 'stick', tint: '#b08a55', d: 'Found on the forest floor or shaken from trees.' },
  stone: { n: 'Stone', cat: 'res', icon: 'stone', tint: '#9aa0a3', d: 'Loose rock. Mined faster with a pickaxe.' },
  fiber: { n: 'Plant Fiber', cat: 'res', icon: 'fiber', tint: '#8fb35a', d: 'Stripped from tall flax. Twists into rope and cloth.' },
  rope: { n: 'Rope', cat: 'res', icon: 'rope', tint: '#c9b17a', d: 'Twisted fiber cord.' },
  cloth: { n: 'Cloth', cat: 'res', icon: 'cloth', tint: '#d8d2c2', d: 'Woven fiber or salvaged fabric.' },
  hide: { n: 'Hide', cat: 'res', icon: 'cloth', tint: '#8a5f3a', d: 'Skinned from animals.' },
  bone: { n: 'Bone', cat: 'res', icon: 'bone', tint: '#e6dfc8', d: 'Useful for primitive tips and tools.' },
  iron_ore: { n: 'Iron Ore', cat: 'res', icon: 'ore', tint: '#b0623e', d: 'Smelt in a furnace with charcoal.' },
  sulfur: { n: 'Sulfur', cat: 'res', icon: 'ore', tint: '#d9c43a', d: 'Yellow crystals from the high rock. One half of gunpowder.' },
  charcoal: { n: 'Charcoal', cat: 'res', icon: 'ore', tint: '#3a3a3a', d: 'Burn logs at a campfire or furnace.' },
  metal: { n: 'Metal Ingot', cat: 'res', icon: 'ingot', tint: '#aab4bd', d: 'Smelted iron. Needed for anything that lasts.' },
  scrap: { n: 'Scrap', cat: 'res', icon: 'scrap', tint: '#c98a3c', d: 'Salvage. Spent at research tables to learn blueprints.' },
  gunpowder: { n: 'Gunpowder', cat: 'res', icon: 'powder', tint: '#55504a', d: 'Sulfur and charcoal, ground fine.' },
  parts: { n: 'Mechanical Parts', cat: 'res', icon: 'gear', tint: '#b9b3a4', d: 'Springs, pins and gears. Found in town and harbor.' },
  electronics: { n: 'Electronics', cat: 'res', icon: 'chip', tint: '#4fae7a', d: 'Circuit boards. Found in the bunker and the summit station.' },
  // food and medicine
  berries: { n: 'Berries', cat: 'food', icon: 'berry', tint: '#a8324f', food: 8, water: 4, d: 'Eat: a little food and water.' },
  mushroom: { n: 'Mushroom', cat: 'food', icon: 'mushroom', tint: '#c9a37a', food: 10, d: 'Eat: some food.' },
  raw_meat: { n: 'Raw Meat', cat: 'food', icon: 'meat', tint: '#b5443f', food: 14, hp: -8, d: 'Edible raw, but it will hurt. Cook it at a campfire.' },
  cooked_meat: { n: 'Cooked Meat', cat: 'food', icon: 'meat', tint: '#8a5230', food: 42, hp: 6, d: 'Eat: a real meal.' },
  canned_food: { n: 'Canned Food', cat: 'food', icon: 'can', tint: '#b8a05a', food: 36, water: 6, d: 'Eat: still good after all these years.' },
  water_bottle: { n: 'Water Bottle', cat: 'food', icon: 'bottle', tint: '#6fb4d6', water: 45, gives: 'empty_bottle', d: 'Drink. Refill the empty at the lake or a rain collector.' },
  empty_bottle: { n: 'Empty Bottle', cat: 'food', icon: 'bottle', tint: '#9aa4a8', d: 'Fill at the lake or a rain collector.' },
  bandage: { n: 'Bandage', cat: 'med', icon: 'med', tint: '#e8e2d2', hp: 25, d: 'Use: restores 25 health.' },
  medkit: { n: 'Medkit', cat: 'med', icon: 'med', tint: '#c9413b', hp: 80, d: 'Use: restores 80 health.' },
  // crops and seeds
  carrot: { n: 'Carrot', cat: 'food', icon: 'crop', tint: '#e07a2a', food: 14, water: 4, d: 'Eat: a little food and water.' },
  potato: { n: 'Potato', cat: 'food', icon: 'crop', tint: '#b89868', food: 9, d: 'Filling once baked at a campfire.' },
  baked_potato: { n: 'Baked Potato', cat: 'food', icon: 'crop', tint: '#8a6a3a', food: 32, hp: 3, d: 'Eat: a solid meal.' },
  corn: { n: 'Corn', cat: 'food', icon: 'crop', tint: '#e8c83a', food: 14, d: 'Eat raw, or roast it at a campfire.' },
  roast_corn: { n: 'Roast Corn', cat: 'food', icon: 'crop', tint: '#c89a2a', food: 30, d: 'Eat: sweet and hot.' },
  pumpkin: { n: 'Pumpkin', cat: 'food', icon: 'crop', tint: '#e0802a', food: 26, water: 12, d: 'Eat: food and water in one.' },
  herb: { n: 'Healing Herb', cat: 'med', icon: 'fiber', tint: '#5fd0a0', hp: 8, d: 'Chew for a little health, or bind into a poultice.' },
  poultice: { n: 'Herbal Poultice', cat: 'med', icon: 'med', tint: '#5fd0a0', hp: 45, d: 'Use: restores 45 health.' },
  seed_carrot: { n: 'Carrot Seeds', cat: 'seed', icon: 'seed', tint: '#e07a2a', crop: 'carrot', d: 'Plant in a garden plot or planter box.' },
  seed_potato: { n: 'Seed Potatoes', cat: 'seed', icon: 'seed', tint: '#b89868', crop: 'potato', d: 'Plant in a garden plot or planter box.' },
  seed_corn: { n: 'Corn Kernels', cat: 'seed', icon: 'seed', tint: '#e8c83a', crop: 'corn', d: 'Plant in a garden plot or planter box.' },
  seed_pumpkin: { n: 'Pumpkin Seeds', cat: 'seed', icon: 'seed', tint: '#e0802a', crop: 'pumpkin', d: 'Plant in a garden plot or planter box.' },
  seed_flax: { n: 'Flax Seeds', cat: 'seed', icon: 'seed', tint: '#8fb35a', crop: 'flax', d: 'Grows plant fiber. Sometimes shaken loose from wild flax.' },
  seed_berry: { n: 'Berry Cuttings', cat: 'seed', icon: 'seed', tint: '#a8324f', crop: 'berry', d: 'Grows a berry cane. Sometimes taken from wild bushes.' },
  seed_herb: { n: 'Herb Seeds', cat: 'seed', icon: 'seed', tint: '#5fd0a0', crop: 'herb', d: 'Grows healing herbs.' },
  // ammunition
  arrow: { n: 'Arrow', cat: 'ammo', icon: 'arrow', tint: '#c9b17a', d: 'For the hunting bow.' },
  bolt: { n: 'Bolt', cat: 'ammo', icon: 'arrow', tint: '#9aa4a8', d: 'For the crossbow.' },
  ball: { n: 'Powder Cartridge', cat: 'ammo', icon: 'ammo', tint: '#b9a27a', d: 'Paper cartridge with ball and powder. Flintlocks.' },
  pistol_ammo: { n: 'Pistol Rounds', cat: 'ammo', icon: 'ammo', tint: '#d0a44a', d: 'Sidearms and submachine guns.' },
  rifle_ammo: { n: 'Rifle Rounds', cat: 'ammo', icon: 'ammo', tint: '#c98a3c', d: 'Full-power cartridges for service and marksman rifles.' },
  shell: { n: 'Shotgun Shells', cat: 'ammo', icon: 'ammo', tint: '#b5443f', d: 'Buckshot.' },
  carbine_ammo: { n: 'Carbine Rounds', cat: 'ammo', icon: 'ammo', tint: '#7fae6a', d: 'Intermediate cartridges for the assault rifle.' },
  // primitive tools and weapons
  stone_axe: { n: 'Stone Hatchet', cat: 'tool', icon: 'axe', tint: '#9aa0a3', max: 1, w: melee(16, 2.6, 0.62, 1, 0.2), d: 'Chops trees. Weak in a fight.' },
  stone_pick: { n: 'Stone Pickaxe', cat: 'tool', icon: 'pick', tint: '#9aa0a3', max: 1, w: melee(14, 2.6, 0.7, 0.2, 1), d: 'Breaks boulders and ore.' },
  club: { n: 'Wooden Club', cat: 'weapon', icon: 'club', tint: '#9a6b3f', max: 1, w: melee(22, 2.5, 0.6), d: 'A heavy branch. Better than fists.' },
  spear: { n: 'Bone Spear', cat: 'weapon', icon: 'spear', tint: '#e6dfc8', max: 1, w: melee(30, 3.6, 0.75), d: 'Long reach keeps teeth away.' },
  torch: { n: 'Torch', cat: 'tool', icon: 'torch', tint: '#e89a3c', max: 1, w: melee(10, 2.3, 0.6), light: 1, d: 'Lights the night while held.' },
  bow: { n: 'Hunting Bow', cat: 'weapon', icon: 'bow', tint: '#b08a55', max: 1, w: { kind: 'bow', dmg: 48, ammo: 'arrow', speed: 62, draw: 0.75 }, d: 'Hold to draw, release to loose. Silent.' },
  // tier 1: iron and black powder
  iron_axe: { n: 'Iron Axe', cat: 'tool', icon: 'axe', tint: '#aab4bd', max: 1, w: melee(28, 2.7, 0.55, 2.2, 0.3), d: 'Fells trees in half the swings.' },
  iron_pick: { n: 'Iron Pickaxe', cat: 'tool', icon: 'pick', tint: '#aab4bd', max: 1, w: melee(22, 2.7, 0.6, 0.3, 2.4), d: 'Mines ore quickly.' },
  machete: { n: 'Machete', cat: 'weapon', icon: 'blade', tint: '#aab4bd', max: 1, w: melee(40, 2.6, 0.42, 0.4, 0, 5), d: 'Fast, vicious, quiet.' },
  crossbow: { n: 'Crossbow', cat: 'weapon', icon: 'bow', tint: '#7a6a55', max: 1, w: { kind: 'bow', dmg: 85, ammo: 'bolt', speed: 95, draw: 0, reload: 1.9 }, d: 'Slow to span, hits like a hammer.' },
  flintlock: { n: 'Flintlock Pistol', cat: 'weapon', icon: 'pistol', tint: '#8a6a45', max: 1, w: gun('Black powder', 62, 60, false, 1, 3.2, 2.6, 5, 'ball', { range: 80, smoke: 1 }), d: 'One shot, a cloud of smoke, a long reload.' },
  musket: { n: 'Flintlock Musket', cat: 'weapon', icon: 'rifle', tint: '#8a6a45', max: 1, w: gun('Black powder', 110, 60, false, 1, 4.6, 1.5, 7, 'ball', { range: 160, smoke: 1, zoom: 1.5 }), d: 'A thunderclap. Drops a wolf where it stands.' },
  hide_armor: { n: 'Hide Armor', cat: 'armor', icon: 'armor', tint: '#8a5f3a', max: 1, armor: 0.18, warm: 1, d: 'Wear: 18% less damage, keeps out the cold.' },
  // tier 2: the war years
  revolver: { n: 'Service Revolver', cat: 'weapon', icon: 'pistol', tint: '#6b7178', max: 1, w: gun('War years', 46, 170, false, 6, 2.6, 1.6, 3.4, 'pistol_ammo', { range: 120 }), d: 'Six rounds, never jams.' },
  bolt_rifle: { n: 'Bolt-Action Rifle', cat: 'weapon', icon: 'rifle', tint: '#7a5a3a', max: 1, w: gun('War years', 96, 46, false, 5, 3.0, 0.45, 4.2, 'rifle_ammo', { range: 400, zoom: 1.9 }), d: 'Five rounds of patient accuracy.' },
  service_rifle: { n: 'Self-Loading Rifle', cat: 'weapon', icon: 'rifle', tint: '#6e5133', max: 1, w: gun('War years', 68, 300, false, 8, 2.4, 0.8, 3.0, 'rifle_ammo', { range: 350, zoom: 1.6 }), d: 'Eight rounds as fast as you can pull.' },
  smg: { n: 'Submachine Gun', cat: 'weapon', icon: 'smg', tint: '#4f555b', max: 1, w: gun('War years', 24, 600, true, 30, 2.5, 2.3, 1.5, 'pistol_ammo', { range: 110 }), d: 'Sprays pistol rounds. Clears a room.' },
  trench_gun: { n: 'Trench Shotgun', cat: 'weapon', icon: 'shotgun', tint: '#5d4a36', max: 1, w: gun('War years', 15, 75, false, 6, 3.4, 5.5, 6, 'shell', { pellets: 9, range: 60 }), d: 'Pump action. Nine pellets a shell.' },
  field_armor: { n: 'Steel Helmet & Field Jacket', cat: 'armor', icon: 'armor', tint: '#6f7a55', max: 1, armor: 0.34, warm: 1, d: 'Wear: 34% less damage.' },
  // tier 3: modern
  pistol: { n: '9mm Pistol', cat: 'weapon', icon: 'pistol', tint: '#3a3f45', max: 1, w: gun('Modern', 34, 400, false, 15, 1.6, 1.2, 1.8, 'pistol_ammo', { range: 140 }), d: 'Fifteen rounds, quick hands.' },
  assault_rifle: { n: 'Assault Rifle', cat: 'weapon', icon: 'rifle', tint: '#33383d', max: 1, w: gun('Modern', 36, 680, true, 30, 2.3, 0.9, 1.25, 'carbine_ammo', { range: 350, zoom: 1.7 }), d: 'Automatic, accurate, hungry.' },
  combat_shotgun: { n: 'Combat Shotgun', cat: 'weapon', icon: 'shotgun', tint: '#33383d', max: 1, w: gun('Modern', 15, 220, false, 8, 3.0, 4.6, 4.2, 'shell', { pellets: 9, range: 70 }), d: 'Semi-automatic buckshot.' },
  marksman: { n: 'Marksman Rifle', cat: 'weapon', icon: 'rifle', tint: '#2f3a33', max: 1, w: gun('Modern', 150, 50, false, 5, 3.1, 0.08, 5, 'rifle_ammo', { range: 700, zoom: 6, scope: 1 }), d: 'Scoped. One round, one problem solved.' },
  tac_armor: { n: 'Tactical Vest & Helmet', cat: 'armor', icon: 'armor', tint: '#3d4438', max: 1, armor: 0.52, warm: 1, d: 'Wear: 52% less damage.' },
  flashlight: { n: 'Flashlight', cat: 'tool', icon: 'torch', tint: '#d9d9d9', max: 1, d: 'Press F to switch on a hands-free beam.' },
};
for (const id in ITEMS) { ITEMS[id].id = id; if (!ITEMS[id].max) ITEMS[id].max = 9999; }

// Recipes: tier = research table level needed nearby (0 = craft anywhere). st = station: fire | furnace.
const R = (id, cost, tier = 0, n = 1, st = null) => ({ id, cost, tier, n, st });
export const RECIPES = [
  R('rope', { fiber: 3 }), R('cloth', { fiber: 4 }), R('bandage', { cloth: 2 }),
  R('stone_axe', { stick: 2, stone: 2, fiber: 2 }), R('stone_pick', { stick: 2, stone: 3, fiber: 2 }),
  R('club', { log: 1 }), R('spear', { stick: 3, bone: 2, rope: 1 }), R('torch', { stick: 1, cloth: 1 }),
  R('bow', { stick: 3, rope: 2 }), R('arrow', { stick: 2, stone: 1 }, 0, 4),
  R('poultice', { herb: 2, cloth: 1 }), R('baked_potato', { potato: 1 }, 0, 1, 'fire'), R('roast_corn', { corn: 1 }, 0, 1, 'fire'),
  R('cooked_meat', { raw_meat: 1 }, 0, 1, 'fire'), R('charcoal', { log: 1 }, 0, 3, 'fire'), R('water_bottle', { empty_bottle: 1, berries: 0 }, 0, 1, 'water'),
  R('metal', { iron_ore: 2, charcoal: 1 }, 0, 1, 'furnace'), R('metal', { scrap: 6, charcoal: 1 }, 0, 1, 'furnace'),
  R('gunpowder', { sulfur: 1, charcoal: 2 }, 1, 3),
  R('iron_axe', { metal: 3, stick: 2, rope: 1 }, 1), R('iron_pick', { metal: 3, stick: 2, rope: 1 }, 1), R('machete', { metal: 4, cloth: 1 }, 1),
  R('crossbow', { log: 1, metal: 3, rope: 3 }, 1), R('bolt', { stick: 1, metal: 1 }, 1, 4),
  R('flintlock', { metal: 5, log: 1, parts: 1 }, 1), R('musket', { metal: 9, log: 2, parts: 2 }, 1), R('ball', { metal: 1, gunpowder: 2, cloth: 1 }, 1, 5),
  R('hide_armor', { hide: 6, rope: 3 }, 1),
  R('revolver', { metal: 10, parts: 3 }, 2), R('bolt_rifle', { metal: 16, log: 2, parts: 4 }, 2), R('service_rifle', { metal: 22, log: 2, parts: 7 }, 2),
  R('smg', { metal: 20, parts: 8 }, 2), R('trench_gun', { metal: 18, log: 1, parts: 5 }, 2),
  R('pistol_ammo', { metal: 1, gunpowder: 2 }, 2, 8), R('rifle_ammo', { metal: 2, gunpowder: 3 }, 2, 6), R('shell', { metal: 1, gunpowder: 3, cloth: 1 }, 2, 4),
  R('field_armor', { metal: 12, cloth: 8, hide: 2 }, 2), R('medkit', { cloth: 4, bandage: 2, berries: 6 }, 2),
  R('pistol', { metal: 14, parts: 6, electronics: 0 }, 3), R('assault_rifle', { metal: 34, parts: 14, electronics: 2 }, 3), R('combat_shotgun', { metal: 30, parts: 12 }, 3),
  R('marksman', { metal: 40, parts: 16, electronics: 5 }, 3), R('carbine_ammo', { metal: 2, gunpowder: 3 }, 3, 10),
  R('tac_armor', { metal: 20, cloth: 14, electronics: 2 }, 3), R('flashlight', { metal: 4, electronics: 2 }, 3),
];
for (const r of RECIPES) for (const k in r.cost) if (!r.cost[k]) delete r.cost[k];

// Research: spend scrap at a table of the right level. Costs rise steeply with each tier.
const T = (id, tier, cost, req = null, n = null) => ({ id, tier, cost, req, n });
export const TECH = [
  T('gunpowder', 1, 30), T('iron_axe', 1, 25), T('iron_pick', 1, 25), T('machete', 1, 40, 'iron_axe'), T('crossbow', 1, 45), T('hide_armor', 1, 35),
  T('flintlock', 1, 60, 'gunpowder'), T('musket', 1, 90, 'flintlock'), T('s_furnace', 1, 30, null, 'Furnace'), T('s_stone_wall', 1, 50, null, 'Stone Walls'), T('s_gate', 1, 40, null, 'Log Gate'),
  T('revolver', 2, 120), T('bolt_rifle', 2, 160), T('trench_gun', 2, 200, 'revolver'), T('smg', 2, 240, 'revolver'), T('service_rifle', 2, 280, 'bolt_rifle'),
  T('field_armor', 2, 150), T('medkit', 2, 100), T('s_tower', 2, 120, null, 'Watchtower'), T('s_lamp', 2, 80, null, 'Lantern Post'),
  T('pistol', 3, 300), T('combat_shotgun', 3, 450, 'pistol'), T('assault_rifle', 3, 600, 'pistol'), T('marksman', 3, 750, 'assault_rifle'),
  T('tac_armor', 3, 500), T('flashlight', 3, 250), T('s_metal_wall', 3, 400, null, 'Steel Walls'),
];
// ammo recipes unlock with their first weapon
export const TECH_GRANTS = { crossbow: ['bolt'], flintlock: ['ball'], revolver: ['pistol_ammo'], bolt_rifle: ['rifle_ammo'], trench_gun: ['shell'], assault_rifle: ['carbine_ammo'], pistol: ['pistol_ammo'], marksman: ['rifle_ammo'], combat_shotgun: ['shell'], smg: ['pistol_ammo'], service_rifle: ['rifle_ammo'], musket: ['ball'] };
export const TECH_BY_ID = Object.fromEntries(TECH.map((t) => [t.id, t]));
export const TIER_NAMES = ['Field craft', 'Iron & black powder', 'The war years', 'Modern'];

// Structures. snap: free | found | floor | wall | door | stairs | roof
const S = (id, n, cat, cost, hp, snap = 'free', o = {}) => ({ id, n, cat, cost, hp, snap, ...o });
export const STRUCTS = [
  S('campfire', 'Campfire', 'Camp', { stick: 4, stone: 6 }, 150, 'free', { d: 'Cooks meat, burns charcoal, warms you, lights the dark.' }),
  S('leanto', 'Lean-to Shelter', 'Camp', { log: 4, stick: 8 }, 250, 'free', { d: 'Sleep through the night and set your respawn point.' }),
  S('chest', 'Storage Chest', 'Camp', { log: 3, rope: 1 }, 250, 'free', { d: 'Holds what you cannot carry. Contents survive your death.' }),
  S('collector', 'Rain Collector', 'Camp', { log: 2, cloth: 3, stick: 4 }, 150, 'free', { d: 'Drink from it or fill bottles.' }),
  S('plot', 'Garden Plot', 'Farming', { stick: 4, stone: 2 }, 100, 'free', { d: 'Tilled soil on open ground. Plant a seed, keep it watered, harvest a full yield.' }),
  S('planter', 'Planter Box', 'Farming', { log: 2, stick: 2 }, 200, 'free', { d: 'A raised box of soil. Stands on floors and foundations, so crops can grow inside your walls.' }),
  S('research1', 'Research Table I', 'Research', { log: 8, stone: 20, scrap: 25 }, 500, 'free', { d: 'Learn iron and black-powder blueprints. Craft tier I items nearby.' }),
  S('research2', 'Research Table II', 'Research', { log: 12, metal: 30, parts: 6, scrap: 150 }, 800, 'free', { d: 'Learn war-era blueprints. Craft tier II items nearby.' }),
  S('research3', 'Research Table III', 'Research', { metal: 70, parts: 18, electronics: 10, scrap: 500 }, 1200, 'free', { d: 'Learn modern blueprints. Craft tier III items nearby.' }),
  S('furnace', 'Furnace', 'Research', { stone: 40, log: 4 }, 600, 'free', { tech: 's_furnace', d: 'Smelts ore and scrap into metal ingots.' }),
  S('foundation', 'Foundation', 'Building', { log: 6 }, 600, 'found', { d: 'A level log platform on posts. Walls and floors snap to it.' }),
  S('floor', 'Upper Floor', 'Building', { log: 5 }, 400, 'floor', { d: 'Snaps above a foundation, on top of the walls.' }),
  S('wall', 'Log Wall', 'Building', { log: 6 }, 500, 'wall', { d: 'Snaps to foundation edges and to other walls.' }),
  S('doorway', 'Doorway Wall', 'Building', { log: 5 }, 450, 'wall', { d: 'A wall with a door frame.' }),
  S('window', 'Window Wall', 'Building', { log: 5 }, 450, 'wall', { d: 'A wall with a shooting window.' }),
  S('door', 'Plank Door', 'Building', { log: 2, rope: 1 }, 250, 'door', { d: 'Fits a doorway. Enemies must break it down.' }),
  S('stairs', 'Log Stairs', 'Building', { log: 6 }, 400, 'stairs', { d: 'Climb one storey.' }),
  S('roof', 'Roof', 'Building', { log: 4, stick: 6 }, 300, 'floor', { d: 'A pitched cover. Snaps above a foundation.' }),
  S('palisade', 'Palisade', 'Defense', { log: 4 }, 450, 'wall', { d: 'Tall sharpened stakes. Cheap perimeter wall.' }),
  S('spikes', 'Spike Barricade', 'Defense', { stick: 10, log: 1 }, 200, 'free', { d: 'Hurts anything that pushes into it.' }),
  S('gate', 'Log Gate', 'Defense', { log: 8, rope: 2, metal: 2 }, 700, 'wall', { tech: 's_gate', d: 'A wide gate you can open and close.' }),
  S('tower', 'Watchtower', 'Defense', { log: 18, rope: 4 }, 900, 'free', { tech: 's_tower', d: 'A raised platform with stairs. See them coming.' }),
  S('lamp', 'Lantern Post', 'Defense', { log: 1, metal: 2, cloth: 1 }, 120, 'free', { tech: 's_lamp', d: 'Lights your camp at night.' }),
  S('stone_wall', 'Stone Wall', 'Building', { stone: 30, log: 1 }, 1400, 'wall', { tech: 's_stone_wall', d: 'Mortared rock. Three times as tough as logs.' }),
  S('metal_wall', 'Steel Wall', 'Building', { metal: 12, log: 1 }, 3000, 'wall', { tech: 's_metal_wall', d: 'Plate steel. Almost nothing gets through.' }),
];
export const STRUCT_BY_ID = Object.fromEntries(STRUCTS.map((s) => [s.id, s]));

// Loot tables by container tier: [item, min, max, weight]
export const LOOT = {
  1: [['scrap', 4, 12, 10], ['cloth', 1, 4, 6], ['canned_food', 1, 2, 5], ['water_bottle', 1, 1, 4], ['rope', 1, 2, 4], ['bandage', 1, 2, 4], ['metal', 1, 3, 3], ['parts', 1, 1, 2], ['arrow', 3, 8, 3], ['ball', 2, 5, 2], ['empty_bottle', 1, 1, 2], ['seed_carrot', 2, 4, 3], ['seed_potato', 2, 4, 3], ['seed_corn', 2, 3, 2], ['seed_pumpkin', 1, 2, 1.5], ['seed_herb', 1, 3, 2]],
  2: [['scrap', 10, 28, 10], ['parts', 1, 3, 6], ['metal', 2, 6, 6], ['pistol_ammo', 6, 16, 5], ['rifle_ammo', 4, 10, 4], ['shell', 2, 6, 3], ['canned_food', 1, 3, 4], ['medkit', 1, 1, 2], ['gunpowder', 3, 8, 4], ['cloth', 2, 6, 3], ['bandage', 1, 3, 3], ['revolver', 1, 1, 0.5], ['water_bottle', 1, 2, 3]],
  3: [['scrap', 30, 70, 10], ['parts', 2, 5, 6], ['electronics', 1, 3, 6], ['metal', 5, 12, 5], ['carbine_ammo', 10, 30, 5], ['rifle_ammo', 6, 14, 4], ['pistol_ammo', 10, 24, 3], ['shell', 4, 8, 3], ['medkit', 1, 2, 3], ['gunpowder', 6, 14, 3], ['pistol', 1, 1, 0.5], ['smg', 1, 1, 0.3]],
};

// Enemy and animal stats.
export const MOBS = {
  deer: { n: 'Deer', hp: 60, speed: 7.5, dmg: 0, sight: 28, body: 'quad', size: 1.15, color: 0x9a6f45, loot: { raw_meat: [2, 3], hide: [1, 2], bone: [1, 2] }, passive: 1 },
  boar: { n: 'Boar', hp: 90, speed: 5.6, dmg: 12, sight: 14, body: 'quad', size: 0.8, color: 0x4a3a30, loot: { raw_meat: [2, 4], hide: [1, 1], bone: [1, 2] }, rate: 1.4 },
  wolf: { n: 'Wolf', hp: 70, speed: 7.2, dmg: 14, sight: 42, body: 'quad', size: 0.85, color: 0x6e6e72, loot: { raw_meat: [1, 2], hide: [1, 2], bone: [1, 2] }, rate: 1.1 },
  bear: { n: 'Bear', hp: 320, speed: 6.4, dmg: 34, sight: 34, body: 'quad', size: 1.6, color: 0x3d2c20, loot: { raw_meat: [5, 7], hide: [3, 4], bone: [3, 4] }, rate: 1.6 },
  raider: { n: 'Scavenger', hp: 100, speed: 4.6, dmg: 18, sight: 50, body: 'human', color: 0x6b5a45, loot: { scrap: [4, 12], cloth: [1, 3] }, extra: [['bandage', 1, 1, 3], ['canned_food', 1, 1, 3], ['arrow', 2, 6, 2], ['ball', 1, 4, 2]], rate: 1.2 },
  gunner: { n: 'Rifleman', hp: 120, speed: 4.0, dmg: 16, sight: 75, body: 'human', color: 0x4c5a44, ranged: 1, loot: { scrap: [8, 20], rifle_ammo: [3, 8] }, extra: [['pistol_ammo', 4, 10, 3], ['parts', 1, 2, 2], ['medkit', 1, 1, 1], ['gunpowder', 2, 6, 2]], rate: 2.2 },
  warlord: { n: 'Warlord', hp: 480, speed: 4.2, dmg: 20, sight: 80, body: 'human', size: 1.18, color: 0x2e2e33, ranged: 1, loot: { scrap: [80, 120], electronics: [3, 6], carbine_ammo: [30, 60], parts: [4, 8] }, extra: [['smg', 1, 1, 2], ['medkit', 2, 3, 2]], rate: 1.0 },
};

// Crops: days = in-game days to ripen when watered; give = harvest from a garden plot (planter boxes give about two thirds).
export const CROPS = {
  carrot: { n: 'Carrots', days: 1.0, give: { carrot: [3, 5], seed_carrot: [1, 2] }, color: 0xe07a2a, leaf: 0x5f9a3a, h: 0.35 },
  potato: { n: 'Potatoes', days: 1.4, give: { potato: [3, 6], seed_potato: [1, 2] }, color: 0xb89868, leaf: 0x4f7f34, h: 0.4 },
  corn: { n: 'Corn', days: 2.0, give: { corn: [3, 5], seed_corn: [1, 2] }, color: 0xe8c83a, leaf: 0x7fae3f, h: 1.6 },
  pumpkin: { n: 'Pumpkins', days: 2.5, give: { pumpkin: [2, 3], seed_pumpkin: [1, 2] }, color: 0xe0802a, leaf: 0x3f7a30, h: 0.45 },
  flax: { n: 'Flax', days: 1.0, give: { fiber: [5, 8], seed_flax: [1, 2] }, color: 0x9cc0e8, leaf: 0x9cba58, h: 0.9 },
  berry: { n: 'Berry cane', days: 1.6, give: { berries: [6, 10], seed_berry: [1, 1] }, color: 0xb0243f, leaf: 0x2f5a22, h: 0.8 },
  herb: { n: 'Healing herbs', days: 1.2, give: { herb: [2, 4], seed_herb: [1, 2] }, color: 0x5fd0a0, leaf: 0x3f8a5a, h: 0.4 },
};
// Weather: sight = how far enemies see, wet = rain, light = daylight kept, fog = haze multiplier.
export const WEATHER = {
  clear: { n: 'Clear', w: 5, sight: 1, light: 1, fog: 1, rain: 0 },
  overcast: { n: 'Overcast', w: 3, sight: 0.9, light: 0.72, fog: 1.5, rain: 0 },
  rain: { n: 'Rain', w: 3, sight: 0.7, light: 0.6, fog: 2.2, rain: 0.6 },
  storm: { n: 'Thunderstorm', w: 1.3, sight: 0.5, light: 0.42, fog: 3, rain: 1 },
  fog: { n: 'Fog', w: 1.6, sight: 0.45, light: 0.8, fog: 6.5, rain: 0 },
};
