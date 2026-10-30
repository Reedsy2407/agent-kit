# Herramienta en Go (esqueleto)

CLI y daemon mínimos, solo con la biblioteca estándar de Go. El comportamiento (subcomandos, códigos de salida, configuración, entrada no confiable, registro y apagado ordenado) está en `kit/CONTRATO-ESQUELETOS.md`; aquí solo lo propio de Go. Cambia el nombre del módulo (`ejemplo.invalid/herramienta`) y del binario al adoptarlo.

## Uso
```
go build -o herramienta ./cmd/herramienta
./herramienta check-config --config ejemplo.conf
./herramienta run --config ejemplo.conf --once
```
Un `ejemplo.conf` mínimo: `nombre=demo`. Con token: `chmod 600` (ver el contrato).

## Estructura
| Ruta | Qué hay |
|---|---|
| `cmd/herramienta/` | `main`: conecta SIGINT y SIGTERM con un contexto y llama a `cli.Ejecutar` |
| `internal/cli/` | subcomandos, códigos de salida, salida de texto y JSON |
| `internal/config/` | lectura, validación y permisos del archivo de configuración |
| `internal/entrada/` | lectura con límite de tamaño y plazo |
| `internal/demonio/` | bucle con apagado ordenado (el contexto del trabajo no se cancela con la señal: se drena) |
| `internal/registro/` | `log/slog` en JSON con `ts`, `nivel` y `msg` |
| `internal/formato/` | prueba que hace cumplir `gofmt` con `go test` en cualquier sistema |

## Comprobaciones
```
gofmt -l .                      # debe salir vacío (la prueba de formato también lo exige)
go vet ./...
go test -race -count=1 ./...    # -race necesita cgo y un compilador de C
go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./...
```
El sello del kit (`go vet` y `go test`) no usa `-race` para no exigir un compilador de C en todas las máquinas; la integración continua de ejemplo (`.github/workflows/ci.yml`) sí, en Ubuntu, Windows y macOS.

## Publicación de ejemplo
`.github/workflows/release.yml` compila un binario por plataforma con `CGO_ENABLED=0 -trimpath`, lo empaqueta y genera `SHA256SUMS`. **Queda manual:** subir los paquetes a tu canal de distribución, publicar las sumas por un canal distinto, firmar los artefactos si lo decides (no hay firmas ni claves en el ejemplo) y probar `version` y `check-config` en cada plataforma declarada. Los datos del canal van en `distribucion` de `kit/FICHA-INFRA.json`.

## Límites conocidos
- Los permisos del archivo de configuración no se comprueban en Windows (los bits de modo no los representan).
- Si el plazo de la entrada vence sobre un archivo regular bloqueado (por ejemplo un montaje de red colgado), cerrar el archivo no interrumpe la lectura: la goroutine queda hasta que el sistema responda. El proceso sigue su camino.
- Un FIFO como archivo de configuración bloquea la apertura (la configuración debe ser un archivo regular).
- La señal real (SIGTERM) solo se prueba de punta a punta en sistemas POSIX; el apagado ordenado se prueba en todos a nivel de paquete.

## Qué no construir todavía
| Qué | Señal para construirlo |
|---|---|
| Actualizador propio | Los usuarios no pueden actualizar con su gestor de paquetes o a mano, y hay un canal de integridad definido |
| Sistema de extensiones | Una segunda persona necesita añadir comportamiento sin tocar el código |
| Interfaz de red | Un cliente remoto real que no puede usar la línea de órdenes |
| Varios procesos o estado persistente | Estado que no cabe en una ejecución bajo demanda |
| Dependencias externas | Una necesidad que la biblioteca estándar no cubre, con su ADR |
| Soporte de otra plataforma | Un usuario real allí y pruebas ejecutándose en ella |
