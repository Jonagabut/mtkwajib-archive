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
  },
  experimental: {
    serverActions: {
      // 4mb — Vercel serverless hard limit is 4.5MB.
      // For larger files (photos, videos), client uploads directly
      // to Supabase Storage via presigned URL (see uploadMediaAction).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
