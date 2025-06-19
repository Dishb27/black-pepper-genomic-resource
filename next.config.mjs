/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    config.module.rules.push({
      test: /\.(js|jsx)$/, // Process .js and .jsx files
      exclude: /node_modules/, // Exclude node_modules
      use: {
        loader: "babel-loader",
        options: {
          presets: ["next/babel"], // Use Next.js Babel preset
        },
      },
    });

    // Add support for .mjs files if needed (for modules like JBrowse 2)
    config.resolve.extensions.push(".js", ".jsx", ".mjs");
    return config;
  },
};

export default nextConfig;
