import getPort from 'get-port';

(async () => {
  try {
    // Prefer 3001 to avoid potential conflicts with default 3000 in CI environments
    const port = await getPort({ port: 3001 });
    if (!port) {
      console.error("Error: Could not find an available port.");
      process.exit(1);
    }
    console.log(port);
  } catch (error) {
    console.error("Error getting available port:", error);
    process.exit(1);
  }
})();
