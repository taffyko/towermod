use godot::prelude::*;
use super::*;
use towermod::cstc;

GD_AUTOSTRUCT! {
	#[var]
	pub .. "towermod/src/cstc/stable/mod.rs" cstc::ObjectInstance {
		#[var(get)] pub object_type_id,
		#[var(get)] pub id,
		#[var(get)] pub private_variables: Array<GString>,
		#[var] pub data: Option<Gd<Object>>,
	}
	#[derive(Debug, GodotClass)]
	#[class(init)]
	pub struct CstcObjectInstance {
		#[allow(unused)]
		owner: Gd<WeakRef>,
		original_data_raw: Vec<u8>,
		#[var(get)] pub object_type: Gd<CstcObjectType>,
	}
	impl CstcBinding for CstcObjectInstance {
		type Data = cstc::ObjectInstance;
		fn from_data(cstc_data: &Self::Data, owner_weak: Gd<WeakRef>) -> Gd<CstcObjectInstance> {
			FIELDS!(CstcObjectInstance, cstc_data: cstc::ObjectInstance, p_);

			let owner: Gd<CstcData> = owner_weak.get_ref().to();
			let p_object_type = owner.bind().get_object_type(cstc_data.object_type_id).unwrap();
			let p_plugin_name = p_object_type.bind().get_plugin_name();
			let p_original_data_raw = cstc_data.data.clone();
			let p_data: Option<Gd<Object>> = match cstc::decode_object_data(&cstc_data.data, &p_plugin_name.to_string()) {
				cstc::ObjectData::Text(data) => Some(CstcTextObjectData::from_data(&data, owner_weak.clone()).upcast()),
				cstc::ObjectData::Sprite(data) => Some(CstcSpriteObjectData::from_data(&data, owner_weak.clone()).upcast()),
				_ => None,
			};
			let p_owner = owner_weak;

			return Gd::from_object(INIT!(CstcObjectInstance, p_));
		}

		fn to_data(&self) -> Self::Data {
			FIELDS!(cstc::ObjectInstance, self: CstcObjectInstance, p_);
			let p_data = match &self.data {
				None => self.original_data_raw.clone(),
				Some(o) => {
					if let Ok(o) = o.clone().try_cast::<CstcTextObjectData>() { o.bind().to_data().to_bin() }
					else if let Ok(o) = o.clone().try_cast::<CstcSpriteObjectData>() { o.bind().to_data().to_bin() }
					else { self.original_data_raw.clone() }
				}
			};
			INIT!(cstc::ObjectInstance, p_)
		}
	}

}
#[godot_api]
impl CstcObjectInstance {}
