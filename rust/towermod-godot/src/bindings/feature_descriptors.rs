use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::FeatureDescriptors {}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcFeatureDescriptors {
		#[allow(unused)]
		owner: Gd<WeakRef>,
	}
	impl CstcBinding for CstcFeatureDescriptors {
		type Data = cstc::FeatureDescriptors;

		fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self> {
			FIELDS!(CstcFeatureDescriptors, data: cstc::FeatureDescriptors);
			Gd::from_object(INIT!(CstcFeatureDescriptors))
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::FeatureDescriptors, self: CstcFeatureDescriptors);
			INIT!(cstc::FeatureDescriptors)
		}
	}
}
#[godot_api]
impl CstcFeatureDescriptors {}
