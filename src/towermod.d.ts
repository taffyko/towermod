/* eslint-disable */
export interface AcesEntry {
  /** Deprecated */
  resourceId: number
  aceName: string
  aceDescription: string
  retrn: number
  params: Array<Param>
  aceListName: string
  aceCategory: string
  aceDisplayText: string
  scriptName: string
  auxStr: string
}

export interface ActionPoint {
  x: int
  y: int
  string: string
	_type: 'ActionPoint'
}

export interface Animation {
  id: int
  name: string
  tag: int
  speed: float
  isAngle: boolean
  angle: float
  /** -1 == forever */
  repeatCount: int
  repeatTo: int
  pingPong: boolean
  frames: Array<AnimationFrame>
	subAnimations: Animation[]
  _type: 'Animation'
}

export interface AnimationFrame {
  duration: float
  imageId: int
  _type: 'AnimationFrame'
}

export interface AppBlock {
  name: string
  windowWidth: int
  windowHeight: int
  eyeDistance: float
  showMenu: boolean
  screensaver: boolean
  fpsMode: FpsMode
  fps: int
  fullscreen: boolean
  samplerMode: SamplerMode
  globalVariables: Array<GlobalVariable>
  behaviorControls: Array<BehaviorControl>
  disableWindowsKey: boolean
  dataKeys: Record<string, string | number>
  simulateShaders: SimulateShadersMode
  originalProjectPath: string
  fpsInCaption: int
  useMotionBlur: boolean
  motionBlurSteps: int
  textRenderingMode: TextRenderingMode
  overrideTimedelta: boolean
  timeDeltaOverride: float
  caption: boolean
  minimizeBox: boolean
  maximizeBox: boolean
  resizeMode: ResizeMode
  minimumFps: float
  layoutIndex: int
  multisamples: int
  textureLoadingMode: TextureLoadingMode
  _type: 'AppBlock'
}

export interface Behavior {
  objectTypeId: int
  newIndex: int
  movIndex: int
  name: string
  data: Array<number>
  descriptors?: FeatureDescriptors
  _type: 'Behavior'
}

export interface BehaviorControl {
  name: string
  vk: int
  player: int
  _type: 'BehaviorControl'
}

export interface Container {
	id: int,
  objectIds: Array<int>
  _type: 'Container'
}

export interface CPropItem {
  propType: number
  label: string
  description: string
  text: string
}

/** Subset of state held by frontend Redux */
export interface CstcData {
	editorPlugins: Record<number, PluginData>
  behaviors: Array<Behavior>
  traits: Array<ObjectTrait>
  families: Array<Family>
  layouts: Array<Layout>
  containers: Array<Container>
  animations: Array<Animation>
  appBlock: AppBlock
}

export type DisableShaderWhen = 'NoSetting' | 'Ps20Unavailable' | 'Ps20Available' | 'Ps14Unavailable' | 'Ps14Available' | 'Ps11Unavailable' | 'Ps11Available';

export interface Event {
  lineNumber: int
  sheetId: int
  conditions: Array<EventCondition>
  actions: Array<EventAction>
  events: Array<SomeEvent>
}

export interface EventAction {
  objectId: int
  actionId: int
  movementId: int
  params: Array<Array<Token>>
}

export interface EventBlock {
  sheetNames: Array<string>
  layoutSheets: Array<Array<SomeEvent>>
}

export interface EventCondition {
  objectId: int
  condId: int
  negated: boolean
  movementId: int
  params: Array<Array<Token>>
}

export interface EventGroup {
  active: boolean
  name: string
  events: Array<SomeEvent>
}

export interface Family {
  name: string
  objectTypeIds: Array<number>
  privateVariables: Record<string, VariableType>
  _type: 'Family'
}

export interface FeatureDescriptor {
  scriptName: string
  paramCount: int
}

export interface FeatureDescriptors {
  actions: Array<FeatureDescriptor>
  conditions: Array<FeatureDescriptor>
  expressions: Array<FeatureDescriptor>
}

