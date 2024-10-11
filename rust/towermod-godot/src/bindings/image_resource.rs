use godot::{prelude::*};
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ImageMetadata {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcImageMetadata {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcImageMetadata {
		type Data = cstc::ImageMetadata;

		fn from_data(cstc_data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcImageMetadata, cstc_data: cstc::ImageMetadata);
			Gd::from_object(INIT!(CstcImageMetadata))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ImageMetadata, self: CstcImageMetadata);
			INIT!(cstc::ImageMetadata)
		}
	}
}
#[godot_api]
impl CstcImageMetadata {

}

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ActionPoint {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcActionPoint {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcActionPoint {
		type Data = cstc::ActionPoint;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcActionPoint, data: cstc::ActionPoint);
			Gd::from_object(INIT!(CstcActionPoint))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ActionPoint, self: CstcActionPoint);
			INIT!(cstc::ActionPoint)
		}
	}
}
#[godot_api]
impl CstcActionPoint {}
