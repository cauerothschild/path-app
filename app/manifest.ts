import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Path',
    short_name: 'Path',
    description: 'Sistema inteligente de performance pessoal.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#020f0a',
    background_color: '#020f0a',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
