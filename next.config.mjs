/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Allow images from public/uploads/ (local dev upload feature)
    // Next.js 14.2+ supports localPatterns
    localPatterns: [
      { pathname: "/uploads/**" },
    ],
    // Unoptimized local images (avoids needing width/height for local files)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 64, 96, 128, 256],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // Allow large file uploads through API route
    },
  },
};

export default nextConfig;
