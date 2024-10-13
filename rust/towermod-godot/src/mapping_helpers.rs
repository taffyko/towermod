use std::collections::HashMap;

use godot::{builtin::{meta::GodotType, PackedByteArray}, engine::{Image, WeakRef}, meta::ArrayElement, obj::{bounds::DeclUser, Bounds}, prelude::{Array, Dictionary, FromGodot, GString, Gd, GodotClass, Object, ToGodot, Variant, VariantType}};
use serde::{Deserialize, Serialize};
use std::path::{PathBuf, Path};
use towermod::cstc;
use crate::bindings::{CstcBinding, CstcEvent, CstcEventGroup, CstcEventInclude};
use num_traits::{FromPrimitive, ToPrimitive};

pub fn gd_to_string(s: impl ToString) -> String {
	s.to_string().replace("\n", "\r\n")
}
pub fn string_to_gd(s: impl AsRef<str>) -> GString {
	godot::builtin::GString::from(&s.as_ref().replace("\r\n", "\n"))
}

pub fn string_vec_to_gd(a: &[String]) -> Array<GString> {
	a.iter().map(|o| string_to_gd(o)).collect()
}
pub fn gd_to_string_vec(a: &Array<GString>) -> Vec<String> {
	a.iter_shared().map(|o| gd_to_string(o)).collect()
}

pub fn path_to_gd(path: impl AsRef<Path>) -> GString {
	string_to_gd(path.as_ref().to_string_lossy())
}
pub fn gd_to_path(path: impl ToString) -> PathBuf {
	PathBuf::from(path.to_string())
}

pub fn serde_to_gd<T: Serialize>(value: &T) -> Variant {
	let s = serde_json::to_string(value).unwrap();
	godot::engine::Json::parse_string(s.into())
}

pub fn gd_to_serde<T: for<'a> Deserialize<'a>>(value: impl ToGodot) -> T {
	let s = godot::engine::Json::stringify(value.to_variant());
	serde_json::from_str(&s.to_string()).unwrap()
}

pub fn from_trait_to_gd<'a, X, Y: GodotClass + Bounds<Declarer = DeclUser> + From<&'a X>>(v: &'a X) -> Gd<Y> {
	Gd::from_object(From::from(v))
}

pub fn from_trait_from_gd<Y: GodotClass + Bounds<Declarer = DeclUser>, X: for<'b> From<&'b Y>>(v: &Gd<Y>) -> X {
	let v = v.bind();
	From::from(&*v)
}

pub fn cstc_private_variables_to_gd(data: &[cstc::PrivateVariable]) -> Dictionary {
	data.iter().map(|o| {
		let cstc::PrivateVariable { name, value_type } = o;
		(string_to_gd(name), *value_type as i32)
	}).collect()
}
pub fn gd_to_cstc_private_variables(data: &Dictionary) -> Vec<cstc::PrivateVariable> {
	data.iter_shared().filter_map(|(key, value)| {
		if VariantType::STRING != key.get_type() { return None }
		let name = gd_to_string(key.to::<GString>());
		if VariantType::INT != value.get_type() { return None }
		let value_type = cstc::PrivateVariableType::from_i32(value.to()).unwrap();
		Some(cstc::PrivateVariable { name, value_type })
	}).collect()
}
pub fn option_map<X, Y>(o: &Option<X>, f: fn(&X) -> Y) -> Option<Y> {
	o.as_ref().map(f)
}

pub fn ace_categories_to_gd(data: &cstc::plugin::AceCategories) -> Dictionary {
	data.iter().map(|(k, v)| {
		(string_to_gd(k), v.iter().map(|item| { (*item, Variant::nil()) }).collect::<Dictionary>())
	}).collect()
}

