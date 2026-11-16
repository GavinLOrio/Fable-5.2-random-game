extends SceneTree
## One-time project setup, run headless from the project folder:
##   godot --headless --path . --script res://tools/bootstrap.gd
## Writes the input map into project.godot and builds scenes/player.tscn and scenes/main.tscn.

const KEYS := {
	"move_forward": KEY_W, "move_back": KEY_S, "move_left": KEY_A, "move_right": KEY_D,
	"jump": KEY_SPACE, "sprint": KEY_SHIFT, "crouch": KEY_C, "use": KEY_E, "reload": KEY_R,
	"inventory": KEY_TAB, "build": KEY_B, "map": KEY_M, "light": KEY_F, "dismantle": KEY_X,
	"cancel": KEY_Q, "menu": KEY_ESCAPE,
}
const BUTTONS := {"fire": MOUSE_BUTTON_LEFT, "aim": MOUSE_BUTTON_RIGHT}


func _initialize() -> void:
	_inputs()
	_player_scene()
	_main_scene()
	print("bootstrap: input map and scenes written")
	quit()


func _action(name: String, ev: InputEvent) -> void:
	ProjectSettings.set_setting("input/" + name, {"deadzone": 0.2, "events": [ev]})


func _inputs() -> void:
	for name in KEYS:
		var ev := InputEventKey.new()
		ev.physical_keycode = KEYS[name]
		_action(name, ev)
	for name in BUTTONS:
		var ev := InputEventMouseButton.new()
		ev.button_index = BUTTONS[name]
		_action(name, ev)
	for i in range(1, 9):
		var ev := InputEventKey.new()
		ev.physical_keycode = KEY_0 + i
		_action("hotbar_%d" % i, ev)
	ProjectSettings.save()


func _own(node: Node, owner: Node) -> void:
	for c in node.get_children():
		c.owner = owner
		_own(c, owner)


func _save(root: Node, path: String) -> void:
	_own(root, root)
	var packed := PackedScene.new()
	var err := packed.pack(root)
	if err == OK:
		err = ResourceSaver.save(packed, path)
	if err != OK:
		push_error("bootstrap: could not save %s (%d)" % [path, err])
	root.free()


func _player_scene() -> void:
	var player := CharacterBody3D.new()
	player.name = "Player"
	player.collision_layer = 2
	player.set_script(load("res://scripts/player.gd"))
	var shape := CapsuleShape3D.new()
	shape.radius = 0.34
	shape.height = 1.75
	var col := CollisionShape3D.new()
	col.name = "Collision"
	col.shape = shape
	col.position.y = 0.875
	player.add_child(col)
	var head := Node3D.new()
	head.name = "Head"
	head.position.y = 1.65
	player.add_child(head)
	var cam := Camera3D.new()
	cam.name = "Camera"
	cam.fov = 72.0
	cam.near = 0.05
	cam.far = 4000.0
	head.add_child(cam)
	_save(player, "res://scenes/player.tscn")


func _main_scene() -> void:
	var root := Node3D.new()
	root.name = "Main"
	# Sky, fog and global illumination: the look the high-quality assets will sit in
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = Sky.new()
	env.sky.sky_material = PhysicalSkyMaterial.new()
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.sdfgi_enabled = true
	env.ssao_enabled = true
	env.ssil_enabled = true
	env.glow_enabled = true
	env.fog_enabled = true
	env.fog_density = 0.0015
	env.volumetric_fog_enabled = true
	env.volumetric_fog_density = 0.006
	var world_env := WorldEnvironment.new()
	world_env.name = "WorldEnvironment"
	world_env.environment = env
	root.add_child(world_env)
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-50, -35, 0)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 250.0
	root.add_child(sun)
	# Placeholder ground until the island terrain is built with Terrain3D
	var ground := StaticBody3D.new()
	ground.name = "Ground"
	var plane := PlaneMesh.new()
	plane.size = Vector2(400, 400)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.27, 0.36, 0.2)
	plane.material = mat
	var mesh := MeshInstance3D.new()
	mesh.name = "Mesh"
	mesh.mesh = plane
	ground.add_child(mesh)
	var floor_col := CollisionShape3D.new()
	floor_col.name = "Collision"
	floor_col.shape = WorldBoundaryShape3D.new()
	ground.add_child(floor_col)
	root.add_child(ground)
	var player: Node3D = load("res://scenes/player.tscn").instantiate()
	player.position = Vector3(0, 0.1, 0)
	root.add_child(player)
	_own(root, root)
	player.owner = root
	for c in player.get_children():
		c.owner = null
	_save(root, "res://scenes/main.tscn")
