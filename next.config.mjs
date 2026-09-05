import os from 'os';

function getLocalNetworkOrigins() {
  const nets = os.networkInterfaces();
  const origins = ['localhost', '127.0.0.1'];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        const parts = net.address.split('.');
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          for (let i = 1; i <= 255; i++) {
            origins.push(`${prefix}.${i}`);
          }
        }
      }
    }
  }
  return origins;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@google/genai'],
  allowedDevOrigins: getLocalNetworkOrigins(),
};

export default nextConfig;
