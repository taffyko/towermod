import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { globSync } from 'glob';
import tsconfigPathPlugin from 'vite-tsconfig-paths'

export default defineConfig(() => {
  const projectRootDir = __dirname;
  const projectMainSrcDir = path.join(projectRootDir, 'src/main');

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

  return {
    main: {
      plugins: [
        externalizeDepsPlugin(),
        viteStaticCopy({
          targets: [
            { src: 'src/towermod/*.node', dest: './' }
          ]
        }),
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
          ]
        }
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
