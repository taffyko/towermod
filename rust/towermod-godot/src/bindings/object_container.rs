use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Container {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcObjectContainer {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcObjectContainer {
		type Data = cstc::Container;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcObjectContainer, data: cstc::Container);
			Gd::from_object(INIT!(CstcObjectContainer))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Container, self: CstcObjectContainer);
			INIT!(cstc::Container)
		}
	}
}
#[godot_api]
impl CstcObjectContainer {}
