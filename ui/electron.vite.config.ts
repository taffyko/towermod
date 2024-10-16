import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';


export default defineConfig({
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
        external: [
          /.*\.node/,
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      }
    },
    plugins: [react()]
  }
})
