// mssql and its driver must stay external so Node resolves them at runtime
const nextConfig = {
  // standalone output lets the Docker image copy a prebuilt, self-contained server
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['mssql', 'tedious'],
};

export default nextConfig;
