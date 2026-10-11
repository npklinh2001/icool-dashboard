// mssql and its driver must stay external so Node resolves them at runtime
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['mssql', 'tedious'],
};

export default nextConfig;
