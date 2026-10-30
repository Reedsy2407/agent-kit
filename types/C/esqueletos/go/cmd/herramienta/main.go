// Command herramienta es el punto de entrada: solo conecta las señales del sistema con el paquete cli.
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"ejemplo.invalid/herramienta/internal/cli"
)

func main() {
	ctx, parar := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	codigo := cli.Ejecutar(ctx, os.Args[1:], os.Stdout, os.Stderr)
	parar()
	os.Exit(codigo)
}
