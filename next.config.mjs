/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hdvsmwigiuzdwbvoopdv.supabase.co',
      },
    ],
  },
}

export default nextConfig
