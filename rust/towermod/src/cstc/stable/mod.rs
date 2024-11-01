pub const CAP_BEGINEVENTLIST: u8 = 1;
pub const CAP_BEGINEVENT: u8 = 2;
pub const CAP_BEGINCONDITIONS: u8 = 3;
pub const CAP_BEGINCONDITION: u8 = 4;
pub const CAP_ENDCONDITION: u8 = 5;
pub const CAP_ENDCONDITIONS: u8 = 6;
pub const CAP_BEGINACTIONS: u8 = 7;
pub const CAP_BEGINACTION: u8 = 8;
pub const CAP_ENDACTION: u8 = 9;
pub const CAP_ENDACTIONS: u8 = 10;
pub const CAP_BEGINPARAM: u8 = 11;
pub const CAP_ENDPARAM: u8 = 12;
pub const CAP_ENDEVENT: u8 = 13;
pub const CAP_ENDEVENTLIST: u8 = 14;
pub const CAP_BEGINGROUP: u8 = 15;
pub const CAP_ENDGROUP: u8 = 16;

use napi_derive::napi;
use num_derive::{FromPrimitive, ToPrimitive};
use serde::{Serialize, Deserialize};

use crate::Nt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Token {
	Integer(i64),
	/// Color is serialized as Integer in the exported game
	Color(i64),
	Float(f64),
	StringLiteral(String),
	Identifier(String),
	VariableName(String),
	Token(TokenKind),
}
impl From<&Token> for TokenKind {
	fn from(value: &Token) -> Self {
		match value {
			Token::Integer(_) => TokenKind::Integer,
			Token::Float(_) => TokenKind::Float,
			Token::StringLiteral(_) => TokenKind::StringLiteral,
			Token::Identifier(_) => TokenKind::Identifier,
			Token::VariableName(_) => TokenKind::VariableName,
			Token::Color(_) => TokenKind::Color,
			Token::Token(t) => TokenKind::from(t.clone()),
		}
	}
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum TokenKind {
	Null,
	AnyBinaryOperator,
	AnyFunction,
	AnyValue,

	// Operand types
	Integer, Float, StringLiteral, Identifier, Array, VariableName,
	// Special operators: ( ) , . { }
	LeftParen, RightParen, Comma, Dot,
	LeftBrace, RightBrace, At,
	// Binary operators: + - * / % ^
	Add, Subtract, Multiply, Divide, Mod,
	Power,
	// Unary function operators: sin cos tan sqrt str int float
	Sin, Cos, Tan, Sqrt,
	FuncStr, FuncInt, FuncFloat,
	// Comparison operators = < > <= >= <> ? : and or
	Equal, Less, Greater,
	LessEqual, GreaterEqual, NotEqual,
	Conditional, Colon,
	And, Or,
	// Mathematical operators
	Asin, Acos, Atan, Abs,
	Exp, Ln, Log10, Floor,
	Ceil, Round, Random, Len,

	Whitespace, Color,
}

#[napi]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataKey {
	Pointer(String, u32),
	String(String, String),
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum TextureLoadingMode {
	LoadOnAppStart,
	LoadOnLayoutStart,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventBlock {
	pub sheet_names: Vec<String>,
	pub layout_sheets: Vec<Vec<SomeEvent>>,
}

pub type ImageBlock = Vec<ImageResource>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SomeEvent {
	Event(Event),
	EventGroup(EventGroup),
	EventInclude(i32),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventGroup {
	pub active: bool,
	pub name: String,
	pub events: Vec<SomeEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
	pub line_number: i32,
	pub sheet_id: i32,
	pub conditions: Vec<EventCondition>,
	pub actions: Vec<EventAction>,
	pub events: Vec<SomeEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventCondition {
	pub object_id: i32,
	pub cond_id: i32,
	pub negated: bool,
	pub movement_id: i32,
	pub params: Vec<Vec<Token>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAction {
	pub object_id: i32,
	pub action_id: i32,
	pub movement_id: i32,
	pub params: Vec<Vec<Token>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelBlock {
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub containers: Vec<Container>,
	pub layouts: Vec<Layout>,
	pub animations: Vec<Animation>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectType {
	pub id: i32,
	pub name: String,
	/// Index of the .csx plugin associated with this ObjectType
	pub plugin_id: i32,
	pub global: bool,
	pub destroy_when: DisableShaderWhen,
	pub private_variables: Vec<PrivateVariable>,
	pub descriptors: Option<FeatureDescriptors>,

	#[napi(ts_type = "'ObjectType'")]
	#[serde(skip, default = "ObjectType::type_name")]
	pub _type: &'static str,
}
impl ObjectType {
	pub fn type_name() -> &'static str { "ObjectType" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureDescriptors {
	pub actions: Vec<FeatureDescriptor>,
	pub conditions: Vec<FeatureDescriptor>,
	pub expressions: Vec<FeatureDescriptor>,
}

#[napi(object)]

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Behavior {
	pub object_type_id: i32,
	pub new_index: i32,
	pub mov_index: i32,
	pub name: String,
	pub data: Vec<u8>,
	pub descriptors: Option<FeatureDescriptors>,

	#[napi(ts_type = "'Behavior'")]
	#[serde(skip, default = "Behavior::type_name")]
	pub _type: &'static str,
}
impl Behavior {
	pub fn type_name() -> &'static str { "Behavior" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Container {
	pub object_ids: Vec<i32>,

	#[napi(ts_type = "'Container'")]
	#[serde(skip, default = "Container::type_name")]
	pub _type: &'static str,
}
impl Container {
	pub fn type_name() -> &'static str { "Container" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Family {
	// Unique name.
	pub name: String,
	pub object_type_ids: Vec<i32>,
	pub private_variables: Vec<PrivateVariable>,

	#[napi(ts_type = "'Family'")]
	#[serde(skip, default = "Family::type_name")]
	pub _type: &'static str,
}
impl Family {
	pub fn type_name() -> &'static str { "Family" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectTrait {
	pub name: String,
	pub object_type_ids: Vec<i32>,

	#[napi(ts_type = "'ObjectTrait'")]
	#[serde(skip, default = "ObjectTrait::type_name")]
	pub _type: &'static str,
}
impl ObjectTrait {
	pub fn type_name() -> &'static str { "ObjectTrait" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layout {
	/// Unique name.
	pub name: String,
	pub width: i32,
	pub height: i32,
	pub color: i32,
	pub unbounded_scrolling: bool,
	pub application_background: bool,
	pub data_keys: Vec<DataKey>,
	pub layers: Vec<LayoutLayer>,
	pub image_ids: Vec<i32>,
	pub texture_loading_mode: TextureLoadingMode,

	#[napi(ts_type = "'Layout'")]
	#[serde(skip, default = "Layout::type_name")]
	pub _type: &'static str,
}
impl Layout {
	pub fn type_name() -> &'static str { "Layout" }
}


#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutLayer {
	pub id: i32,
	pub name: String,
	pub layer_type: LayerType,
	pub filter_color: i32,
	#[napi(ts_type = "number")]
	pub opacity: Nt<f32>,
	#[napi(ts_type = "number")]
	pub angle: Nt<f32>,
	#[napi(ts_type = "number")]
	pub scroll_x_factor: Nt<f32>,
	#[napi(ts_type = "number")]
	pub scroll_y_factor: Nt<f32>,
	#[napi(ts_type = "number")]
	pub scroll_x: Nt<f32>,
	#[napi(ts_type = "number")]
	pub scroll_y: Nt<f32>,
	#[napi(ts_type = "number")]
	pub zoom_x_factor: Nt<f32>,
	#[napi(ts_type = "number")]
	pub zoom_y_factor: Nt<f32>,
	#[napi(ts_type = "number")]
	pub zoom_x: Nt<f32>,
	#[napi(ts_type = "number")]
	pub zoom_y: Nt<f32>,
	pub clear_background_color: bool,
	pub background_color: i32,
	pub force_own_texture: bool,
	pub sampler: LayerSamplerMode,
	pub enable_3d: bool,
	pub clear_depth_buffer: bool,
	pub objects: Vec<ObjectInstance>,

	#[napi(ts_type = "'LayoutLayer'")]
	#[serde(skip, default = "LayoutLayer::type_name")]
	pub _type: &'static str,
}
impl LayoutLayer {
	pub fn type_name() -> &'static str { "LayoutLayer" }
}


#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum LayerSamplerMode {
	Default,
	Point,
	Linear,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectInstance {
	pub id: i32,
	pub object_type_id: i32,
	pub x: i32,
	pub y: i32,
	pub width: i32,
	pub height: i32,
	#[napi(ts_type = "number")]
	pub angle: Nt<f32>,
	pub filter: i32,
	pub private_variables: Vec<String>,
	pub data: Vec<u8>,
	pub key: i32,

	#[napi(ts_type = "'ObjectInstance'")]
	#[serde(skip, default = "ObjectInstance::type_name")]
	pub _type: &'static str,
}
impl ObjectInstance {
	pub fn type_name() -> &'static str { "ObjectInstance" }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[napi(object)]
pub struct Animation {
	pub id: i32,
	pub name: String,
	pub tag: i32,
	#[napi(ts_type = "number")]
	pub speed: Nt<f32>,
	pub is_angle: bool,
	#[napi(ts_type = "number")]
	pub angle: Nt<f32>,
	/// -1 == forever
	pub repeat_count: i32,
	pub repeat_to: i32,
	pub ping_pong: bool,
	pub frames: Vec<AnimationFrame>,
	pub sub_animations: Vec<Animation>,

	#[napi(ts_type = "'Animation'")]
	#[serde(skip, default = "Animation::type_name")]
	pub _type: &'static str,
}
impl Animation {
	pub fn type_name() -> &'static str { "Animation" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnimationFrame {
	#[napi(ts_type = "number")]
	pub duration: Nt<f32>,
	pub image_id: i32,

	#[napi(ts_type = "'AnimationFrame'")]
	#[serde(skip, default = "AnimationFrame::type_name")]
	pub _type: &'static str,

}
impl AnimationFrame {
	pub fn type_name() -> &'static str { "AnimationFrame" }
}

#[napi]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum LayerType {
	Normal,
	WindowCtrls,
	NonFrame,
	Include,
}

#[napi]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum DisableShaderWhen {
	NoSetting,
	Ps20Unavailable,
	Ps20Available,
	Ps14Unavailable,
	Ps14Available,
	Ps11Unavailable,
	Ps11Available,
}

#[napi]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum PrivateVariableType {
	Integer,
	String,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivateVariable {
	pub name: String,
	pub value_type: PrivateVariableType,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureDescriptor {
	pub script_name: String,
	pub param_count: u32,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPoint {
	pub x: i32,
	pub y: i32,
	pub string: String,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResource {
	pub id: i32,
	pub hotspot_x: i32,
	pub hotspot_y: i32,
	pub data: Vec<u8>,
	pub apoints: Vec<ActionPoint>,
	pub collision_width: u32,
	pub collision_height: u32,
	pub collision_pitch: i32,
	pub collision_mask: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
	pub id: i32,
	pub hotspot_x: i32,
	pub hotspot_y: i32,
	pub apoints: Vec<ActionPoint>,
	// typically the same as the image's width in pixels
	pub collision_width: u32,
	// typically the same as the image's height in pixels
	pub collision_height: u32,
	pub collision_pitch: i32,
	pub collision_mask: Vec<u8>,
}

impl From<ImageResource> for ImageMetadata {
	fn from(o: ImageResource) -> Self {
		let ImageResource { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask, .. } = o;
		ImageMetadata { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask }
	}
}

impl ImageResource {
	pub fn new(metadata: ImageMetadata, data: Vec<u8>) -> Self {
		let ImageMetadata { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask } = metadata;
		ImageResource { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask, data }
	}
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppBlock {
	pub name: String,
	pub window_width: i32,
	pub window_height: i32,
	#[napi(ts_type = "number")]
	pub eye_distance: Nt<f32>,
	pub show_menu: bool,
	pub screensaver: bool,
	pub fps_mode: FpsMode,
	pub fps: i32,
	pub fullscreen: bool,
	pub sampler_mode: SamplerMode,
	pub global_variables: Vec<GlobalVariable>,
	pub behavior_controls: Vec<BehaviorControl>,
	pub disable_windows_key: bool,
	pub data_keys: Vec<DataKey>,
	pub simulate_shaders: SimulateShadersMode,
	pub original_project_path: String,
	pub fps_in_caption: i32,
	pub use_motion_blur: bool,
	pub motion_blur_steps: i32,
	pub text_rendering_mode: TextRenderingMode,
	pub override_timedelta: bool,
	#[napi(ts_type = "number")]
	pub time_delta_override: Nt<f32>,
	pub caption: bool,
	pub minimize_box: bool,
	pub maximize_box: bool,
	pub resize_mode: ResizeMode,
	#[napi(ts_type = "number")]
	pub minimum_fps: Nt<f32>,
	pub layout_index: i32,
	pub multisamples: u32,
	pub texture_loading_mode: TextureLoadingMode,


	#[napi(ts_type = "'AppBlock'")]
	#[serde(skip, default = "AppBlock::type_name")]
	pub _type: &'static str,
}
impl AppBlock {
	pub fn type_name() -> &'static str { "AppBlock" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalVariable {
	pub name: String,
	pub var_type: i32,
	pub value: String,

	#[napi(ts_type = "'GlobalVariable'")]
	#[serde(skip, default = "GlobalVariable::type_name")]
	pub _type: &'static str,
}
impl GlobalVariable {
	pub fn type_name() -> &'static str { "GlobalVariable" }
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorControl {
	pub name: String,
	pub vk: i32,
	pub player: i32,

	#[napi(ts_type = "'BehaviorControl'")]
	#[serde(skip, default = "BehaviorControl::type_name")]
	pub _type: &'static str,
}
impl BehaviorControl {
	pub fn type_name() -> &'static str { "BehaviorControl" }
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum FpsMode {
	VSync,
	Unlimited,
	Fixed,
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum SamplerMode {
	Point,
	Linear,
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum TextRenderingMode {
	Aliased,
	AntiAliased,
	ClearType,
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum SimulateShadersMode {
	NoSimulation,
	Ps14,
	Ps11,
	Ps00,
}

#[napi]
#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum ResizeMode {
	Disabled,
	ShowMore,
	Stretch,
}
