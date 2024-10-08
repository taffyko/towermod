use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::Family {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcFamily {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcFamily {
		type Data = cstc::Family;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcFamily, data: cstc::Family);
			Gd::from_object(INIT!(CstcFamily))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::Family, self: CstcFamily);
			INIT!(cstc::Family)
		}
	}
}
#[godot_api]
impl CstcFamily {}
