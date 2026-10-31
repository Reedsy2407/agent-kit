# Verificación de los esqueletos del tipo C

Registro con fecha de lo que se ejecutó de verdad. Las verificaciones necesitan las herramientas de cada stack, pueden usar red (registros públicos) y **no forman parte de `node --test`**: las pruebas del kit solo comprueban estructura, YAML, ausencia de secretos y la instalación (`types/C/test/esqueletos.test.mjs`). Un preset del tipo C es «verificado» solo si su registro está aquí.

## Cómo repetirla
```
node types/C/esqueletos/verificar.mjs <go|python|rust>
```
El script instala el esqueleto con el instalador en una carpeta temporal fuera del repositorio y comprueba, en orden: las versiones de las herramientas, los comandos del sello (los del preset), los extras del stack (formato y auditoría; los opcionales se omiten diciendo que faltan), la construcción del binario (en Python, `pip install .` en un entorno virtual temporal y el comando instalado `herramienta`), el contrato del CLI (`CONTRATO.md`: trece casos con su código de salida) y, en sistemas POSIX, el daemon con SIGTERM (sale con 0, registra `apagado` y `fin` e imprime el resumen). Salida: una línea `OK`, `FALLO` u `OMITIDO` por paso; `OMITIDO` no cuenta como verificado. Sale con 0 si no hubo ningún `FALLO`.

## Máquina y quién ejecutó
Windows 10 (19045), Node 22.23.4. Las fechas son las del script, en UTC: la ejecución fue la tarde-noche del 2026-10-29 en hora local de la máquina, que ya es el 2026-10-30 en UTC. Los tres esqueletos se verificaron **desde la terminal del agente** (sin añadir nada a mano al PATH ni a las variables de certificados) y, para Python, también desde la terminal del humano (ver «Red y PATH»).

## Red y PATH (C2.1)
Dos obstáculos de entorno que impedían a una terminal del agente ejecutar la verificación completa, y cómo se resolvieron sin desactivar nunca la verificación de certificados:
- **PATH.** Una sesión abierta antes de instalar Go y Cargo no los tiene en el PATH. `verificar.mjs` (con `entorno.mjs`) añade, solo al PATH de los comandos que lanza, las carpetas habituales (`Go\bin`, `go\bin` del usuario y `.cargo\bin`) si existen y faltan, y lo anota en la salida (`PATH de los comandos`). No modifica el entorno del sistema.
- **TLS de `pip`.** Software de seguridad del equipo inspecciona el TLS y sustituye el certificado de `pypi.org` por uno firmado por su propia autoridad. El almacén de confianza del sistema la incluye (y Node la acepta por su configuración), pero `pip` usa su paquete de certificados propio, y aquí además `CURL_CA_BUNDLE` apunta a un paquete antiguo de otra aplicación, que `pip` también respeta. Resultado: «certificate verify failed: unable to get local issuer certificate». `verificar.mjs` primero prueba `pip download` con la configuración habitual; solo si falla **por el certificado**, exporta con `tls.getCACertificates` (Node 22.15 o superior) los certificados incluidos, los del sistema y los extra a un PEM **temporal fuera del repositorio** y repite la prueba con `PIP_CERT`, `REQUESTS_CA_BUNDLE` y `SSL_CERT_FILE` apuntando a él, solo para los comandos que lo necesitan (`pip-audit` y `pip install`). Si el humano ya definió `PIP_CERT` o `REQUESTS_CA_BUNDLE`, no se sobrescriben; si el fallo no es de certificado o ni así valida, el paso queda `OMITIDO` con el motivo. En una terminal donde `pip` ya valida (la del humano) no se cambia nada. Prohibido y comprobado por una prueba: `--trusted-host`, `PIP_NO_VERIFY`, `verify=False` y cualquier otra forma de saltarse la verificación.

## Integración continua ejecutada de verdad (2026-10-30)
El humano ejecutó los tres esqueletos, instalados con el instalador del kit como proyectos reales (una rama por stack: `go`, `python` y `rust`), en un servicio de integración continua alojado, dentro de un repositorio de prueba, y con una etiqueta de prueba por rama. El agente comprobó los resultados leyendo los trabajos reales. Todo lo de esta sección está **ejecutado**; los límites están al final.

