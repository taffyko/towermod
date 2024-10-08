use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ObjectTrait {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcObjectTrait {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcObjectTrait {
		type Data = cstc::ObjectTrait;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcObjectTrait, data: cstc::ObjectTrait);
			Gd::from_object(INIT!(CstcObjectTrait))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ObjectTrait, self: CstcObjectTrait);
			INIT!(cstc::ObjectTrait)
		}
	}
}
#[godot_api]
impl CstcObjectTrait {}
