import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fija la raíz del proyecto: sin esto Next puede tomar la carpeta del
  // usuario (por un package-lock.json suelto) como raíz del espacio de trabajo.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
