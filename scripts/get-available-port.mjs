import getPort from 'get-port';

(async () => {
  try {
    const port = await getPort({ port: 3000 });
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
