/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BOT_SERVER_URL: 'https://bot-production-a4de.up.railway.app',
  },
}

module.exports = nextConfig
