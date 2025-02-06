/* auto-generated by NAPI-RS */
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
  subAnimations: Array<Animation>
  type: 'Animation'
}

export interface AnimationFrame {
  duration: float
  imageId: int
  type: 'AnimationFrame'
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
  dataKeys: Array<DataKey>
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
  type: 'AppBlock'
}

export interface Behavior {
  objectTypeId: int
  newIndex: int
  movIndex: int
  name: string
  data: Array<number>
  descriptors?: FeatureDescriptors
  type: 'Behavior'
}

export interface BehaviorControl {
  name: string
  vk: int
  player: int
  type: 'BehaviorControl'
}

export interface Container {
  objectIds: Array<number>
  type: 'Container'
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
  objectTypes: Array<ObjectType>
  behaviors: Array<Behavior>
  traits: Array<ObjectTrait>
  families: Array<Family>
  layouts: Array<Layout>
  containers: Array<Container>
  animations: Array<Animation>
  appBlock?: AppBlock
}

export type DataKey =
  | { type: 'Pointer', field0: string, field1: number }
  | { type: 'String', field0: string, field1: string }

export declare const enum DisableShaderWhen {
  NoSetting = 0,
  Ps20Unavailable = 1,
  Ps20Available = 2,
  Ps14Unavailable = 3,
  Ps14Available = 4,
  Ps11Unavailable = 5,
  Ps11Available = 6
}

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
  privateVariables: Array<PrivateVariable>
  type: 'Family'
}

export interface FeatureDescriptor {
  scriptName: string
  paramCount: int
  type: 'FeatureDescriptor'
}

export interface FeatureDescriptors {
  actions: Array<FeatureDescriptor>
  conditions: Array<FeatureDescriptor>
  expressions: Array<FeatureDescriptor>
  type: 'FeatureDescriptors'
}

export declare const enum FpsMode {
  VSync = 0,
  Unlimited = 1,
  Fixed = 2
}

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
  type: 'GlobalVariable'
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


export declare const enum LayerSamplerMode {
  Default = 0,
  Point = 1,
  Linear = 2
}

export declare const enum LayerType {
  Normal = 0,
  WindowCtrls = 1,
  NonFrame = 2,
  Include = 3
}

export interface Layout {
  /** Unique name. */
  name: string
  width: int
  height: int
  color: int
  unboundedScrolling: boolean
  applicationBackground: boolean
  dataKeys: Array<DataKey>
  layers: Array<LayoutLayer>
  imageIds: Array<number>
  textureLoadingMode: TextureLoadingMode
  type: 'Layout'
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
  objects: Array<ObjectInstance>
  type: 'LayoutLayer'
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
  date: Date
  /** Path to zip file that mod was loaded from */
  filePath?: string
  cover?: Array<number>
  icon?: Array<number>
	error?: string
}

export declare const enum ModType {
  FilesOnly = 0,
  Legacy = 1,
  BinaryPatch = 2
}


export interface ObjectInstance {
  id: int
  objectTypeId: int
  x: int
  y: int
  width: int
  height: int
  angle: float
  filter: int
  privateVariables: Array<string>
  data: Array<number>
  key: int
  type: 'ObjectInstance'
}

export interface ObjectTrait {
  name: string
  objectTypeIds: Array<number>
  type: 'ObjectTrait'
}

export interface ObjectType {
  id: int
  name: string
  /** Index of the .csx plugin associated with this ObjectType */
  pluginId: int
  global: boolean
  destroyWhen: DisableShaderWhen
  privateVariables: Array<PrivateVariable>
  descriptors?: FeatureDescriptors
  type: 'ObjectType'
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

/** Record on an ObjectType that describes the names and types of each object instance */
export interface PrivateVariable {
  name: string
  valueType: PrivateVariableType
  type: 'PrivateVariable'
}

export declare const enum PrivateVariableType {
  /** why is this `Integer`? are you sure it can't support decimal values as well? */
  Integer = 0,
  String = 1
}

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
  dirPath?: string
}

export declare const enum ProjectType {
  Towermod = 0,
  FilesOnly = 1,
  Legacy = 2
}

export declare const enum ResizeMode {
  Disabled = 0,
  ShowMore = 1,
  Stretch = 2
}

export declare const enum SamplerMode {
  Point = 0,
  Linear = 1
}

export declare const enum SimulateShadersMode {
  NoSimulation = 0,
  Ps14 = 1,
  Ps11 = 2,
  Ps00 = 3
}

export type SomeEvent =
  | { type: 'Event', field0: Event }
  | { type: 'EventGroup', field0: EventGroup }
  | { type: 'EventInclude', field0: number }

export declare const enum TextRenderingMode {
  Aliased = 0,
  AntiAliased = 1,
  ClearType = 2
}

export declare const enum TextureLoadingMode {
  LoadOnAppStart = 0,
  LoadOnLayoutStart = 1
}

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
