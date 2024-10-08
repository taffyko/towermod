use godot::prelude::*;
use godot::classes::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::AnimationFrame {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcAnimationFrame {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcAnimationFrame {
		type Data = cstc::AnimationFrame;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcAnimationFrame, data: cstc::AnimationFrame);
			Gd::from_object(INIT!(CstcAnimationFrame))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::AnimationFrame, self: CstcAnimationFrame);
			INIT!(cstc::AnimationFrame)
		}
	}
}
#[godot_api]
impl CstcAnimationFrame {}
