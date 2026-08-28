import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile workspace package supaya bisa diimport langsung dari source.
  // Lihat: https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages
  transpilePackages: ['@pantau-pangan/shared'],
  // Lean production image: server + traced node_modules di .next/standalone,
  // dipakai oleh deploy/docker-compose.yml (web runtime image).
  output: 'standalone',
}

export default nextConfig
