/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compiler: {
        styledComponents: true,
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Optimasi untuk performa
    poweredByHeader: false,
    compress: true,
    productionBrowserSourceMaps: false,
    // Image optimization
    images: {
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
    },
    // Modular imports untuk tree-shaking lebih agresif
    modularizeImports: {
        'lucide-react': {
            transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        },
    },
    // Experimental features untuk performa
    experimental: {
        optimizeCss: true,
        optimizePackageImports: ['lucide-react', 'styled-components', '@supabase/supabase-js'],
        // Turbo mode untuk compile lebih cepat
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
    // Webpack optimization
    webpack: (config, { dev, isServer }) => {
        // Production optimizations
        if (!dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                moduleIds: 'deterministic',
                runtimeChunk: 'single',
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        default: false,
                        vendors: false,
                        // Vendor chunk
                        vendor: {
                            name: 'vendor',
                            chunks: 'all',
                            test: /node_modules/,
                            priority: 20,
                        },
                        // Common chunk
                        common: {
                            name: 'common',
                            minChunks: 2,
                            chunks: 'all',
                            priority: 10,
                            reuseExistingChunk: true,
                            enforce: true,
                        },
                    },
                },
            }
        }
        return config
    },
};

export default nextConfig;
