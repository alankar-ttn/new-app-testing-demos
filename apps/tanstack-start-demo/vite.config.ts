import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { mountPrefix, viteBase } from './src/mount'

const prefix = mountPrefix()
const hubOrigin = process.env.DEMO_HUB_ORIGIN

const config = defineConfig({
  base: viteBase(),
  resolve: { tsconfigPaths: true },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PORT ?? 3000),
    hmr: hubOrigin
      ? { clientPort: Number(new URL(hubOrigin).port) }
      : undefined,
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro(prefix ? { baseURL: prefix } : {}),
    viteReact(),
  ],
})

export default config