| Flujo | Qué se ejecutó | Resultado |
|---|---|---|
| `ci.yml` de Go (ramas y etiquetas) | Ubuntu, macOS y Windows: `gofmt`, `go vet`, `go test -race` y `govulncheck` | Éxito en los tres sistemas |
| `ci.yml` de Python (ramas y etiquetas) | Python 3.11 y 3.14 en Ubuntu, macOS y Windows: `ruff check`, `ruff format --check`, `unittest` y `pip-audit` | Éxito en las seis combinaciones |
| `ci.yml` de Rust (ramas y etiquetas) | Ubuntu, macOS y Windows: `cargo fmt --check`, `cargo clippy -D warnings` y `cargo test`; `cargo audit` solo en Ubuntu (en macOS y Windows se omite por diseño) | Éxito. El código para POSIX (`signal`, permisos de archivo, `tests/cli.rs`) compiló y pasó sus pruebas en Ubuntu y macOS |
| `release.yml` de Go (etiqueta de prueba) | Compilación de cuatro combinaciones de sistema y arquitectura y trabajo de sumas | Éxito; subió el artefacto `paquetes-y-sumas` |
| `release.yml` de Python (etiqueta de prueba) | Pruebas en tres sistemas, construcción de la rueda y del paquete fuente y sumas | Éxito; subió el artefacto `paquetes-y-sumas` |
| `release.yml` de Rust (etiqueta de prueba) | Compilación en modo `release` en tres sistemas y trabajo de sumas | Éxito; subió el artefacto `paquetes-y-sumas` |

Las versiones de las acciones que usan los flujos resolvieron y funcionaron: `actions/checkout@v7`, `actions/setup-go@v7`, `actions/setup-python@v7`, `actions/upload-artifact@v7` y `actions/download-artifact@v8`.

**Lo que esta ejecución NO cubre (sigue abierto):**
1. **SIGTERM de punta a punta.** Solo Rust lo prueba con una señal real y solo en POSIX (`tests/cli.rs`, que corre con `cargo test` en Ubuntu y macOS). Go y Python lo prueban dentro de sus paquetes (`demonio`, `tests/test_demonio.py`), y el CI de ejemplo no lanza el daemon con una señal real. El verificador del kit (`verificar.mjs`) sí lo haría en POSIX, pero nunca se ejecutó en POSIX. En Windows no es posible hacerlo con Node.
2. **El contenido de `SHA256SUMS` y de los paquetes de publicación no se inspeccionó.** Solo se comprobó que los trabajos terminan bien y que el artefacto se sube; no se descargó ni se comprobó que cada suma coincide con su paquete.
3. **Los permisos del archivo de configuración en Windows.** El contrato no los comprueba (los bits de modo no los representan); allí las pruebas correspondientes se omiten.
4. Los paquetes publicados no se instalaron ni se ejecutaron en cada plataforma: `version` y `check-config` sobre el artefacto siguen siendo un paso manual (lo dicen los README).
5. El **lanzamiento manual** (`workflow_dispatch`) y la entrada opcional `version` de `release.yml` se añadieron después de esta ejecución y **no se han ejecutado**.
6. Solo se probaron los ejecutores de esa fecha (Linux de 64 bits, macOS en arquitectura Apple y Windows de 64 bits). La compilación de Go para Linux arm64 es cruzada y no se ejecutó.

**Propuesta de rebanada (no ejecutada, no verificada):** un paso opcional en el `ci.yml` de ejemplo de cada esqueleto, solo en Ubuntu y macOS, que construya el binario, lance `run` con una configuración mínima, espere a ver el registro `inicio`, envíe SIGTERM y compruebe el código de salida 0, el registro `apagado` y el resumen impreso. Cerraría el punto 1 para Go y Python. Mientras no se escriba y se ejecute, no cuenta como verificado.

## Go
**Verificado el 2026-10-30.** Go 1.27.0 (windows/amd64), govulncheck 1.9.0.
| Paso | Resultado |
|---|---|
| Sello (`go vet ./...`, `go test ./...`) | OK. La prueba `formato` hace cumplir `gofmt` |
| Extra `gofmt -l .` (debe salir vacío) | OK |
| Extra `govulncheck ./...` | OK: 0 vulnerabilidades alcanzables desde el código |
| Construcción (`go build`) y contrato del CLI (trece casos) | OK |
| Daemon con SIGTERM de punta a punta | **OMITIDO** aquí (Node no envía SIGTERM en Windows) y **no ejecutado en la integración continua**: el apagado ordenado solo se prueba dentro del paquete `demonio` (se pide parar con una vuelta a medias, se drena y no empieza otra) |
| `go test -race` | **OK en la integración continua** (Ubuntu, macOS y Windows, 2026-10-30). En la máquina de verificación sigue sin ejecutarse: exige cgo y aquí no hay compilador de C |
| Permisos del archivo de configuración | En Windows **no se comprueban** (contrato) y las pruebas se omiten; en Ubuntu y macOS las pruebas de los paquetes corrieron en la integración continua (no se contó una a una cuántas se ejecutaron) |
| Flujos `ci.yml` y `release.yml` | **Ejecutados con éxito** en la integración continua (ver «Integración continua ejecutada de verdad»); el lanzamiento manual, no |

