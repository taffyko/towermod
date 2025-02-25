use std::path::PathBuf;
use crate::{game_images, GameType, PeResource, Project, ProjectType};
use anyhow::Result;
use anyhow::{Context};
use fs_err::tokio as fs;
use towermod_cstc::{self as cstc};
use towermod_util::merge_copy_into;
use crate::app::{state::select, selectors, thunks};

/// For prepopulating the project-details form for exporting Legacy/FilesOnly projects
pub async fn load_manifest(manifest_path: PathBuf, project_type: ProjectType) -> Result<Project> {
	if manifest_path.exists() {
		return Ok(Project::from_path(&manifest_path).await?)
	} else {
		let game = selectors::get_game().await.context("No game set")?;
		let mut project = Project::new("".to_string(), "".to_string(), "".to_string(), "".to_string(), game);
		project.dir_path = Some(manifest_path.parent().context("path error")?.to_path_buf());
		project.project_type = project_type;
		return Ok(project)
	}
}

pub async fn export_from_files(mut project: Project) -> Result<()> {
	project.date = time::OffsetDateTime::now_utc().replace_nanosecond(0)?.replace_second(0)?;
	crate::export_from_files(&project).await?;
	project.save().await?;
	Ok(())
}

pub async fn export_from_legacy(patch_path: PathBuf, mut project: Project) -> Result<()> {
	// take a path to a patch.zip or patch.json
	// expect "files" dir in same directory
	// treat directory of file path as a project dir (copy logo/etc. there)
	crate::export_from_legacy(patch_path, &mut project).await?;
	project.save().await?;
	Ok(())
}

pub async fn play_project(debug: bool) -> Result<u32> {
	let data = select(|s| s.data.clone()).await;
	let (_editor_plugins, app_block, image_metadatas, level_block, mut event_block) = data.to_stable();
	let project = selectors::get_project().await;
	let game = selectors::get_game().await.context("Game not set")?;
	let game_path = game.game_path()?.clone();
	let game_name = game_path.file_name().unwrap();

	let mut images_dir = None;
	if let (Some(project)) = &project {
		images_dir = Some(project.images_path()?)
	}

	let original_image_block_bin = cstc::ImageBlock::read_bin(&game_path)?;
	let image_block = cstc::ImageBlock::from_bin(&original_image_block_bin)?;
	let (images, _original_metadata) = game_images::split_imageblock(image_block);
	let patched_image_block = game_images::get_patched_image_block(images, images_dir, image_metadatas).await?;

	let src_path;
	if debug {
		src_path = game.get_debug_build().await?;
		thunks::remove_mouse_cursor_hide_events(&mut event_block);
	} else {
		src_path = game.get_release_build().await?;
	}

	let mut runtime_dir;
	let unique_name;
	if let Some(project) = &project {
		unique_name = project.unique_name();
		if game.game_type == GameType::Towerclimb {
			let towerclimb_savefiles_dir = PathBuf::from_iter([crate::get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*unique_name])]);
			merge_copy_into(&project.savefiles_path()?, &towerclimb_savefiles_dir, false, false).await?;
		}
		runtime_dir = project.mod_runtime_dir_path();
		// Recursively copy game directory using hardlinks
		merge_copy_into(&game_path.parent().unwrap(), &runtime_dir, true, true).await?;
		// Recursively copy files from mod/project dir using hardlinks
		merge_copy_into(&project.files_path()?, &runtime_dir, true, true).await?;
	} else {
		unique_name = String::from("unnamed project");
		// for unnamed projects, delete and recreate a fresh save directory on every run
		if game.game_type == GameType::Towerclimb {
			let towerclimb_savefiles_dir = PathBuf::from_iter([crate::get_appdata_dir_path(), PathBuf::from_iter(["TowerClimb/Mods", &*unique_name])]);
			towermod_util::remove_dir_if_exists(towerclimb_savefiles_dir).await?;
		}
		runtime_dir = crate::get_cache_dir_path();
		runtime_dir.push("mods/unnamed project/runtime");
	}
	if game.game_type == GameType::Towerclimb {
		// this copies settings from the vanilla game save dir
		thunks::rebase_towerclimb_save_path(&mut event_block, &unique_name).await?;
	}
	fs::create_dir_all(&runtime_dir).await?;

	let output_path = runtime_dir.join(game_name);
	// Delete existing executable if present
	if let Err(e) = fs::remove_file(&output_path).await {
		match e.kind() {
			std::io::ErrorKind::NotFound => (),
			_ => Err(e)?,
		}
	}
	fs::copy(&src_path, &output_path).await?;
	if debug {
		// Needed for debug builds to find on-disk runtime plugins
		fs::write(runtime_dir.join("Construct.ini"), game.construct_ini().await?).await?;
	}
	patched_image_block.write_to_pe(&output_path)?;
	app_block.write_to_pe(&output_path)?;
	event_block.write_to_pe(&output_path)?;
	level_block.write_to_pe(&output_path)?;
	Ok(crate::run_game(&output_path).await?)
}

pub async fn wait_until_process_exits(pid: u32) -> Result<()> {
	tokio::task::spawn_blocking(move || {
		towermod_win32::process::wait_until_process_exits(pid)
	}).await?
}