export type FpsMode = 'VSync' | 'Unlimited' | 'Fixed'

/** Metadata about a game */
export interface Game {
  fileHash: string
  fileName: string
  fileSize: number
  dataHash?: string
  /** Path to executable on-disk */
  filePath?: string
  gameType: GameType
}

export declare const enum GameType {
  Other = 0,
  Towerclimb = 1
}


export interface GlobalVariable {
  name: string
  varType: int
  value: string
  _type: 'GlobalVariable'
}

export interface ImageMetadata {
  id: int
  hotspotX: int
  hotspotY: int
  apoints: Array<ActionPoint>
  collisionWidth: int
  collisionHeight: int
  collisionPitch: int
  collisionMask: Array<number>
	_type: 'ImageMetadata'
}

export interface ImageResource {
  id: int
  hotspotX: int
  hotspotY: int
  data: Array<number>
  apoints: Array<ActionPoint>
  collisionWidth: int
  collisionHeight: int
  collisionPitch: int
  collisionMask: Array<number>
}


export type LayerSamplerMode = 'Default' | 'Point' | 'Linear';

export type LayerType = 'Normal' | 'WindowCtrls' | 'NonFrame' | 'Include';

export interface Layout {
  /** Unique name. */
  name: string
  width: int
  height: int
  color: int
  unboundedScrolling: boolean
  applicationBackground: boolean
  dataKeys: Record<string, string | number>
  imageIds: Array<number>
  textureLoadingMode: TextureLoadingMode
  _type: 'Layout'
}

export interface LayoutLayer {
  id: int
  name: string
  layerType: LayerType
  filterColor: int
  opacity: float
  angle: float
  scrollXFactor: float
  scrollYFactor: float
  scrollX: float
  scrollY: float
  zoomXFactor: float
  zoomYFactor: float
  zoomX: float
  zoomY: float
  clearBackgroundColor: boolean
  backgroundColor: int
  forceOwnTexture: boolean
  sampler: LayerSamplerMode
  enable3D: boolean
  clearDepthBuffer: boolean
  _type: 'LayoutLayer'
}

/** Metadata about an exported mod, found in its manifest.toml */
export interface ModInfo {
  game: Game
  author: string
  name: string
  displayName: string
  version: string
  modType: ModType
  description: string
  towermodVersion: string
  /** Date that the mod was exported */
  date: string
  /** Path to zip file that mod was loaded from */
  filePath?: string
  cover?: Array<number>
  icon?: Array<number>
	error?: string
}

export type ModType = 'FilesOnly' | 'Legacy' | 'BinaryPatch';

export type ObjectInstanceData = TextObjectData | SpriteObjectData | number[]

export interface ObjectInstance<T extends ObjectInstanceData = ObjectInstanceData> {
  id: int
  objectTypeId: int
  x: int
  y: int
  width: int
  height: int
  angle: float
  filter: int
  privateVariables: Record<string, number | string>
	data: T
  key: int
  _type: 'ObjectInstance'
}

export interface TextObjectData {
	version: number;
	text: string;
	fontFace: string;
	pxSize: number;
	italics: number;
	bold: number;
	color: number;
	opacity: number;
	horizAlign: number;
	vertAlign: number;
	hideAtStart: boolean;
	_type: 'TextObjectData';
}

export interface SpriteObjectData {
	version: number;
	collMode: number;
	autoMirror: number;
	autoFlip: number;
	autoRotations: number;
	autoRotationsCombo: number;
	hideAtStart: boolean;
	animation: number;
	skewX: number;
	skewY: number;
	lockedAnimationAngles: boolean;
	startAnim: string;
	startFrame: number;
	_type: 'SpriteObjectData';
}

export interface ObjectTrait {
  name: string
  objectTypeIds: Array<number>
  _type: 'ObjectTrait'
}