pub fn cstc_data_keys_to_gd(data: &[cstc::DataKey]) -> Dictionary {
	data.iter().map(|o| {
		match o {
			cstc::DataKey::Pointer(key, value) => (string_to_gd(&key).to_variant(), value.to_variant()),
			cstc::DataKey::String(key, value) => (string_to_gd(&key).to_variant(), string_to_gd(&value).to_variant()),
		}
	}).collect()
}
pub fn gd_to_cstc_data_keys(data: &Dictionary) -> Vec<cstc::DataKey> {
	data.iter_shared().filter_map(|(key, value)| {
		let key = match key.get_type() {
			VariantType::STRING => gd_to_string(key.to::<GString>()),
			_ => return None,
		};
		Some(match value.get_type() {
			VariantType::STRING => cstc::DataKey::String(key, gd_to_string(value.to::<GString>())),
			VariantType::INT => cstc::DataKey::Pointer(key, value.to()),
			_ => return None,
		})
	}).collect()
}

pub fn cstc_feature_descriptors_to_gd(data: &[cstc::FeatureDescriptor]) -> Dictionary {
	data.iter().map(|o| {
		return (string_to_gd(&o.script_name).to_variant(), o.param_count.to_variant())
	}).collect()
}
pub fn gd_to_cstc_feature_descriptors(data: &Dictionary) -> Vec<cstc::FeatureDescriptor> {
	data.iter_shared().filter_map(|(key, value)| {
		let key = match key.get_type() {
			VariantType::STRING => gd_to_string(key.to::<GString>()),
			_ => return None,
		};
		Some(match value.get_type() {
			VariantType::INT => cstc::FeatureDescriptor { script_name: key, param_count: value.to() },
			_ => return None,
		})
	}).collect()
}

pub fn vec_to_gd<I, T>(iter: &I) -> Array<T> where
	I: Clone + IntoIterator<Item = T>,
	T: GodotType + ToGodot + ArrayElement,
{
	iter.clone().into_iter().collect()
}
pub fn gd_to_vec<T: GodotType + FromGodot + ArrayElement>(a: &Array<T>) -> Vec<T> {
	a.iter_shared().collect()
}

pub fn data_vec_to_gd<D, T: GodotClass + CstcBinding<Data = D>>(a: &[D], owner: &Gd<WeakRef>) -> Array<Gd<T>> {
	a.iter().map(|o| {
		CstcBinding::from_data(o, owner.clone())
	}).collect()
}

pub fn data_vec_to_dict_gd<K: ToGodot, T: GodotClass + CstcBinding>(a: &[T::Data], owner: &Gd<WeakRef>, key: impl Fn(&T::Data) -> K) -> Dictionary {
	a.iter().map(|o| -> (K, Gd<T>) {
		(key(o), CstcBinding::from_data(o, owner.clone()))
	}).collect()
}

pub fn gd_dict_to_data_vec<T: GodotClass + CstcBinding>(a: &Dictionary) -> Vec<T::Data> {
	a.values_array().iter_shared().map(|o| {
		o.try_to::<Gd<T>>().unwrap().bind().to_data()
	}).collect()
}

pub fn gd_to_data_vec<D, T: GodotClass + CstcBinding<Data = D>>(a: &Array<Gd<T>>) -> Vec<D> {
	a.iter_shared().map(|o| {
		o.bind().to_data()
	}).collect()
}

pub fn data_dict_to_gd<K: ToGodot, V: GodotClass + CstcBinding>(a: &HashMap<K, V::Data>, owner: &Gd<WeakRef>) -> Dictionary {
	a.iter().map(|(k, v)| -> (Variant, Gd<V>) {
		(k.to_variant(), V::from_data(v, owner.clone()))
	}).collect()
}

pub fn variant_dict_to_gd<K: ToGodot, V: ToGodot>(a: &HashMap<K, V>) -> Dictionary {
	a.iter().map(|(k, v)| -> (Variant, Variant) {
		(k.to_variant(), v.to_variant())
	}).collect()
}

pub fn data_option_to_gd<D, T>(data: &Option<D>, owner: &Gd<WeakRef>) -> Option<Gd<T>> where 
	T: GodotClass + CstcBinding<Data = D>,
{
	data.as_ref().map(|data| {
		CstcBinding::from_data(data, owner.clone())
	})
}

