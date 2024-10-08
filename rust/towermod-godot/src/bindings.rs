use godot::{engine::WeakRef, obj::{bounds::DeclUser, Bounds}, prelude::{Gd, GodotClass}};

pub trait CstcBinding: GodotClass + Bounds<Declarer = DeclUser> {
	type Data;
	fn from_data(data: &Self::Data, owner: Gd<WeakRef>) -> Gd<Self>;
	fn to_data(&self) -> Self::Data;
}

mod data;
mod enums;

pub use enums::*;
pub use super::mapping_helpers::*;
pub use data::*;


mod etc {
	mod project;
	pub use project::*;
}
pub use etc::*;

mod app_block;
mod layout;
mod layout_layer;
mod object_type;
mod object_instance;
mod object_container;
mod text_object_data;
mod sprite_object_data;
mod plugin_data;
mod behavior;
mod object_trait;
mod animation;
mod animation_frame;
mod family;
mod feature_descriptors;
mod image_resource;
mod event;

pub use feature_descriptors::*;
pub use animation_frame::*;
pub use behavior::*;
pub use object_trait::*;
pub use object_container::*;
pub use family::*;
pub use animation::*;
pub use layout::*;
pub use layout_layer::*;
pub use object_type::*;
pub use object_instance::*;
pub use text_object_data::*;
pub use sprite_object_data::*;
pub use plugin_data::*;
pub use app_block::*;
pub use image_resource::*;
pub use event::*;
pub use autostruct::AUTOSTRUCT;

pub mod macros {
	macro_rules! GD_AUTOSTRUCT {
		($($body:tt)*) => {
			AUTOSTRUCT! {
				#[map(String, GString, string_to_gd, gd_to_string)]
				#[map(Vec<String>, Array<GString>, string_vec_to_gd, gd_to_string_vec)]
				#[map(Vec<PrivateVariable>, Dictionary, cstc_private_variables_to_gd, gd_to_cstc_private_variables)]
				#[map(Vec<DataKey>, Dictionary, cstc_data_keys_to_gd, gd_to_cstc_data_keys)]
				#[map(Vec<FeatureDescriptor>, Dictionary, cstc_feature_descriptors_to_gd, gd_to_cstc_feature_descriptors)]
				#[map(Vec<Vec<Token>>, Vec<Vec<cstc::Token>>, Clone::clone, Clone::clone)] // TODO
				#[map(Vec<i32>, Array<i32>, vec_to_gd, gd_to_vec)]
				#[map(Vec<u8>, Vec<u8>, Clone::clone, Clone::clone)]

				#[map(HashMap<i32, AcesEntry>, Dictionary, |d| data_dict_to_gd::<i32, CstcAcesEntry>(d, &owner))]
				#[map(AceCategories, Dictionary, ace_categories_to_gd)]
				#[map(Vec<CPropItem>, Array<Gd<CstcCPropItem>>, |d| data_vec_to_gd(d, &owner))]
				#[map(Vec<Param>, Array<Gd<CstcParam>>, |d| data_vec_to_gd(d, &owner))]
				#[map(PluginStringTable, Gd<CstcPluginStringTable>, |d| CstcBinding::from_data(d, owner.clone()))]

				#[map(Animation, Gd<CstcAnimation>, |d| CstcBinding::from_data(d, owner.clone()), gd_to_data)]
				#[map(Vec<GlobalVariable>, Array<Gd<CstcGlobalVariable>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<BehaviorControl>, Array<Gd<CstcBehaviorControl>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<Layout>, Array<Gd<CstcLayout>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<LayoutLayer>, Array<Gd<CstcLayoutLayer>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<ObjectInstance>, Array<Gd<CstcObjectInstance>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<ObjectType>, Array<Gd<CstcObjectType>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<Animation>, Array<Gd<CstcAnimation>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<AnimationFrame>, Array<Gd<CstcAnimationFrame>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<ObjectTrait>, Array<Gd<CstcObjectTrait>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Option<FeatureDescriptors>, Option<Gd<CstcFeatureDescriptors>>, |d| data_option_to_gd(d, &owner), gd_to_data_option)]
				#[map(Vec<EventCondition>, Array<Gd<CstcEventCondition>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<EventAction>, Array<Gd<CstcEventAction>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<ActionPoint>, Array<Gd<CstcActionPoint>>, |d| data_vec_to_gd(d, &owner), gd_to_data_vec)]
				#[map(Vec<SomeEvent>, Array<Gd<Object>>, |d| cstc_events_to_gd(d, &owner), gd_to_cstc_events)]

				#[map(TextureLoadingMode, CstcTextureLoadingMode, From::from, From::from)]
				#[map(LayerSamplerMode, CstcLayerSamplerMode, From::from, From::from)]
				#[map(LayerType, CstcLayerType, From::from, From::from)]
				#[map(DisableShaderWhen, CstcDisableShaderWhen, From::from, From::from)]
				#[map(PrivateVariableType, CstcPrivateVariableType, From::from, From::from)]
				#[map(FpsMode, CstcFpsMode, From::from, From::from)]
				#[map(SamplerMode, CstcSamplerMode, From::from, From::from)]
				#[map(TextRenderingMode, CstcTextRenderingMode, From::from, From::from)]
				#[map(SimulateShadersMode, CstcSimulateShadersMode, From::from, From::from)]
				#[map(ResizeMode, CstcResizeMode, From::from, From::from)]
				
				// etc (non-cstc structs)
				#[map(time::OffsetDateTime, i64, datetime_to_gd, move gd_to_datetime)]
				#[mapgeneric(Option, Option, option_map, option_map)]
				#[map(GameType, TowermodGameType, From::from, From::from)]
				#[map(ModType, TowermodModType, From::from, From::from)]
				#[map(ProjectType, TowermodProjectType, From::from, From::from)]
				#[map(Project, Gd<TowermodProject>, from_trait_to_gd, from_trait_from_gd)]
				#[map(Game, Gd<TowermodGame>, from_trait_to_gd, from_trait_from_gd)]
				#[map(PathBuf, GString, path_to_gd, gd_to_path)]
				#[map(Option<String>, GString, |o: &Option<String>| o.as_ref().map(string_to_gd).unwrap_or(GString::from("")), |g| Some(gd_to_string(g)))]
				#[map(Option<PathBuf>, GString, |o: &Option<PathBuf>| o.as_ref().map(path_to_gd).unwrap_or(GString::from("")), |g| Some(gd_to_path(g)))]

				$($body)*
			}
		}
	}
	pub(crate) use GD_AUTOSTRUCT;
}
pub(crate) use macros::*;

mod hinting {
	use std::fmt::Display;
	use godot::builtin::GString;
	use num_traits::ToPrimitive;

	/// gdext doesn't support enum property hints so I have to bodge something together myself
	pub fn enum_hint_string<T: ToPrimitive + Display>(enum_iter: impl Iterator<Item = T>) -> GString {
		let mut vec = Vec::new();
		for variant in enum_iter {
			let value = variant.to_i32().unwrap();
			vec.push(format!("{variant}:{value}"));
		}
		vec.join(",").into()
	}
}
pub use hinting::*;
