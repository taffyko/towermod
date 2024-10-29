import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { globSync } from 'glob';
import tsconfigPathPlugin from 'vite-tsconfig-paths'
import fs from 'fs';

export default defineConfig((env) => {
	const projectRootDir = __dirname;
	const projectMainSrcDir = path.join(projectRootDir, 'src/main');

	const isBuild = env.command === 'build';


	// Treat each .ts file in src/main as a bundling entry point
	// to preserve the module structure of main instead of bundling into a single file
	// (so that individual modules remain importable by @electron/remote)
	const mainEntryPoints = globSync(["src/main/**/*.+(ts)"], {
		cwd: projectRootDir,
		absolute: true,
		ignore: {
			ignored: p => /(\.test\.\w+|\.d\.ts)$/.test(p.name)
		},
	})
	const mainRollupInput = Object.fromEntries(
		mainEntryPoints.map(file => [
			path.relative(
				projectMainSrcDir,
				file.slice(0, file.length - path.extname(file).length)
			),
			path.resolve(file),
		])
	);

	if (!isBuild) {
		// copy node libraries only once during development instead of using viteStaticCopy
		// as subsequent attempts to replace the loaded files when hot-reloading will fail
		const libFiles = globSync("src/towermod/*.node", { cwd: projectRootDir, absolute: true })
		for (const filePath of libFiles) {
			const destPath = path.join(projectRootDir, 'out/main', path.basename(filePath));
			fs.copyFileSync(filePath, destPath)
		}
	}

	return {
		main: {
			plugins: [
				externalizeDepsPlugin(),
				isBuild ? viteStaticCopy({
					targets: [
						{ src: 'src/towermod/*.node', dest: './' }
					]
				}) : null,
				tsconfigPathPlugin(),
			],
			resolve: {
				extensions: ['.mjs', '.js', '.cjs', '.mts', '.ts', '.jsx', '.tsx', '.json'],
			},
			build: {
				rollupOptions: {
					input: mainRollupInput,
					external: [
						/.*\.node/,
					],
				},
				emptyOutDir: isBuild, // do not delete loaded *.node libraries when hot-reloading during dev
			}
		},
		preload: {
			plugins: [
				externalizeDepsPlugin(),
				tsconfigPathPlugin(),
			],
		},
		renderer: {
			plugins: [
				react(),
				tsconfigPathPlugin()
			],
		}
	}
})
