#![allow(unexpected_cfgs)]
use std::{process::{Command}, env::{self}, path::PathBuf};

fn main() {
	if let Ok(_) = env::var("CARGO_FEATURE_BUNDLED_DLLREADER") { 'bundle: {
		// Build 32-bit dllreader.exe to bundle inside 64-bit towermod library
		let profile = env::var("PROFILE").unwrap();
		let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
		// If building for debug and dllreader.exe artifact already exists, use that.
		if profile == "dev" || profile == "debug" {
			let artifact_path: PathBuf = ["../target", if cfg!(windows) { "i686-pc-windows-msvc" } else { "i686-pc-windows-gnu" }, "debug/dllreader.exe"].iter().collect();
			if let Ok(existing_artifact) = artifact_path.canonicalize() {
				println!("cargo:rustc-env=DLLREADER_EXE={}", existing_artifact.to_str().unwrap());
				break 'bundle;
			}
		}

		if cfg!(rust_analyzer) {
			// skip when building for rust-analyzer
			println!("cargo:rustc-env=DLLREADER_EXE={}", "");
			break 'bundle;
		}

		let mut command = Command::new(if cfg!(windows) { "cargo" } else { "cargo" });
		command
			.env_remove("CARGO_FEATURE_BUNDLED_DLLREADER")
			.arg("build")
			.args(["-Z", "unstable-options"])
			.args(["--package", "towermod-dllreader"])
			.args(["--target", if cfg!(windows) { "i686-pc-windows-msvc" } else { "i686-pc-windows-gnu" }])
			.args(["--target-dir", out_dir.join("dllreader-target").to_str().unwrap()]) // prevent file-locking issues from running cargo concurrently
			.args(["--artifact-dir", out_dir.to_str().unwrap()]);
		if profile == "release" {
			command.arg("--release");
		}
		if !command.status().unwrap().success() {
			println!("cargo::error=FAILED to build dllreader.exe!");
			panic!("FAILED to build dllreader.exe!");
		}
		println!("cargo:rustc-env=DLLREADER_EXE={}", out_dir.join("dllreader.exe").to_str().unwrap());
	}}
}