pub fn datetime_to_gd(data: &time::OffsetDateTime) -> i64 {
	data.unix_timestamp()
}
pub fn gd_to_datetime(data: i64) -> time::OffsetDateTime {
	time::OffsetDateTime::from_unix_timestamp(data).unwrap()
}

pub fn cstc_events_to_gd(data: &Vec<cstc::SomeEvent>, owner: &Gd<WeakRef>) -> Array<Gd<Object>> {
	data.iter().map(|e| {
		match e {
			cstc::SomeEvent::Event(data) => CstcEvent::from_data(data, owner.clone()).upcast(),
			cstc::SomeEvent::EventGroup(data) => CstcEventGroup::from_data(data, owner.clone()).upcast(),
			cstc::SomeEvent::EventInclude(data) => CstcEventInclude::from_data(data, owner.clone()).upcast(),
		}
	}).collect()
}

pub fn gd_to_cstc_events(data: &Array<Gd<Object>>) -> Vec<cstc::SomeEvent> {
	data.iter_shared().map(|o| {
		if let Ok(o) = o.clone().try_cast::<CstcEvent>() { cstc::SomeEvent::Event(o.bind().to_data()) }
		else if let Ok(o) = o.clone().try_cast::<CstcEventGroup>() { cstc::SomeEvent::EventGroup(o.bind().to_data()) }
		else if let Ok(o) = o.clone().try_cast::<CstcEventInclude>() { cstc::SomeEvent::EventInclude(o.bind().to_data()) }
		// panic if non-Event object is in array
		else { panic!() }
	}).collect()
}

pub fn option_vec_to_image(vec: &Option<Vec<u8>>) -> Option<Gd<Image>> {
	if let Some(vec) = vec.as_ref() {
		let Some(mut image) = Image::create(1, 1, false, godot::classes::image::Format::RGBA8) else { return None };
		if image.load_png_from_buffer(PackedByteArray::from(vec.as_slice())) == godot::global::Error::OK {
			return Some(image)
		}
	}
	None
}
pub fn option_image_to_vec(image: &Option<Gd<Image>>) -> Option<Vec<u8>> {
	if let Some(image) = image.as_ref() {
		if !image.is_empty() {
			let buf = image.save_png_to_buffer();
			return Some(buf.to_vec());
		}
	}
	None
}
pub fn vec_to_image(slice: &[u8]) -> Gd<Image> {
	let mut image = Image::create(1, 1, false, godot::classes::image::Format::RGBA8).expect("unable to create image");
	if image.load_png_from_buffer(PackedByteArray::from(slice)) == godot::global::Error::OK {
		return image
	} else {
		panic!("unable to load image")
	}
}
pub fn image_to_vec(image: &Gd<Image>) -> Vec<u8> {
	let buf = image.save_png_to_buffer();
	buf.to_vec()
}

pub fn packed_byte_array_to_vec(arr: &PackedByteArray) -> Vec<u8> {
	Vec::from(arr.as_slice())
}
pub fn slice_to_packed_byte_array(slice: &[u8]) -> PackedByteArray {
	PackedByteArray::from(slice)
}


pub fn enum_to_i32<T: ToPrimitive>(e: T) -> i32 {
	e.to_i32().unwrap()
}
pub fn i32_to_enum<T: FromPrimitive>(i: i32) -> T {
	T::from_i32(i).unwrap()
}

pub fn gd_to_data_option<D, T>(data: &Option<Gd<T>>) -> Option<D> where 
	T: GodotClass + CstcBinding<Data = D>,
{
	data.as_ref().map(|o| {
		o.bind().to_data()
	})
}

pub fn gd_to_data<D, T>(data: &Gd<T>) -> D where
	T: GodotClass + CstcBinding<Data = D>,
{
	data.bind().to_data()
}
