import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Next 15'te appDir varsayılan; experimental.appDir kullanmayın.
  turbopack: {
    // Proje kökü olarak lyntos-ui klasörünü işaretle
    root: path.join(__dirname),
  },
};

export default nextConfig;
