import getPort from 'get-port';

(async () => {
  const port = await getPort({ port: 3000 });
  console.log(port);
})();
