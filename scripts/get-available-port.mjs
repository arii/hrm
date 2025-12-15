import net from 'net';

function findAvailablePort(startPort, maxPort = 65535) {
  return new Promise((resolve, reject) => {
    if (startPort > maxPort) {
      return reject(new Error(`No available port found between ${startPort} and ${maxPort}`));
    }

    const server = net.createServer();
    server.unref();

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1, maxPort)); // Retry with next port
      } else {
        reject(err); // Reject for other types of errors
      }
    });

    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// Start search from 3000, consider adding a reasonable upper limit for CI/testing
findAvailablePort(3000, 3100) // Example max port for testing range
  .then(port => {
    process.stdout.write(port.toString());
  })
  .catch(err => {
    console.error(`Failed to find an available port: ${err.message}`);
    process.exit(1); // Exit with an error code
  });
