# Herramienta en Python (esqueleto)

CLI y daemon mínimos, solo con la biblioteca estándar de Python (cero dependencias de producción). El comportamiento (subcomandos, códigos de salida, configuración, entrada no confiable, registro y apagado ordenado) está en `kit/CONTRATO-ESQUELETOS.md`; aquí solo lo propio de Python. Cambia el nombre del paquete (`herramienta`) al adoptarlo. Versión mínima: Python 3.11 (`requires-python` en `pyproject.toml`).

## Uso
```
python -m herramienta check-config --config ejemplo.conf
python -m herramienta run --config ejemplo.conf --once
python -m pip install .          # instala el comando `herramienta` (punto de entrada de pyproject.toml)
```
Un `ejemplo.conf` mínimo: `nombre=demo`. Con token: `chmod 600` (ver el contrato).

## Estructura
| Ruta | Qué hay |
|---|---|
| `herramienta/cli.py` | subcomandos, códigos de salida, salida de texto y JSON; `principal()` conecta SIGINT, SIGTERM (y SIGBREAK en Windows) con un `threading.Event` |
| `herramienta/config.py` | lectura, validación y permisos del archivo de configuración |
| `herramienta/entrada.py` | lectura con límite de tamaño y plazo (en otro hilo) |
| `herramienta/demonio.py` | bucle con apagado ordenado (el trabajo no recibe el evento: se drena; la espera se corta en tramos de 0,2 s para que Windows atienda la señal) |
| `herramienta/registro.py` | `logging` con un formateador JSON (`ts`, `nivel`, `msg`) |
| `tests/` | `unittest`: configuración, entrada, daemon (incluido el apagado ordenado), tabla del CLI y lo declarado en `pyproject.toml` |

## Comprobaciones
```
ruff check .
ruff format --check .
python -m unittest discover -s tests -t .
pip-audit .
```
`ruff` y `pip-audit` son herramientas de desarrollo (no dependencias del paquete): instálalas con versiones fijadas, como hace la integración continua de ejemplo (`.github/workflows/ci.yml`, que prueba la versión mínima y una actual en Ubuntu, Windows y macOS).

## Publicación de ejemplo
`.github/workflows/release.yml` prueba en las tres plataformas, construye la rueda y el paquete fuente (Python puro: un solo artefacto sirve a todas) y genera `SHA256SUMS`. **Queda manual:** subir los paquetes a tu canal de distribución, publicar las sumas por un canal distinto, firmar los artefactos si lo decides (no hay firmas ni claves en el ejemplo) y probar `version` y `check-config` tras instalar en cada plataforma declarada. La herramienta de construcción se acota por rango (`build>=1,<2`); fíjala por versión exacta al adoptar el flujo. Los datos del canal van en `distribucion` de `kit/FICHA-INFRA.json`.

## Límites conocidos
- Los permisos del archivo de configuración no se comprueban en Windows (los bits de modo no los representan).
- Si el plazo de la entrada vence sobre un archivo bloqueado, el hilo de lectura (demonio) queda hasta que el sistema responda; no impide terminar el proceso.
- La señal real (SIGTERM) solo se prueba de punta a punta en sistemas POSIX; el apagado ordenado se prueba en todos con `threading.Event`.
- Instalar el paquete (`pip install .`) y `pip-audit` necesitan red; las pruebas no los usan.

## Qué no construir todavía
| Qué | Señal para construirlo |
|---|---|
| Actualizador propio | Los usuarios no pueden actualizar con `pip` o a mano, y hay un canal de integridad definido |
| Sistema de extensiones | Una segunda persona necesita añadir comportamiento sin tocar el código |
| Interfaz de red | Un cliente remoto real que no puede usar la línea de órdenes |
| Varios procesos o estado persistente | Estado que no cabe en una ejecución bajo demanda |
| Dependencias externas | Una necesidad que la biblioteca estándar no cubre, con su ADR |
| Binario único (empaquetadores) | Usuarios sin Python que no pueden instalar un intérprete; evalúa cambiar de lenguaje antes que empaquetar |
| Soporte de otra plataforma | Un usuario real allí y pruebas ejecutándose en ella |
