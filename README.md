Tools to create and play mods for games built with the Construct Classic engine

Releases downloadable at https://gamebanana.com/tools/17559

# Building / developing

Install 32-bit and 64-bit nightly toolchains for Rust (they are both required)
```powershell
rustup install nightly-x86_64-pc-windows-msvc
rustup install nightly-i686-pc-windows-msvc
```

Inside the `ui` directory
- `npm install`
- `npm run build-rust`
- `npm run dev`
