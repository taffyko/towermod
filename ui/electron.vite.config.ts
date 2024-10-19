import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import { globSync } from 'glob';

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
        })
      ],
      resolve: {
        extensions: ['.mjs', '.js', '.cjs', '.mts', '.ts', '.jsx', '.tsx', '.json'],
        alias: {
          '@': resolve('src'),
          '@shared': resolve('src/shared'),
          '@towermod': resolve('src/towermod'),
        }
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
        // commonjsExternalsPlugin({
        //   externals: ['path']
        // }),
        // nodePolyfills(),
        externalizeDepsPlugin()
      ],
      resolve: {
        alias: {
          '@shared': resolve('src/shared'),
        }
      }
    },
    renderer: {
      plugins: [
        // commonjsExternalsPlugin({
        //   externals: ['path']
        // }),
        // nodePolyfills(),
        react(),
      ],
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@shared': resolve('src/shared'),
        }
      },
    }
  }
})
