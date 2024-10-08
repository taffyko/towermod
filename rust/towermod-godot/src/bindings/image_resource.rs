use godot::{engine::Image, prelude::*};
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ImageResource {
		#[map(vec_to_image, image_to_vec)]
		#[var]
		pub data: Gd<Image>,
		pub collision_mask, // TODO
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcImageResource {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcImageResource {
		type Data = cstc::ImageResource;

		fn from_data(cstc_data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcImageResource, cstc_data: cstc::ImageResource);
			Gd::from_object(INIT!(CstcImageResource))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ImageResource, self: CstcImageResource);
			INIT!(cstc::ImageResource)
		}
	}
}
#[godot_api]
impl CstcImageResource {

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
