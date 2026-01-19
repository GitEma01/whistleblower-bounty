import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supporto WASM per ZK Email SDK
  webpack: (config, { isServer }) => {
    // Abilita WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };
    
    // Fix per moduli che usano WASM lato client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }
    
    // Supporto per file .wasm
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    return config;
  },
  
  // Headers di sicurezza per ZK Email SDK e WalletConnect
  // IMPORTANTE: include storage.googleapis.com per i file blueprint
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script: permetti unsafe-eval per WASM
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:",
              // Style
              "style-src 'self' 'unsafe-inline'",
              // Connect: TUTTI i servizi necessari incluso Google Cloud Storage
              "connect-src 'self' https://*.zk.email https://registry.zk.email https://api.zk.email wss://*.zk.email https://storage.googleapis.com https://*.storage.googleapis.com https://api.web3modal.org https://api.web3modal.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://verify.walletconnect.com https://verify.walletconnect.org https://*.base.org https://sepolia.base.org https://*.infura.io https://*.alchemy.com wss://*.infura.io wss://*.alchemy.com https://api.coingecko.com https://*.ipfs.io https://ipfs.io https://*.cloudflare.com",
              // Img
              "img-src 'self' data: blob: https: http:",
              // Font
              "font-src 'self' data: https:",
              // Frame
              "frame-src 'self' https://verify.walletconnect.org https://verify.walletconnect.com https://*.walletconnect.com",
              // Worker
              "worker-src 'self' blob:",
              // Object
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // Configurazione delle immagini
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Ignora errori durante il build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
