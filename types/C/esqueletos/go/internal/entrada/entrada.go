// Package entrada lee entrada no confiable con límite de tamaño y plazo.
package entrada

import (
	"bytes"
	"errors"
	"io"
	"os"
	"sync"
	"time"
)

var (
	// ErrDemasiado indica que la entrada supera el límite.
	ErrDemasiado = errors.New("entrada demasiado grande")
	// ErrTiempo indica que la entrada no terminó dentro del plazo.
	ErrTiempo = errors.New("entrada sin respuesta")
)

// Resultado es lo que se extrae de la entrada.
type Resultado struct {
	Bytes  int
	Lineas int
}

// LeerArchivo abre la ruta y lee como máximo max bytes con plazo timeout. Abrir también cuenta dentro del plazo:
// abrir una tubería sin escritor se queda esperando.
func LeerArchivo(ruta string, max int, timeout time.Duration) (Resultado, error) {
	return LeerAbriendo(func() (io.ReadCloser, error) { return os.Open(ruta) }, max, timeout)
}

// Leer lee de r como máximo max bytes y cierra r.
func Leer(r io.ReadCloser, max int, timeout time.Duration) (Resultado, error) {
	return LeerAbriendo(func() (io.ReadCloser, error) { return r, nil }, max, timeout)
}

// LeerAbriendo abre la fuente y lee de ella, todo en otra goroutine y dentro del plazo. Lee max+1 para detectar el exceso
// sin cargar el resto. Si el plazo vence, cierra la fuente (ahora o en cuanto se abra) y devuelve ErrTiempo.
func LeerAbriendo(abrir func() (io.ReadCloser, error), max int, timeout time.Duration) (Resultado, error) {
	type salida struct {
		datos []byte
		err   error
	}
	canal := make(chan salida, 1)
	var (
		mu     sync.Mutex
		fuente io.ReadCloser
		vencio bool
	)
	go func() {
		r, err := abrir()
		if err != nil {
			canal <- salida{nil, err}
			return
		}
		mu.Lock()
		if vencio { // el plazo ya venció mientras se abría: nadie espera el resultado
			mu.Unlock()
			_ = r.Close()
			return
		}
		fuente = r
		mu.Unlock()
		datos, err := io.ReadAll(io.LimitReader(r, int64(max)+1))
		canal <- salida{datos, err}
	}()
	temporizador := time.NewTimer(timeout)
	defer temporizador.Stop()
	select {
	case s := <-canal:
		mu.Lock()
		if fuente != nil {
			_ = fuente.Close()
		}
		mu.Unlock()
		if s.err != nil {
			return Resultado{}, s.err
		}
		if len(s.datos) > max {
			return Resultado{}, ErrDemasiado
		}
		return Resultado{Bytes: len(s.datos), Lineas: contarLineas(s.datos)}, nil
	case <-temporizador.C:
		mu.Lock()
		vencio = true
		if fuente != nil {
			_ = fuente.Close()
		}
		mu.Unlock()
		return Resultado{}, ErrTiempo
	}
}

func contarLineas(d []byte) int {
	n := bytes.Count(d, []byte{'\n'})
	if len(d) > 0 && d[len(d)-1] != '\n' {
		n++
	}
	return n
}
