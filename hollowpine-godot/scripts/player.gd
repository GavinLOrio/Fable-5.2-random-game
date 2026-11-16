extends CharacterBody3D
## A plain first-person walker for checking the scene: WASD, mouse look, Shift to sprint,
## Space to jump, C to crouch, Esc to free the mouse (click to capture it again).

@export var walk_speed := 4.5
@export var sprint_speed := 7.4
@export var crouch_speed := 2.1
@export var jump_velocity := 6.8
@export var mouse_sensitivity := 0.0023

var _crouching := false

@onready var head: Node3D = $Head


func _ready() -> void:
	if DisplayServer.get_name() != "headless":
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		head.rotation.x = clampf(head.rotation.x - event.relative.y * mouse_sensitivity, -1.5, 1.5)
	elif event.is_action_pressed("menu"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event.is_action_pressed("crouch"):
		_crouching = not _crouching


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity
	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var dir := (transform.basis * Vector3(input.x, 0.0, input.y)).normalized()
	var speed := crouch_speed if _crouching else (sprint_speed if Input.is_action_pressed("sprint") else walk_speed)
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed
	head.position.y = lerpf(head.position.y, 1.05 if _crouching else 1.65, minf(1.0, delta * 12.0))
	move_and_slide()
