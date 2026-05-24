import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile workspace package supaya bisa diimport langsung dari source.
  // Lihat: https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages
  transpilePackages: ['@pantau-pangan/shared'],
}

export default nextConfig
