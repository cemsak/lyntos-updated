import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  // Next 15'te appDir varsayılan; experimental.appDir kullanmayın.
  turbopack: {
    // Proje kökü olarak lyntos-ui klasörünü işaretle
    root: path.join(__dirname),
  },

  // API Proxy - Backend'e yönlendirme
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },

  // Webpack config for pdfjs-dist compatibility
  webpack: (config, { isServer }) => {
    // Disable canvas for pdfjs-dist (not needed for text extraction)
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }

    // Handle .mjs files from pdfjs-dist
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;
