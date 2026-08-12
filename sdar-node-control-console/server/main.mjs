import { createConsoleBffServer } from './app.mjs';
import { loadConsoleBffConfig } from './config.mjs';

const config = loadConsoleBffConfig();
const server = createConsoleBffServer(config);
server.listen(config.port, config.host, () => {
  console.log(`SDAR Console BFF listening on http://${config.host}:${config.port} mode=${config.mode} security=${config.securityClassification}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error('SDAR Console BFF shutdown failed');
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
