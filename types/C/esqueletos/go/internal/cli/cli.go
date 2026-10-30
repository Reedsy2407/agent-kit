// Package cli implementa los subcomandos y los códigos de salida (contrato en kit/CONTRATO-ESQUELETOS.md).
package cli

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"time"

	"ejemplo.invalid/herramienta/internal/config"
	"ejemplo.invalid/herramienta/internal/demonio"
	"ejemplo.invalid/herramienta/internal/entrada"
	"ejemplo.invalid/herramienta/internal/registro"
)

// Códigos de salida.
const (
	SalidaOK       = 0
	SalidaError    = 1
	SalidaUso      = 2
	SalidaConfig   = 3
	SalidaEntrada  = 4
	nombrePrograma = "herramienta"
)

// Version se fija al compilar: go build -ldflags "-X ejemplo.invalid/herramienta/internal/cli.Version=1.2.3".
var Version = "0.1.0"

const ayuda = `uso:
  herramienta version [--json]
  herramienta check-config --config RUTA [--json]
  herramienta run --config RUTA [--once] [--json]
`

type resumen struct {
	Ticks   int `json:"ticks"`
	Errores int `json:"errores"`
	Bytes   int `json:"bytes"`
	Lineas  int `json:"lineas"`
}

// Ejecutar corre la línea de órdenes y devuelve el código de salida. ctx se cancela con la señal de apagado.
func Ejecutar(ctx context.Context, args []string, stdout, stderr io.Writer) int {
	if len(args) == 0 {
		fmt.Fprint(stderr, "falta el subcomando\n"+ayuda)
		return SalidaUso
	}
	switch args[0] {
	case "-h", "--help", "help":
		fmt.Fprint(stdout, ayuda)
		return SalidaOK
	case "version":
		return version(args[1:], stdout, stderr)
	case "check-config":
		return checkConfig(args[1:], stdout, stderr)
	case "run":
		return run(ctx, args[1:], stdout, stderr)
	}
	fmt.Fprintf(stderr, "subcomando desconocido: %s\n%s", args[0], ayuda)
	return SalidaUso
}

func conjunto(nombre string, stderr io.Writer) *flag.FlagSet {
	fs := flag.NewFlagSet(nombre, flag.ContinueOnError)
	fs.SetOutput(stderr)
	return fs
}

func escribirJSON(w io.Writer, v any) {
	b, _ := json.Marshal(v)
	fmt.Fprintf(w, "%s\n", b)
}

func version(args []string, stdout, stderr io.Writer) int {
	fs := conjunto("version", stderr)
	salidaJSON := fs.Bool("json", false, "salida JSON")
	if fs.Parse(args) != nil || fs.NArg() != 0 {
		return SalidaUso
	}
	if *salidaJSON {
		escribirJSON(stdout, map[string]string{"nombre": nombrePrograma, "version": Version})
	} else {
		fmt.Fprintf(stdout, "%s %s\n", nombrePrograma, Version)
	}
	return SalidaOK
}

func cargar(fs *flag.FlagSet, args []string, ruta *string, stderr io.Writer) (config.Config, int) {
	if fs.Parse(args) != nil || fs.NArg() != 0 {
		return config.Config{}, SalidaUso
	}
	if *ruta == "" {
		fmt.Fprintln(stderr, "falta --config RUTA")
		return config.Config{}, SalidaUso
	}
	c, err := config.Cargar(*ruta)
	if err != nil {
		fmt.Fprintf(stderr, "error de configuración: %v\n", err)
		return config.Config{}, SalidaConfig
	}
	return c, SalidaOK
}

func checkConfig(args []string, stdout, stderr io.Writer) int {
	fs := conjunto("check-config", stderr)
	ruta := fs.String("config", "", "ruta del archivo de configuración")
	salidaJSON := fs.Bool("json", false, "salida JSON")
	c, codigo := cargar(fs, args, ruta, stderr)
	if codigo != SalidaOK {
		return codigo
	}
	token := "ausente"
	if c.TokenDefinido() {
		token = "definido"
	}
	if *salidaJSON {
		datos := map[string]any{"nombre": c.Nombre, "intervalo_ms": c.IntervaloMS, "max_entrada_bytes": c.MaxEntradaBytes, "timeout_entrada_ms": c.TimeoutEntradaMS, "nivel_log": c.NivelLog, "token": token}
		if c.Entrada != "" {
			datos["entrada"] = c.Entrada
		}
		escribirJSON(stdout, map[string]any{"valida": true, "config": datos})
		return SalidaOK
	}
	fmt.Fprintf(stdout, "configuracion valida\nnombre=%s\nintervalo_ms=%d\nmax_entrada_bytes=%d\ntimeout_entrada_ms=%d\nnivel_log=%s\n", c.Nombre, c.IntervaloMS, c.MaxEntradaBytes, c.TimeoutEntradaMS, c.NivelLog)
	if c.Entrada != "" {
		fmt.Fprintf(stdout, "entrada=%s\n", c.Entrada)
	}
	if c.TokenDefinido() {
		fmt.Fprintln(stdout, "token=<definido>")
	}
	return SalidaOK
}

func run(ctx context.Context, args []string, stdout, stderr io.Writer) int {
	fs := conjunto("run", stderr)
	ruta := fs.String("config", "", "ruta del archivo de configuración")
	una := fs.Bool("once", false, "una sola vuelta")
	salidaJSON := fs.Bool("json", false, "salida JSON")
	c, codigo := cargar(fs, args, ruta, stderr)
	if codigo != SalidaOK {
		return codigo
	}
	log := registro.Nuevo(stderr, c.NivelLog)
	log.Info("inicio", "nombre", c.Nombre, "intervalo_ms", c.IntervaloMS, "token_definido", c.TokenDefinido())

	var total resumen
	var ultimoErrorEntrada error
	trabajo := func(_ context.Context, n int) error {
		log.Debug("tick", "n", n)
		if c.Entrada == "" {
			return nil
		}
		r, err := entrada.LeerArchivo(c.Entrada, c.MaxEntradaBytes, time.Duration(c.TimeoutEntradaMS)*time.Millisecond)
		if err != nil {
			ultimoErrorEntrada = err
			return err
		}
		total.Bytes += r.Bytes
		total.Lineas += r.Lineas
		return nil
	}
	r := demonio.Ejecutar(ctx, time.Duration(c.IntervaloMS)*time.Millisecond, *una, trabajo, log)
	if ctx.Err() != nil {
		log.Info("apagado", "motivo", "señal")
	}
	log.Info("fin", "ticks", r.Ticks, "errores", r.Errores)
	total.Ticks, total.Errores = r.Ticks, r.Errores
	if *una && ultimoErrorEntrada != nil {
		if errors.Is(ultimoErrorEntrada, entrada.ErrDemasiado) || errors.Is(ultimoErrorEntrada, entrada.ErrTiempo) {
			fmt.Fprintf(stderr, "entrada rechazada: %v\n", ultimoErrorEntrada)
			return SalidaEntrada
		}
		fmt.Fprintf(stderr, "error de entrada: %v\n", ultimoErrorEntrada)
		return SalidaError
	}
	if *salidaJSON {
		escribirJSON(stdout, total)
	} else {
		fmt.Fprintf(stdout, "ticks=%d errores=%d bytes=%d lineas=%d\n", total.Ticks, total.Errores, total.Bytes, total.Lineas)
	}
	return SalidaOK
}
