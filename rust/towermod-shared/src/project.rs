use std::{collections::HashMap, path::{Path, PathBuf}};
use derivative::Derivative;
use indoc::formatdoc;
use fs_err::tokio as fs;
use serde::{Serialize, Deserialize};
use anyhow::{anyhow, Result, Context};
use serde_alias::serde_alias;
use towermod_win32::pe_resource::{read_pe_file_resource, ResId};
use crate::{convert_to_debug_build, convert_to_release_build, get_cache_dir_path, mod_cache_dir_path, PeResource};
pub use towermod_cstc::{plugin::PluginData, AppBlock, EventBlock, ImageBlock, LevelBlock};



#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum GameType {
	#[default]
	Other,
	Towerclimb,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum ProjectType {
	#[default]
	Towermod,
	FilesOnly,
	Legacy,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, Default)]
pub enum ModType {
	#[default]
	FilesOnly,
	Legacy,
	BinaryPatch,
}

/// Metadata about a game
#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
	pub file_hash: String,
	pub file_name: String,
	pub file_size: i64,
	pub data_hash: Option<String>,
	#[serde(default)]
	pub game_type: GameType,

	// Working memory only //
	/// Path to executable on-disk
	#[serde(default)]
	pub file_path: Option<PathBuf>,
}
impl Game {
	fn clear_unpersisted_fields(&mut self) {
		self.file_path = None
	}

	pub async fn from_path(path: PathBuf) -> Result<Self> {
		let file_name = path.file_name().ok_or(anyhow!("Unable to get file name from path"))?.to_string_lossy().to_string();
		let bytes = fs::read(&path).await?;
		let _ = read_pe_file_resource(&path, &ResId::from("APPBLOCK"), &ResId::from(997))?;
		let data_hash = Some(Self::get_data_hash(&path).await?);
		let file_hash = format!("{:x?}", md5::compute(&bytes));
		let mut game_type = GameType::Other;
		if file_name.to_lowercase().contains("towerclimb") {
			game_type = GameType::Towerclimb;
		}
		Ok(Game {
			data_hash,
			file_hash,
			file_name,
			file_size: bytes.len() as i64,
			file_path: Some(path),
			game_type,
		})
	}

	// Hash of the Construct Classic data payloads associated with an executable
	pub async fn get_data_hash(path: &Path) -> Result<String> {
		let mut bytes = Vec::new();
		bytes.extend_from_slice(&*ImageBlock::read_bin(path)?);
		bytes.extend_from_slice(&*AppBlock::read_bin(path)?);
		bytes.extend_from_slice(&*LevelBlock::read_bin(path)?);
		bytes.extend_from_slice(&*EventBlock::read_bin(path)?);
		Ok(format!("{:x?}", md5::compute(&bytes)))
	}

	/// Root for all per-game cache files
	pub fn game_cache_dir_path(&self) -> PathBuf {
		let mut path = get_cache_dir_path();
		path.push(&self.file_hash);
		path
	}
	pub async fn game_cache_dir(&self) -> Result<PathBuf> {
		let path = self.game_cache_dir_path();
		fs::create_dir_all(&path).await?;
		Ok(path)
	}

	/// Location where downloaded Construct Classic files are cached
	pub async fn cstc_binary_dir(&self) -> Result<PathBuf> {
		let mut cstc_binary_dir = get_cache_dir_path();
		cstc_binary_dir.push("cstc");
		let exists = tokio::fs::try_exists(&cstc_binary_dir).await?;
		if exists {
			return Ok(cstc_binary_dir);
		} else {
			let bytes = reqwest::get("https://github.com/taffyko/towermod/raw/construct-classic-bin/ConstructClassic.zip")
				.await?.bytes().await?;
			zip_extract::extract(std::io::Cursor::new(&bytes), &cstc_binary_dir, true)?;
		}
		todo!()
	}

	pub fn image_dump_dir_path(&self) -> PathBuf {
		let mut dir = self.game_cache_dir_path();
		dir.push("images");
		dir
	}
	pub async fn image_dump_dir(&self) -> Result<PathBuf> {
		let dir = self.image_dump_dir_path();
		fs::create_dir_all(&dir).await?;
		Ok(dir)
	}


	/// # Errors
	/// Game path not set
	pub async fn get_release_build(&self) -> Result<PathBuf> {
		let path = self.game_cache_dir().await?.join("release.bin");
		let exists = tokio::fs::try_exists(&path).await?;
		if !exists {
			convert_to_release_build(&self.game_path()?, &path).await?;
		}
		Ok(path)
	}

	/// # Errors
	/// Game path not set
	pub async fn get_debug_build(&self) -> Result<PathBuf> {
		let path = self.game_cache_dir().await?.join("debug.bin");
		let exists = tokio::fs::try_exists(&path).await?;
		if !exists {
			convert_to_debug_build(self, &path).await?;
		}
		Ok(path)
	}

