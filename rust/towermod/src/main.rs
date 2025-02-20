// Prevents additional console window on Windows in release, DO NOT REMOVE!!

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use towermod_util::log_on_error;

fn main() {
	std::env::set_var("RUST_BACKTRACE", "1");

	// Set up logging / tracing
	use tracing_subscriber::prelude::*;
	use tracing::level_filters::LevelFilter;
	use tracing_subscriber::fmt::format::FmtSpan;

	let fmt_layer = tracing_subscriber::fmt::Layer::default()
		.with_span_events(FmtSpan::NEW | FmtSpan::CLOSE)
		.with_filter(LevelFilter::INFO);
	let console_layer = console_subscriber::spawn();
	let subscriber = tracing_subscriber::Registry::default()
		.with(fmt_layer)
		.with(console_layer);
	tracing::subscriber::set_global_default(subscriber).unwrap();

	let _ = tracing_log::LogTracer::init();

	if towermod_win32::pipe::pipe_exists() {
		let mut command_line = false;
		for arg in std::env::args().skip(1) {
			command_line = true;
			log_on_error(towermod_win32::pipe::write_to_pipe(arg.as_bytes()));
		}
		if command_line {
			std::process::exit(0);
		}
	}

	towermod_lib::tauri::run()
}
