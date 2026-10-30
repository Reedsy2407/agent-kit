# Verificación de los esqueletos del tipo C

Registro con fecha de lo que se ejecutó de verdad. Las verificaciones necesitan las herramientas de cada stack, pueden usar red (registros públicos) y **no forman parte de `node --test`**: las pruebas del kit solo comprueban estructura, YAML, ausencia de secretos y la instalación (`types/C/test/esqueletos.test.mjs`). Un preset del tipo C es «verificado» solo si su registro está aquí.

## Cómo repetirla
```
node types/C/esqueletos/verificar.mjs <go|python|rust>
```
El script instala el esqueleto con el instalador en una carpeta temporal fuera del repositorio y comprueba, en orden: las versiones de las herramientas, los comandos del sello (los del preset), los extras del stack (formato y auditoría; los opcionales se omiten diciendo que faltan), la construcción del binario, el contrato del CLI (`CONTRATO.md`: trece casos con su código de salida) y, en sistemas POSIX, el daemon con SIGTERM (sale con 0, registra `apagado` y `fin` e imprime el resumen). Salida: una línea `OK`, `FALLO` u `OMITIDO` por paso; `OMITIDO` no cuenta como verificado. Sale con 0 si no hubo ningún `FALLO`.

## Máquina de la verificación
Windows 10 (19045), Node 22.23.4. Las fechas son las del script, en UTC: la ejecución fue la tarde-noche del 2026-10-29 en hora local de la máquina, que ya es el 2026-10-30 en UTC.

## Go
**Verificado el 2026-10-30.** Go 1.27.0 (windows/amd64), govulncheck 1.9.0.
| Paso | Resultado |
|---|---|
| Sello (`go vet ./...`, `go test ./...`) | OK. La prueba `formato` hace cumplir `gofmt` |
| Extra `gofmt -l .` (debe salir vacío) | OK |
| Extra `govulncheck ./...` | OK: 0 vulnerabilidades alcanzables desde el código |
| Construcción (`go build`) y contrato del CLI (trece casos) | OK |
| Daemon con SIGTERM de punta a punta | **OMITIDO**: Node no envía SIGTERM en Windows. El apagado ordenado sí se prueba dentro del paquete `demonio` (se pide parar con una vuelta a medias, se drena y no empieza otra) |
| `go test -race` | **No ejecutado**: exige cgo y aquí no hay compilador de C. Lo ejecuta la integración continua de ejemplo |
| Permisos del archivo de configuración | **No ejecutado en Windows** (contrato: no se comprueban); las pruebas correspondientes se omiten aquí y corren en POSIX |
| Flujos `ci.yml` y `release.yml` | **No ejecutados**: solo se validó que son YAML válido y las reglas de las pruebas (matriz, permisos mínimos, acciones con versión mayor, sin secretos ni firmas) |

Hallazgo de entorno: en esta máquina `go test` termina a veces (más de una vez por cada pocas ejecuciones) con «unlinkat … .test.exe: el proceso no tiene acceso al archivo» (el antivirus retiene el ejecutable temporal) aunque todas las pruebas daban `ok`; en la verificación final salió bien. Si ocurre, repite el comando; `verificar.mjs` lo reintenta una vez y lo anota en la línea del paso (`reintentado una vez`).

Acciones de los flujos (versiones mayores que muestran sus README oficiales el 2026-10-29): `actions/checkout@v7`, `actions/setup-go@v7`, `actions/setup-python@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`. Comprueba que siguen vigentes al usarlos.

## Python
**Verificado el 2026-10-30.** Python 3.11.9 (la versión mínima declarada), ruff 0.17.3, pip-audit 2.10.1.
| Paso | Resultado |
|---|---|
| Sello (`ruff check .`, `ruff format --check .`, `python -m unittest discover -s tests -t .`) | OK (29 pruebas; 2 se omiten en Windows por los permisos) |
| Contrato del CLI (trece casos, con `python -m herramienta`) | OK |
| Daemon con SIGTERM de punta a punta | **OMITIDO**: Node no envía SIGTERM en Windows. El apagado ordenado sí se prueba en `tests/test_demonio.py` (parar con una vuelta a medias, drenar, no empezar otra) |
| `pip-audit .` | **OMITIDO**: necesita red y desde esta máquina `pip` no valida el certificado de PyPI (no se desactiva la verificación; ver la nota de TLS en `types/B/esqueletos/VERIFICACION.md`) |
| `pip install .` (punto de entrada `herramienta`) | **No ejecutado**: necesita descargar `setuptools>=77` (el local es el 65) y PyPI no se puede validar desde aquí. Una prueba comprueba lo declarado en `pyproject.toml` (cero dependencias, versión mínima, versión coincidente y que el punto de entrada se importa y es invocable) |
| Python 3.14 y macOS/Linux | **No ejecutados** (solo 3.11.9 en Windows); la matriz de la integración continua de ejemplo los cubre |
| Flujos `ci.yml` y `release.yml` | **No ejecutados**: solo validados como YAML y por las reglas de las pruebas |

## Rust
**Verificado el 2026-10-30.** Rust 1.99.1 (cargo 1.99.1, rustfmt 1.10.0, clippy 0.1.99), edición 2024. `cargo audit` no está instalado aquí.
| Paso | Resultado |
|---|---|
| Sello (`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`) | OK (19 pruebas unitarias y 2 de integración contra el binario) |
| Construcción (`cargo build --locked`) y contrato del CLI (trece casos) | OK |
| `cargo audit` | **OMITIDO**: herramienta opcional no instalada. La integración continua de ejemplo lo ejecuta (cargo-audit 0.22.2 fijado) |
| Daemon con SIGTERM de punta a punta | **OMITIDO**: Node no envía SIGTERM en Windows. El apagado ordenado sí se prueba en `demonio::pruebas` (parar con una vuelta a medias, drenar, no empezar otra) y, en POSIX, `tests/cli.rs` lo prueba con SIGTERM real |
| Código para POSIX (`signal` y los permisos de archivo) | **No compilado ni ejecutado**: aquí solo se compila el código de Windows. Lo ejecuta la integración continua en Ubuntu y macOS |
| Manejador de Ctrl+C de Windows (`SetConsoleCtrlHandler`) | Compila y se instala; **no probado de punta a punta** |
| Flujos `ci.yml` y `release.yml` | **No ejecutados**: solo validados como YAML y por las reglas de las pruebas |
