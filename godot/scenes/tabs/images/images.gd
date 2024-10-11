extends PanelContainer

@export var browse_images: Button
@export var dump_images: Button

var image_dump_dir: String

func _ready():
	Util.app_state_changed.connect(_on_app_state_changed)
	update_browse_images()

func _on_app_state_changed(prev_state: Util.AppState, state: Util.AppState):
	dump_images.disabled = !state.game
	if state.game != prev_state.game:
		if state.game:
			var dir = await Towermod.image_dump_dir()
			image_dump_dir = dir
			update_browse_images()
		else:
			image_dump_dir = ""
			update_browse_images()

func _on_dump_images_pressed():
	await Util.spin(Towermod.dump_images())
	Util.toast("Images dumped")
	update_browse_images()

func update_browse_images():
	browse_images.disabled = true
	if image_dump_dir:
		Thread.new().start(func():
			if DirAccess.dir_exists_absolute(image_dump_dir):
				(func():
					browse_images.disabled = false
				).call_deferred()
		)

func _on_main_tab_switched(new_tab_name):
	if new_tab_name == name:
		pass

func _on_browse_images_pressed():
	var dir = await Towermod.image_dump_dir()
	OS.shell_open(dir)
