extends SceneTree
## Headless check that the project loads: godot --headless --path . --script res://tools/smoke_test.gd

var frames := 0
var main: Node


func _initialize() -> void:
	main = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)


func _process(_delta: float) -> bool:
	frames += 1
	if frames == 120:
		var gd = root.get_node("GameData")
		var player: Node3D = main.get_node("Player")
		print("items: ", gd.table("items").size(), ", recipes: ", gd.table("recipes").size(), ", structures: ", gd.table("structures").size())
		print("log stacks to ", gd.table("rules")["stack_sizes"]["log"], "; campfire slots: ", gd.table("boxes")["campfire"]["groups"].size(), " groups")
		print("player y after 120 frames: ", snappedf(player.position.y, 0.01), ", on floor: ", player.is_on_floor())
		print("input actions: ", InputMap.get_actions().filter(func(a): return not String(a).begins_with("ui_")).size())
		main.queue_free()
	return frames >= 123
