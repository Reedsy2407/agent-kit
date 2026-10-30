// Package demonio contiene el bucle de trabajo con apagado ordenado.
package demonio

import (
	"context"
	"log/slog"
	"time"
)

// Trabajo es una vuelta del bucle. Recibe un contexto que NO se cancela con la señal de apagado: el trabajo en curso se drena.
type Trabajo func(ctx context.Context, n int) error

// Resumen cuenta lo ocurrido.
type Resumen struct {
	Ticks   int
	Errores int
}

// Ejecutar repite el trabajo cada intervalo hasta que ctx se cancele (la señal de apagado) o, con una=true, tras una vuelta.
// Al cancelarse ctx no empieza otra vuelta y la espera se interrumpe; la vuelta en curso termina.
func Ejecutar(ctx context.Context, intervalo time.Duration, una bool, trabajo Trabajo, log *slog.Logger) Resumen {
	var r Resumen
	drenable := context.WithoutCancel(ctx)
	for {
		if !una && ctx.Err() != nil {
			return r
		}
		r.Ticks++
		if err := trabajo(drenable, r.Ticks); err != nil {
			r.Errores++
			log.Warn("trabajo_fallido", "n", r.Ticks, "error", err.Error())
		}
		if una {
			return r
		}
		temporizador := time.NewTimer(intervalo)
		select {
		case <-ctx.Done():
			temporizador.Stop()
		case <-temporizador.C:
		}
	}
}