	pub async fn clear_cache(&self) -> anyhow::Result<()> {
		let dir = self.game_cache_dir().await?;
		fs::remove_dir_all(dir).await?;
		Ok(())
	}

	pub fn game_path(&self) -> Result<&PathBuf> {
		self.file_path.as_ref().ok_or(anyhow!("Game file path not set"))
	}

	pub async fn read_plugin_data_cached(&self) -> anyhow::Result<(HashMap<i32, String>, HashMap<i32, PluginData>)> {
		let cache_path = self.game_cache_dir().await?.join("plugin_data");
		if let Ok(bytes) = fs::read(&cache_path).await {
			if let Ok(data) = rmp_serde::from_slice(&bytes) {
				return Ok(data);
			};
		}

		let mut plugin_names = crate::read_dllblock_names(self.game_path()?).await?;
		plugin_names.insert(-1, String::from("System"));
		let mut editor_plugins = crate::load_editor_plugins_by_name(&plugin_names).await?;
		editor_plugins.insert(-1, towermod_cstc::get_system_plugin());
		let data = (plugin_names, editor_plugins);

		// Write to cache
		fs::write(&cache_path, rmp_serde::to_vec(&data)?).await?;

		Ok(data)
	}

	pub async fn load_editor_plugins(&self) -> Result<(HashMap<i32, PluginData>, HashMap<i32, String>)> {
		let plugin_cache = self.game_cache_dir().await?.join("plugindata.msgpack");
		if let Ok(data) = fs::read(&plugin_cache).await {
			// Read from cache
			let result: (HashMap<i32, PluginData>, HashMap<i32, String>) = rmp_serde::from_slice(&data)?;
			Ok(result)
		} else {
			let plugin_names = crate::read_dllblock_names(&self.game_path()?).await?;
			let editor_plugins = crate::load_editor_plugins_by_name(&plugin_names).await?;
			let result = (editor_plugins, plugin_names);

			// Cache for next time
			let data = rmp_serde::to_vec(&result)?;
			fs::write(&plugin_cache, &data).await?;

			Ok(result)
		}
	}

	pub fn plugin_dump_dir_path(&self) -> PathBuf {
		let mut path = self.game_cache_dir_path();
		path.push("cstc_dump/Plugins/Runtime");
		path
	}
	pub async fn plugin_dump_dir(&self) -> Result<PathBuf> {
		let path = self.plugin_dump_dir_path();
		fs::create_dir_all(&path).await?;
		Ok(path)
	}

	pub async fn construct_ini(&self) -> Result<String> {
		let path = self.game_cache_dir().await?.join("cstc_dump");
		let path = path.to_string_lossy();
		// Trailing slash for 'Install' is super important
		Ok(formatdoc!(r#"
			[General]
			Run=1
			Language=English (UK)
			ShowMaximized=Y
			Theme=4
			UpdateCheck=0
			ObjectFolder=-1
			[Path]
			Install={path}\
		"#, path = path))
	}
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Serialize, Deserialize)]

#[serde(rename_all = "camelCase")]
/// Metadata about a project, found in its manifest.toml
pub struct Project {
	pub game: Game,
	pub author: String,
	pub name: String,
	pub display_name: String,
	pub version: String,
	#[serde(default)]
	pub project_type: ProjectType,
	#[serde(default)]
	pub description: String,
	pub towermod_version: String,
	/// Date that the project was last saved/exported
	#[serde(with = "time::serde::rfc3339")]
	pub date: time::OffsetDateTime,

	// Working memory only //
	/// Path to directory containing manifest.toml
	#[serde(default)]
	pub dir_path: Option<PathBuf>,
}
impl Project {
	fn clear_unpersisted_fields(&mut self) {
		self.dir_path = None;
		self.game.clear_unpersisted_fields()
	}
	pub fn new(author: String, name: String, display_name: String, version: String, game: Game) -> Self {
		Project {
			game,
			author,
			name,
			display_name,
			version,
			project_type: Default::default(),
			description: Default::default(),
			towermod_version: towermod_util::VERSION.to_string(),
			dir_path: None,
			date: time::OffsetDateTime::now_utc(),
		}
	}
	pub async fn from_path(file_path: impl AsRef<Path>) -> Result<Self> {
		let file_path = file_path.as_ref();
		let s = fs::read_to_string(&file_path).await?;
		let mut p: Self = toml::from_str::<Self>(&s)?;
		p.dir_path = Some(file_path.parent().unwrap().to_owned());
		Ok(p)
	}

	pub fn unique_name(&self) -> String {
		unique_name(&self.author, &self.name)
	}

	pub fn unique_version_name(&self) -> String {
		unique_version_name(&self.author, &self.name, &self.version)
	}

	/// # Errors
	/// - dir_path not set
	pub async fn save(&self) -> Result<()> {
		let file_path = self.dir_path()?.join("manifest.toml");
		let mut project = self.clone();
		project.clear_unpersisted_fields();
		let s = toml::to_string_pretty(&project)?;
		fs::write(file_path, s).await?;
		Ok(())
	}

