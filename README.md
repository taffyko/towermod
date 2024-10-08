Tools to create and play mods for games built with the Construct Classic engine

Releases downloadable at https://gamebanana.com/tools/17559

# Building / developing

Install 32-bit and 64-bit nightly toolchains for Rust (they are both required)
```powershell
rustup install nightly-x86_64-pc-windows-msvc
rustup install nightly-i686-pc-windows-msvc
```

Build the 32-bit `dllreader` binary (used to read Construct Classic plugin DLLs from a 64-bit process)
```powershell
cd rust
cargo build -p towermod --bin dllreader
```

Build the GDExtension library.
```powershell
cargo build -p towermod-godot
```

Open `./godot/project.godot` in Godot Engine.
