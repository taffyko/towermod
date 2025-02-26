//! Structures in this module must not be changed, lest backwards compatibility with existing mods be broken.
//! Serde is used to export and load patches, so the serialized representation must remain stable between towermod versions.

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

use num_derive::{FromPrimitive, ToPrimitive};
use serde::{Serialize, Deserialize};
use serde_alias::serde_alias;


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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataKey {
	Pointer(String, u32),
	String(String, String),
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum TextureLoadingMode {
	LoadOnAppStart,
	LoadOnLayoutStart,
}

#[serde_alias(SnakeCase, CamelCase)]
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

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventGroup {
	pub active: bool,
	pub name: String,
	pub events: Vec<SomeEvent>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
	pub line_number: i32,
	pub sheet_id: i32,
	pub conditions: Vec<EventCondition>,
	pub actions: Vec<EventAction>,
	pub events: Vec<SomeEvent>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventCondition {
	pub object_id: i32,
	pub cond_id: i32,
	pub negated: bool,
	pub movement_id: i32,
	pub params: Vec<Vec<Token>>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAction {
	pub object_id: i32,
	pub action_id: i32,
	pub movement_id: i32,
	pub params: Vec<Vec<Token>>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LevelBlock {
	pub object_types: Vec<ObjectType>,
	pub behaviors: Vec<Behavior>,
	pub traits: Vec<ObjectTrait>,
	pub families: Vec<Family>,
	pub containers: Vec<Container>,
	pub layouts: Vec<Layout>,
	pub animations: Vec<Animation>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectType {
	pub id: i32,
	pub name: String,
	/// Index of the .csx plugin associated with this ObjectType
	pub plugin_id: i32,
	pub global: bool,
	pub destroy_when: DisableShaderWhen,
	pub private_variables: Vec<PrivateVariable>,
	pub descriptors: Option<FeatureDescriptors>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureDescriptors {
	pub actions: Vec<FeatureDescriptor>,
	pub conditions: Vec<FeatureDescriptor>,
	pub expressions: Vec<FeatureDescriptor>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Behavior {
	pub object_type_id: i32,
	pub new_index: i32,
	pub mov_index: i32,
	pub name: String,
	pub data: Vec<u8>,
	pub descriptors: Option<FeatureDescriptors>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Container {
	pub object_ids: Vec<i32>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Family {
	// Unique name.
	pub name: String,
	pub object_type_ids: Vec<i32>,
	pub private_variables: Vec<PrivateVariable>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectTrait {
	pub name: String,
	pub object_type_ids: Vec<i32>,
}

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
}

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutLayer {
	pub id: i32,
	pub name: String,
	pub layer_type: LayerType,
	pub filter_color: i32,
	pub opacity: f32,
	pub angle: f32,
	pub scroll_x_factor: f32,
	pub scroll_y_factor: f32,
	pub scroll_x: f32,
	pub scroll_y: f32,
	pub zoom_x_factor: f32,
	pub zoom_y_factor: f32,
	pub zoom_x: f32,
	pub zoom_y: f32,
	pub clear_background_color: bool,
	pub background_color: i32,
	pub force_own_texture: bool,
	pub sampler: LayerSamplerMode,
	#[serde(alias = "enable_3d")]
	pub enable_3d: bool,
	pub clear_depth_buffer: bool,
	pub objects: Vec<ObjectInstance>,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum LayerSamplerMode {
	Default,
	Point,
	Linear,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ObjectInstance {
	pub id: i32,
	pub object_type_id: i32,
	pub x: i32,
	pub y: i32,
	pub width: i32,
	pub height: i32,
	pub angle: f32,
	pub filter: i32,
	pub private_variables: Vec<String>,
	pub data: Vec<u8>,
	pub key: i32,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Animation {
	pub id: i32,
	pub name: String,
	pub tag: i32,
	pub speed: f32,
	pub is_angle: bool,
	pub angle: f32,
	/// -1 == forever
	pub repeat_count: i32,
	pub repeat_to: i32,
	pub ping_pong: bool,
	pub frames: Vec<AnimationFrame>,
	pub sub_animations: Vec<Animation>,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationFrame {
	pub duration: f32,
	pub image_id: i32,

}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum LayerType {
	Normal,
	WindowCtrls,
	NonFrame,
	Include,
}

#[derive(Default, Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum DisableShaderWhen {
	#[default]
	NoSetting,
	Ps20Unavailable,
	Ps20Available,
	Ps14Unavailable,
	Ps14Available,
	Ps11Unavailable,
	Ps11Available,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, FromPrimitive, ToPrimitive)]
pub enum PrivateVariableType {
	/// why is this `Integer`? are you sure it can't support decimal values as well?
	Integer,
	String,
}

/// Record on an ObjectType that describes the names and types of each object instance
#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateVariable {
	pub name: String,
	pub value_type: PrivateVariableType,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureDescriptor {
	pub script_name: String,
	pub param_count: u32,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionPoint {
	pub x: i32,
	pub y: i32,
	pub string: String,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
		o.split().1
	}
}

impl ImageResource {
	pub fn new(data: Vec<u8>, metadata: ImageMetadata) -> Self {
		let ImageMetadata { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask } = metadata;
		ImageResource { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask, data }
	}
	pub fn split(self) -> (Vec<u8>, ImageMetadata) {
		let ImageResource { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask, data } = self;
		(data, ImageMetadata { id, hotspot_x, hotspot_y, apoints, collision_width, collision_height, collision_pitch, collision_mask })
	}
}

#[serde_alias(SnakeCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppBlock {
	pub name: String,
	pub window_width: i32,
	pub window_height: i32,
	pub eye_distance: f32,
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
	pub time_delta_override: f32,
	pub caption: bool,
	pub minimize_box: bool,
	pub maximize_box: bool,
	pub resize_mode: ResizeMode,
	pub minimum_fps: f32,
	pub layout_index: i32,
	pub multisamples: u32,
	pub texture_loading_mode: TextureLoadingMode,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalVariable {
	pub name: String,
	pub var_type: i32,
	pub value: String,
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorControl {
	pub name: String,
	pub vk: i32,
	pub player: i32,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum FpsMode {
	VSync,
	Unlimited,
	Fixed,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum SamplerMode {
	Point,
	Linear,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum TextRenderingMode {
	Aliased,
	AntiAliased,
	ClearType,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum SimulateShadersMode {
	NoSimulation,
	Ps14,
	Ps11,
	Ps00,
}

#[derive(Debug, Clone, Copy, FromPrimitive, ToPrimitive, Serialize, Deserialize)]
pub enum ResizeMode {
	Disabled,
	ShowMore,
	Stretch,
}
