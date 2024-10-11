use std::{process::{Command}, env::{self, VarError}, path::PathBuf};


fn main() {
	match env::var("CARGO_FEATURE_BUNDLED_DLLREADER") {
		Ok(_) => 'bundle: {
			// Build 32-bit dllreader.exe to bundle inside 64-bit towermod library
			let profile = env::var("PROFILE").unwrap();
			let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
			// If building for debug and dllreader.exe artifact already exists, use that.
			if profile == "dev" || profile == "debug" {
				let artifact_path: PathBuf = ["../target", "i686-pc-windows-msvc/debug/dllreader.exe"].iter().collect();
				if let Ok(existing_artifact) = artifact_path.canonicalize() {
					println!("cargo:rustc-env=DLLREADER_EXE={}", existing_artifact.to_str().unwrap());
					break 'bundle;
				}
			}
			let mut command = Command::new("cargo");
			command
				.env_remove("CARGO_FEATURE_BUNDLED_DLLREADER")
				.arg("build")
				.args(["-Z", "unstable-options"])
				.args(["--package", "towermod"])
				.args(["--bin", "dllreader"])
				.args(["--target", "i686-pc-windows-msvc"])
				.args(["--target-dir", out_dir.join("dllreader-target").to_str().unwrap()]) // prevent file lock from running cargo concurrently
				.args(["--artifact-dir", out_dir.to_str().unwrap()]);
			if profile == "release" {
				command.arg("--release");
			}
			if !command.status().unwrap().success() {
				println!("cargo::warning=FAILED to build dllreader.exe!");
			}
			println!("cargo:rustc-env=DLLREADER_EXE={}", out_dir.join("dllreader.exe").to_str().unwrap());
		}
		Err(VarError::NotPresent) => {}
		_ => panic!()
	}
}