export interface ObjectType {
  id: int
  name: string
  /** Index of the .csx plugin associated with this ObjectType */
  pluginId: int
	pluginName: string,
  global: boolean
  destroyWhen: DisableShaderWhen
  privateVariables: Record<string, VariableType>
  descriptors?: FeatureDescriptors
  _type: 'ObjectType'
}

export interface Param {
  paramType: number
  name: string
  desc: string
  initStr: string
}


export interface PluginData {
  conditions: Record<number, AcesEntry>
  actions: Record<number, AcesEntry>
  expressions: Record<number, AcesEntry>
  cndCategories: Record<string, number[]>
  actCategories: Record<string, number[]>
  expCategories: Record<string, number[]>
  properties: Array<CPropItem>
  stringTable: PluginStringTable
}

export interface PluginStringTable {
  name: string
  author: string
  version: string
  desc: string
  category: string
  web: string
}

export type VariableType = 'Number' | 'String'

/** Metadata about a project, found in its manifest.toml */
export interface Project {
  game: Game
  author: string
  name: string
  displayName: string
  version: string
  projectType: ProjectType
  description: string
  towermodVersion: string
  /** Date that the project was last saved/exported */
  date: Date
  /** Path to manifest.toml */
  dirPath: string
}

export type ProjectType = 'Towermod' | 'FilesOnly' | 'Legacy'

export type ResizeMode = 'Disabled' | 'ShowMore' | 'Stretch'

export type SamplerMode = 'Point' | 'Linear'

export type SimulateShadersMode = 'NoSimulation' | 'Ps14' | 'Ps11' | 'Ps00'

export type SomeEvent =
  | { type: 'Event', field0: Event }
  | { type: 'EventGroup', field0: EventGroup }
  | { type: 'EventInclude', field0: number }

export type TextRenderingMode = 'Aliased' | 'AntiAliased' | 'ClearType';

export type TextureLoadingMode = 'LoadOnAppStart' | 'LoadOnLayoutStart';

export type Token =
  | { type: 'Integer', field0: number }
  | { type: 'Color', field0: number }
  | { type: 'Float', field0: number }
  | { type: 'StringLiteral', field0: string }
  | { type: 'Identifier', field0: string }
  | { type: 'VariableName', field0: string }
  | { type: 'Token', field0: TokenKind }

export declare const enum TokenKind {
  Null = 0,
  AnyBinaryOperator = 1,
  AnyFunction = 2,
  AnyValue = 3,
  Integer = 4,
  Float = 5,
  StringLiteral = 6,
  Identifier = 7,
  Array = 8,
  VariableName = 9,
  LeftParen = 10,
  RightParen = 11,
  Comma = 12,
  Dot = 13,
  LeftBrace = 14,
  RightBrace = 15,
  At = 16,
  Add = 17,
  Subtract = 18,
  Multiply = 19,
  Divide = 20,
  Mod = 21,
  Power = 22,
  Sin = 23,
  Cos = 24,
  Tan = 25,
  Sqrt = 26,
  FuncStr = 27,
  FuncInt = 28,
  FuncFloat = 29,
  Equal = 30,
  Less = 31,
  Greater = 32,
  LessEqual = 33,
  GreaterEqual = 34,
  NotEqual = 35,
  Conditional = 36,
  Colon = 37,
  And = 38,
  Or = 39,
  Asin = 40,
  Acos = 41,
  Atan = 42,
  Abs = 43,
  Exp = 44,
  Ln = 45,
  Log10 = 46,
  Floor = 47,
  Ceil = 48,
  Round = 49,
  Random = 50,
  Len = 51,
  Whitespace = 52,
  Color = 53
}

export interface TowermodConfig {
	filePath: string,
}

export interface FileDialogFilter {
	name: string,
	extensions: string[],
}
export interface FileDialogOptions {
	filters?: FileDialogFilter[],
	startingDirectory?: string,
	fileName?: string,
	title?: string,
	canCreateDirectories?: boolean,
}

export interface SearchOptions {
	text: String,
	caseSensitive?: boolean,
}