Hallazgo de entorno: en esta máquina `go test` termina a veces (más de una vez por cada pocas ejecuciones) con «unlinkat … .test.exe: el proceso no tiene acceso al archivo» (el antivirus retiene el ejecutable temporal) aunque todas las pruebas daban `ok`; en la verificación final salió bien. Si ocurre, repite el comando; `verificar.mjs` lo reintenta una vez y lo anota en la línea del paso (`reintentado una vez`).

Acciones de los flujos (versiones mayores que resolvieron y funcionaron al ejecutar los flujos el 2026-10-30): `actions/checkout@v7`, `actions/setup-go@v7`, `actions/setup-python@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`. Comprueba que siguen vigentes al usarlos.

## Python
**Verificado el 2026-10-30.** Python 3.11.9 (la versión mínima declarada), ruff 0.17.3, pip-audit 2.10.1.
| Paso | Resultado |
|---|---|
| Sello (`ruff check .`, `ruff format --check .`, `python -m unittest discover -s tests -t .`) | OK (29 pruebas; 2 se omiten en Windows por los permisos) |
| Contrato del CLI (trece casos, con `python -m herramienta`) | OK |
| Daemon con SIGTERM de punta a punta | **OMITIDO** aquí (Node no envía SIGTERM en Windows) y **no ejecutado en la integración continua**: el apagado ordenado solo se prueba en `tests/test_demonio.py` (parar con una vuelta a medias, drenar, no empezar otra) |
| Red de `pip` | OK desde la terminal del agente con el PEM temporal del almacén del sistema (ver «Red y PATH»); la terminal del humano validaba PyPI sin ayuda |
| `pip-audit .` | OK (sin vulnerabilidades conocidas en las dependencias del proyecto, que no tiene) |
| `pip install .` en un entorno virtual temporal | OK (descargó `setuptools>=77` para construir) |
| Comando instalado `herramienta version` y `herramienta version --json` | OK (`herramienta 0.1.0`) |
| Punto de entrada declarado | Además, una prueba comprueba `pyproject.toml` sin red (cero dependencias, versión mínima, versión coincidente y que el punto de entrada se importa y es invocable) |
| Python 3.14 y macOS/Linux | **OK en la integración continua** (3.11 y 3.14 en Ubuntu, macOS y Windows, 2026-10-30: `ruff`, `unittest` y `pip-audit`). En la máquina de verificación solo se probó 3.11.9 en Windows |
| Flujos `ci.yml` y `release.yml` | **Ejecutados con éxito** en la integración continua (ver «Integración continua ejecutada de verdad»); el lanzamiento manual, no |

## Rust
**Verificado el 2026-10-30.** Rust 1.99.1 (cargo 1.99.1, rustfmt 1.10.0, clippy 0.1.99), edición 2024. `cargo audit` no está instalado aquí.
| Paso | Resultado |
|---|---|
| Sello (`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`) | OK (19 pruebas unitarias y 2 de integración contra el binario) |
| Construcción (`cargo build --locked`) y contrato del CLI (trece casos) | OK, ejecutado desde la terminal del agente con el PATH ampliado por el verificador |
| `cargo audit` | **OMITIDO** aquí (herramienta opcional no instalada). **OK en la integración continua**, solo en Ubuntu (cargo-audit 0.22.2 fijado); en macOS y Windows el flujo no lo ejecuta por diseño |
| Daemon con SIGTERM de punta a punta | **OMITIDO** aquí (Node no envía SIGTERM en Windows). El apagado ordenado se prueba en `demonio::pruebas` (parar con una vuelta a medias, drenar, no empezar otra) y, en POSIX, `tests/cli.rs` lo prueba con SIGTERM real: **ejecutado con éxito en Ubuntu y macOS** en la integración continua (2026-10-30) |
| Código para POSIX (`signal` y los permisos de archivo) | En la máquina de verificación solo se compila el código de Windows. **Compiló y pasó sus pruebas en Ubuntu y macOS** en la integración continua (`clippy -D warnings` incluido, 2026-10-30) |
| Manejador de Ctrl+C de Windows (`SetConsoleCtrlHandler`) | Compila y se instala; **no probado de punta a punta** |
| Flujos `ci.yml` y `release.yml` | **Ejecutados con éxito** en la integración continua (ver «Integración continua ejecutada de verdad»); el lanzamiento manual, no |
