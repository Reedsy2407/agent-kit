# Herramienta en Rust (esqueleto)

CLI y daemon mínimos, sin ninguna dependencia (ni de producción ni de desarrollo). El comportamiento (subcomandos, códigos de salida, configuración, entrada no confiable, registro y apagado ordenado) está en `kit/CONTRATO-ESQUELETOS.md`; aquí solo lo propio de Rust. Cambia el nombre del paquete (`herramienta`) al adoptarlo. Cadena declarada: Rust 1.99 (`rust-version` y edición 2024 en `Cargo.toml`). `Cargo.lock` se versiona porque es un binario.

## Uso
```
cargo build --release
./target/release/herramienta check-config --config ejemplo.conf
./target/release/herramienta run --config ejemplo.conf --once
```
Un `ejemplo.conf` mínimo: `nombre=demo`. Con token: `chmod 600` (ver el contrato).

## Estructura
| Ruta | Qué hay |
|---|---|
| `src/main.rs` | punto de entrada: instala las señales, convierte un pánico en salida 1 sin traza y llama a `cli::ejecutar` |
| `src/cli.rs` | subcomandos, códigos de salida, salida de texto y JSON |
| `src/config.rs` | lectura, validación y permisos del archivo de configuración |
| `src/entrada.rs` | lectura con límite de tamaño y plazo (en otro hilo, con `mpsc::recv_timeout`) |
| `src/demonio.rs` | bucle con apagado ordenado (el trabajo no recibe la bandera: se drena; la espera se corta en tramos de 50 ms) |
| `src/registro.rs` | registro JSON (`ts`, `nivel`, `msg`); la fecha RFC 3339 se calcula a mano |
| `src/json.rs` | escritor JSON mínimo (la biblioteca estándar no trae uno) |
| `src/senal.rs` | **la única excepción**: señales del sistema sin dependencias (ver abajo) |
| `tests/cli.rs` | tabla de casos del contrato contra el binario real y, en POSIX, el apagado con SIGTERM de punta a punta |

## La excepción de `unsafe`
La biblioteca estándar de Rust no maneja señales. En vez de añadir una dependencia, `src/senal.rs` declara a mano dos funciones del sistema (`signal` en POSIX, `SetConsoleCtrlHandler` en Windows) y el manejador solo escribe un `AtomicBool`. Es el único código inseguro del esqueleto: `Cargo.toml` fija `unsafe_code = "deny"` y solo ese módulo lo permite; una prueba del kit falla si aparece `unsafe` en otro archivo. Si prefieres no mantenerlo, la alternativa es una biblioteca de señales con su ADR.

## Comprobaciones
```
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo audit            # opcional: cargo install cargo-audit --locked
```
La integración continua de ejemplo (`.github/workflows/ci.yml`) las corre con Rust 1.99.1 fijado en Ubuntu, Windows y macOS (`cargo audit` solo en Ubuntu).

## Publicación de ejemplo
`.github/workflows/release.yml` prueba, compila en modo `release` un binario por plataforma, lo empaqueta y genera `SHA256SUMS`. **Queda manual:** subir los paquetes a tu canal de distribución, publicar las sumas por un canal distinto, firmar los artefactos si lo decides (no hay firmas ni claves en el ejemplo), compilar para las plataformas que falten (el ejemplo cubre Linux x86_64, Windows x86_64 y macOS aarch64) y probar `version` y `check-config` en cada plataforma declarada. Los datos del canal van en `distribucion` de `kit/FICHA-INFRA.json`.

## Límites conocidos
- Los permisos del archivo de configuración no se comprueban en Windows (los bits de modo no los representan).
- Si el plazo de la entrada vence sobre un archivo bloqueado, el hilo de lectura se abandona hasta que el sistema responda; no impide terminar el proceso.
- El código específico de POSIX (señales y permisos) solo se compila y se prueba en esos sistemas: la integración continua es quien lo ejecuta.
- En Windows, el manejador atiende Ctrl+C, Ctrl+Break y el cierre de la consola; no se ha probado de punta a punta.

## Qué no construir todavía
| Qué | Señal para construirlo |
|---|---|
| Actualizador propio | Los usuarios no pueden actualizar con su gestor de paquetes o a mano, y hay un canal de integridad definido |
| Sistema de extensiones | Una segunda persona necesita añadir comportamiento sin tocar el código |
| Interfaz de red | Un cliente remoto real que no puede usar la línea de órdenes |
| Varios procesos o estado persistente | Estado que no cabe en una ejecución bajo demanda |
| Dependencias (señales, JSON, argumentos) | Una necesidad que la biblioteca estándar no cubre, con su ADR |
| Más código `unsafe` | Una medición o una biblioteca imprescindible sin alternativa segura, aislada en un módulo |
| Soporte de otra plataforma | Un usuario real allí y pruebas ejecutándose en ella |
