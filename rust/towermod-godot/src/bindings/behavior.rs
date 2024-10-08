
use godot::prelude::*;
use super::*;
use towermod::cstc;


GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Behavior {
		pub data,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcBehavior {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcBehavior {
		type Data = cstc::Behavior;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcBehavior, data: cstc::Behavior, p_);
			let p_owner = owner;
			Gd::from_object(INIT!(CstcBehavior, p_))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Behavior, self: CstcBehavior, p_);
			INIT!(cstc::Behavior, p_)
		}
	}
}
#[godot_api]
impl CstcBehavior {}
