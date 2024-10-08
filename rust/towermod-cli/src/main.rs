use std::path::PathBuf;
use clap::{Args, Parser, Subcommand};
use env_logger::{self};
use tracing_flame::FlameLayer;
use tracing_subscriber::{fmt::{format::FmtSpan}, prelude::*, Registry};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Cli {
	#[command(subcommand)]
	command: Commands,
	game: Option<PathBuf>,
}

#[derive(Subcommand, Debug)]
enum Commands {
	Play(PlayArgs),
	ExportFromLegacy(ExportFromLegacyArgs),
}

#[derive(Args, Debug)]
struct PlayArgs {

}

#[derive(Args, Debug)]
struct ExportFromLegacyArgs {

}

fn main() {
	env_logger::builder()
		.format_timestamp(Some(env_logger::fmt::TimestampPrecision::Millis))
		.init();

	#[cfg(debug_assertions)]
	let (flame_layer, _guard) = FlameLayer::with_file("./tracing.folded").unwrap();

	let fmt_layer = tracing_subscriber::fmt::Layer::default()
		.with_span_events(FmtSpan::CLOSE)
		.with_target(false)
		.with_level(false);
	let subscriber = Registry::default()
		.with(fmt_layer)
		.with(flame_layer);

	tracing::subscriber::set_global_default(subscriber).unwrap();

	let cli = Cli::parse();

	match cli.command {
		Commands::Play(_args) => {
			todo!()
		},
		Commands::ExportFromLegacy(_args) => {
			todo!()
		}
	}
}
