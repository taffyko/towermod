use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Animation {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcAnimation {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcAnimation {
		type Data = cstc::Animation;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcAnimation, data: cstc::Animation);
			Gd::from_object(INIT!(CstcAnimation))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Animation, self: CstcAnimation);
			INIT!(cstc::Animation)
		}
	}
}
#[godot_api]
impl CstcAnimation {}
