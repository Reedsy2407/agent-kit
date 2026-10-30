// Package formato solo contiene una prueba: falla si algún .go del módulo no está formateado como lo deja gofmt.
// Existe porque `gofmt -l` sale con 0 aunque haya diferencias y el sello de pre-merge solo mira el código de salida;
// con esta prueba, `go test ./...` hace cumplir el formato en cualquier sistema operativo (go/format es el propio gofmt).
package formato

import (
	"bytes"
	"go/format"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTodoElCodigoEstaFormateado(t *testing.T) {
	raiz := filepath.Join("..", "..")
	vistos := 0
	err := filepath.WalkDir(raiz, func(ruta string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(ruta, ".go") {
			return nil
		}
		vistos++
		original, err := os.ReadFile(ruta)
		if err != nil {
			return err
		}
		formateado, err := format.Source(original)
		if err != nil {
			t.Errorf("%s: no se puede formatear: %v", ruta, err)
			return nil
		}
		if !bytes.Equal(original, formateado) {
			t.Errorf("%s: no está formateado (ejecuta gofmt -w .)", ruta)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if vistos < 6 {
		t.Fatalf("solo se revisaron %d archivos .go: ¿cambió la estructura?", vistos)
	}
}
