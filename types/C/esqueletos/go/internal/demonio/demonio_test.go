package demonio

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"
)

var silencio = slog.New(slog.NewTextHandler(io.Discard, nil))

func TestUnaVuelta(t *testing.T) {
	var n atomic.Int32
	r := Ejecutar(context.Background(), time.Hour, true, func(context.Context, int) error { n.Add(1); return nil }, silencio)
	if r.Ticks != 1 || r.Errores != 0 || n.Load() != 1 {
		t.Fatalf("%+v", r)
	}
}

func TestCuentaErrores(t *testing.T) {
	r := Ejecutar(context.Background(), time.Hour, true, func(context.Context, int) error { return errors.New("falla") }, silencio)
	if r.Ticks != 1 || r.Errores != 1 {
		t.Fatalf("%+v", r)
	}
}

func TestRepiteHastaElApagado(t *testing.T) {
	ctx, parar := context.WithCancel(context.Background())
	var n atomic.Int32
	r := Ejecutar(ctx, time.Millisecond, false, func(context.Context, int) error {
		if n.Add(1) == 3 {
			parar()
		}
		return nil
	}, silencio)
	if r.Ticks != 3 {
		t.Fatalf("debía parar tras la vuelta 3: %+v", r)
	}
}

// Apagado ordenado: se pide parar mientras una vuelta está en curso; la vuelta termina (se drena), no empieza otra
// y la espera larga entre vueltas no retrasa la salida.
func TestApagadoOrdenadoDrenaLaVueltaEnCurso(t *testing.T) {
	ctx, parar := context.WithCancel(context.Background())
	empezo := make(chan struct{})
	soltar := make(chan struct{})
	var terminadas atomic.Int32
	hecho := make(chan Resumen, 1)
	go func() {
		hecho <- Ejecutar(ctx, time.Hour, false, func(c context.Context, n int) error {
			close(empezo)
			<-soltar
			if c.Err() != nil {
				return errors.New("el trabajo en curso no debe cancelarse con la señal")
			}
			terminadas.Add(1)
			return nil
		}, silencio)
	}()
	<-empezo
	parar() // llega la señal con la vuelta a medias
	select {
	case <-hecho:
		t.Fatal("no debe salir antes de que termine la vuelta en curso")
	case <-time.After(50 * time.Millisecond):
	}
	close(soltar)
	select {
	case r := <-hecho:
		if r.Ticks != 1 || r.Errores != 0 || terminadas.Load() != 1 {
			t.Fatalf("resumen incoherente: %+v, terminadas %d", r, terminadas.Load())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no salió tras drenar (¿esperó el intervalo de una hora?)")
	}
}
