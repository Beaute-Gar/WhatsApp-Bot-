/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BOT_SERVER_URL: process.env.BOT_SERVER_URL || 'http://localhost:4000',
  },
}

module.exports = nextConfig