	pub fn mod_runtime_dir_path(&self) -> PathBuf {
		let mut dir = mod_cache_dir_path(self.unique_name());
		dir.push("runtime");
		dir
	}

	pub async fn mod_runtime_dir(&self) -> Result<PathBuf> {
		let dir = self.mod_runtime_dir_path();
		fs::create_dir_all(&dir).await?;
		Ok(dir)
	}

	pub fn dir_path(&self) -> Result<&PathBuf> {
		self.dir_path.as_ref().ok_or(anyhow!("Project directory path not set"))
	}
	pub fn images_path(&self) -> Result<PathBuf> {
		Ok(self.dir_path()?.join("images"))
	}
	pub fn files_path(&self) -> Result<PathBuf> {
		Ok(self.dir_path()?.join("files"))
	}
	pub fn savefiles_path(&self) -> Result<PathBuf> {
		Ok(self.dir_path()?.join("savefiles"))
	}
}

#[serde_alias(SnakeCase, CamelCase)]
#[derive(Debug, Clone, Derivative, Serialize, Deserialize)]
#[derivative(Default)]
#[serde(rename_all = "camelCase")]
/// Metadata about an exported mod, found in its manifest.toml
pub struct ModInfo {
	pub game: Game,
	pub author: String,
	pub name: String,
	pub display_name: String,
	pub version: String,
	#[serde(default)]
	pub mod_type: ModType,
	#[serde(default)]
	pub description: String,
	pub towermod_version: String,
	/// Date that the mod was exported
	#[serde(with = "time::serde::rfc3339")]
	#[derivative(Default(value = "time::OffsetDateTime::now_utc()"))]
	pub date: time::OffsetDateTime,

	// Working memory only //
	/// Path to zip file that mod was loaded from
	#[serde(default)]
	pub file_path: Option<PathBuf>,
	#[serde(default)]
	pub cover: Option<Vec<u8>>,
	#[serde(default)]
	pub icon: Option<Vec<u8>>,
	#[serde(default)]
	pub error: Option<String>,
}
impl ModInfo {
	fn clear_unpersisted_fields(&mut self) {
		self.game.clear_unpersisted_fields();
		self.file_path = None;
		self.cover = None;
		self.icon = None;
		self.error = None;
	}
	pub fn serialize(&self) -> Result<String> {
		let mut mod_info = self.clone();
		mod_info.clear_unpersisted_fields();
		Ok(toml::to_string_pretty(&mod_info)?)
	}
	pub fn new(mut project: Project, mod_type: ModType) -> Self {
		project.game.file_path = None;
		ModInfo {
			game: project.game,
			author: project.author,
			name: project.name,
			display_name: project.display_name,
			version: project.version,
			mod_type,
			description: project.description,
			towermod_version: project.towermod_version,
			date: project.date,
			file_path: None,
			cover: None,
			icon: None,
			error: None,
		}
	}

	pub fn mod_runtime_dir_path(&self) -> PathBuf {
		let mut dir = mod_cache_dir_path(self.unique_version_name());
		dir.push("runtime");
		dir
	}

	pub async fn mod_runtime_dir(&self) -> Result<PathBuf> {
		let dir = self.mod_runtime_dir_path();
		fs::create_dir_all(&dir).await?;
		Ok(dir)
	}

	pub fn unique_name(&self) -> String {
		unique_name(&self.author, &self.name)
	}

	pub fn unique_version_name(&self) -> String {
		unique_version_name(&self.author, &self.name, &self.version)
	}

	pub fn export_path(&self) -> PathBuf {
		let name = self.unique_version_name();
		// Replace dots with underscores (gamebanana doesn't like dots in filenames)
		let name = name.replace(".", "_");
		crate::get_mods_dir_path().join(format!("{}.zip", name))
	}

	pub async fn from_zip_path(path: impl AsRef<Path>) -> Result<Self> {
		let path = path.as_ref();
		let bytes = fs::read(path).await?;
		Self::from_zip_bytes(&*bytes).await
	}
	pub async fn from_zip_bytes(bytes: &[u8]) -> Result<Self> {
		use std::io::Read;
		let mut zip = zip::ZipArchive::new(std::io::Cursor::new(bytes))?;
		let mut file = zip.by_name("manifest.toml").context("manifest.toml not found in zip")?;
		let mut s = String::new();
		file.read_to_string(&mut s)?;
		let mod_info: Self = toml::from_str(&s).context("couldn't parse manifest.toml in zip")?;
		Ok(mod_info)
	}
}

pub fn unique_name(author: &str, name: &str) -> String {
	format!("{}.{}", author, name).to_ascii_lowercase().replace("_", "-")
}
pub fn unique_version_name(author: &str, name: &str, version: &str) -> String {
	format!("{}.{}.{}", author, name, version).to_ascii_lowercase().replace("_", "-")
}
