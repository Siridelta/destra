import { defineConfig } from 'vite';
import destraPlugin from '@ad-destra/vite-plugin-destra';

export default defineConfig({
    plugins: [
        destraPlugin({
            entry: './graph.js',
            apiKey: '992e835e9326468b897214ac3c89e04a',
            version: 11
        })
    ],
    server: {
        port: 3000
    }
});
