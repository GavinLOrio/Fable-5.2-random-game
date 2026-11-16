// Exports the web version's game data (hollowpine/src/data.js) to JSON for the Godot project.
// Run from the repository root: node hollowpine-godot/tools/export_data.mjs
import { writeFileSync } from 'node:fs';
const D = await import('../../hollowpine/src/data.js');
const out = new URL('../data/', import.meta.url);
const tables = { items: D.ITEMS, recipes: D.RECIPES, tech: D.TECH, tech_grants: D.TECH_GRANTS, tier_names: D.TIER_NAMES, structures: D.STRUCTS, tiers: D.TIERS, loot: D.LOOT, mobs: D.MOBS, crops: D.CROPS, weather: D.WEATHER, fuel: D.FUEL, cook: D.COOK, smelt: D.SMELT, boxes: D.BOXES, equip_slots: D.EQUIP };
for (const [name, value] of Object.entries(tables)) writeFileSync(new URL(name + '.json', out), JSON.stringify(value, null, 1) + '\n');
writeFileSync(new URL('rules.json', out), JSON.stringify({ base_inventory_slots: D.BASE_SLOTS, stack_sizes: Object.fromEntries(Object.keys(D.ITEMS).map((k) => [k, D.STACK(k)])) }, null, 1) + '\n');
console.log('wrote', Object.keys(tables).length + 1, 'tables');
