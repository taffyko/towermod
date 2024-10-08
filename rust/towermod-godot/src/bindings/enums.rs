use autostruct::AUTOENUM;
use godot::{builtin::GString, register::{Export, GodotConvert, Var}};
use towermod::cstc;
use strum_macros::{EnumIter, Display};
use num_derive::{FromPrimitive, ToPrimitive};

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcTextureLoadingMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::TextureLoadingMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcLayerSamplerMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::LayerSamplerMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcLayerType {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::LayerType;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcDisableShaderWhen {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::DisableShaderWhen;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcPrivateVariableType {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::PrivateVariableType;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcFpsMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::FpsMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcSamplerMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::SamplerMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcTextRenderingMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::TextRenderingMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcSimulateShadersMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::SimulateShadersMode;
}

AUTOENUM! {
	#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
	#[godot(via = GString)]
	#[repr(i32)]
	pub enum CstcResizeMode {}
	#[attr_first(default)]
	.. "towermod/src/cstc/stable/mod.rs" cstc::ResizeMode;
}


#[derive(Debug, Clone, Copy, EnumIter, Display, FromPrimitive, ToPrimitive, GodotConvert, Var, Export, Default)]
#[godot(via = GString)]
#[repr(i32)]
enum CstcError {
	#[default]
	Ok = 0,
	/// Game path not set or no file present at path
	GameNotFound,
	/// Ran into unexpected bytes when attempting to parse game data
	ParseError,
}
