import { defineConfig } from "vite";
import tsconfigPathPlugin from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/postcss';
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [
		react(),
		tsconfigPathPlugin(),
	],
	css: {
		postcss: {
			plugins: [tailwindcss()]
		}
	},
	resolve: {
		alias: {
			'@': '/src',
			path: "path-browserify-win32"
		}
	},

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `rust`
      ignored: ["**/rust/**"],
    },
  },
}));
