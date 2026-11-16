extends Node
## Game data exported from the browser version (res://data/*.json by tools/export_data.mjs).
## Use it anywhere as GameData.table("items")["log"], GameData.item("log") or GameData.table("recipes").

const TABLES: PackedStringArray = ["items", "recipes", "tech", "tech_grants", "tier_names", "structures", "tiers", "loot", "mobs", "crops", "weather", "fuel", "cook", "smelt", "boxes", "equip_slots", "rules"]

var _tables: Dictionary = {}


func _ready() -> void:
	for t in TABLES:
		_tables[t] = _load(t)


func table(name: String) -> Variant:
	return _tables.get(name)


func item(id: String) -> Dictionary:
	return _tables.get("items", {}).get(id, {})


func _load(name: String) -> Variant:
	var path := "res://data/%s.json" % name
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("GameData: cannot open %s" % path)
		return null
	var value: Variant = JSON.parse_string(f.get_as_text())
	if value == null:
		push_error("GameData: %s is not valid JSON" % path)
	return value
