// Punto de entrada: valida la configuración, escucha y se detiene limpio con SIGTERM o SIGINT.
import { cargarConfig, ConfigInvalida } from './config.mjs';
import { crearApp } from './app.mjs';

let config;
try {
  config = cargarConfig();
} catch (e) {
  if (!(e instanceof ConfigInvalida)) throw e;
  console.error(`Configuración inválida: ${e.message}`);
  process.exit(1);
}

const servidor = crearApp(config);
servidor.listen(config.puerto, config.host, () => console.log(JSON.stringify({ nivel: 'info', evento: 'escuchando', puerto: config.puerto })));

function detener() {
  servidor.close(() => process.exit(0));
  servidor.closeIdleConnections();
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', detener);
process.on('SIGINT', detener);
