import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';


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
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') }
      ]
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
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
