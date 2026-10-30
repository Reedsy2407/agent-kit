package entrada

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func lector(s string) io.ReadCloser { return io.NopCloser(strings.NewReader(s)) }

func TestLeerCuentaBytesYLineas(t *testing.T) {
	casos := []struct {
		texto         string
		bytes, lineas int
	}{
		{"", 0, 0}, {"a\n", 2, 1}, {"a\nb", 3, 2}, {"\n\n", 2, 2},
	}
	for _, c := range casos {
		r, err := Leer(lector(c.texto), 100, time.Second)
		if err != nil || r.Bytes != c.bytes || r.Lineas != c.lineas {
			t.Fatalf("%q: %+v %v", c.texto, r, err)
		}
	}
}

func TestLeerLimiteExacto(t *testing.T) {
	if _, err := Leer(lector(strings.Repeat("x", 10)), 10, time.Second); err != nil {
		t.Fatalf("justo en el límite debe valer: %v", err)
	}
	if _, err := Leer(lector(strings.Repeat("x", 11)), 10, time.Second); !errors.Is(err, ErrDemasiado) {
		t.Fatalf("un byte más debe rechazarse: %v", err)
	}
}

func TestLeerNoCargaMasDelLimite(t *testing.T) {
	// Un lector infinito: sin límite agotaría la memoria.
	infinito := io.NopCloser(io.LimitReader(zeros{}, 1<<30))
	if _, err := Leer(infinito, 1024, 5*time.Second); !errors.Is(err, ErrDemasiado) {
		t.Fatalf("debe rechazar sin leer todo: %v", err)
	}
}

type zeros struct{}

func (zeros) Read(p []byte) (int, error) { clear(p); return len(p), nil }

func TestLeerPlazo(t *testing.T) {
	leer, escribir := io.Pipe() // nadie escribe: la lectura se queda esperando
	defer escribir.Close()
	inicio := time.Now()
	_, err := Leer(leer, 10, 50*time.Millisecond)
	if !errors.Is(err, ErrTiempo) {
		t.Fatalf("debe vencer el plazo: %v", err)
	}
	if time.Since(inicio) > 2*time.Second {
		t.Fatal("el plazo no se respetó")
	}
}

// Abrir también cuenta dentro del plazo (una tubería sin escritor se queda esperando al abrirse) y, si la apertura
// termina después del plazo, la fuente se cierra sin que nadie la espere.
func TestPlazoTambienAlAbrir(t *testing.T) {
	liberar := make(chan struct{})
	cerrada := make(chan struct{})
	abrir := func() (io.ReadCloser, error) {
		<-liberar
		return closerAviso{strings.NewReader("tarde"), cerrada}, nil
	}
	inicio := time.Now()
	if _, err := LeerAbriendo(abrir, 10, 50*time.Millisecond); !errors.Is(err, ErrTiempo) {
		t.Fatalf("debe vencer el plazo al abrir: %v", err)
	}
	if time.Since(inicio) > 2*time.Second {
		t.Fatal("el plazo no se respetó")
	}
	close(liberar)
	select {
	case <-cerrada:
	case <-time.After(2 * time.Second):
		t.Fatal("la fuente abierta tarde debía cerrarse")
	}
}

type closerAviso struct {
	io.Reader
	cerrada chan struct{}
}

func (c closerAviso) Close() error { close(c.cerrada); return nil }

func TestLeerArchivo(t *testing.T) {
	ruta := filepath.Join(t.TempDir(), "d.txt")
	if err := os.WriteFile(ruta, []byte("uno\ndos\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	r, err := LeerArchivo(ruta, 100, time.Second)
	if err != nil || r.Bytes != 8 || r.Lineas != 2 {
		t.Fatalf("%+v %v", r, err)
	}
	if _, err := LeerArchivo(filepath.Join(t.TempDir(), "no"), 100, time.Second); err == nil {
		t.Fatal("un archivo ausente debe fallar")
	}
}
