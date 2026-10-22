import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const frontendDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, frontendDirectory, 'VITE_');
	const apiTarget = env.VITE_API_URL || 'http://127.0.0.1:8000';

	return {
		plugins: [react()],
		server: {
			proxy: {
				'/api': { target: apiTarget, changeOrigin: true },
				'/health': { target: apiTarget, changeOrigin: true },
			},
		},
	};
});