package config

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestAnalizarValida(t *testing.T) {
	c, err := Analizar("# comentario\n\nnombre = demo-1\nintervalo_ms=50\nnivel_log=debug\ntoken=abcdefgh\nentrada=datos.txt\n")
	if err != nil {
		t.Fatal(err)
	}
	if c.Nombre != "demo-1" || c.IntervaloMS != 50 || c.NivelLog != "debug" || !c.TokenDefinido() || c.Entrada != "datos.txt" {
		t.Fatalf("valores inesperados: %+v", c)
	}
	if c.MaxEntradaBytes != 65536 || c.TimeoutEntradaMS != 2000 {
		t.Fatalf("faltan los valores por defecto: %+v", c)
	}
}

func TestAnalizarErrores(t *testing.T) {
	casos := []struct{ nombre, texto, quiere string }{
		{"sin nombre", "intervalo_ms=100\n", "falta la clave obligatoria nombre"},
		{"nombre inválido", "nombre=Mayus\n", "línea 1: nombre"},
		{"sin igual", "nombre=a\nresto\n", "línea 2: se esperaba clave=valor"},
		{"desconocida", "nombre=a\nraro=1\n", "clave desconocida"},
		{"repetida", "nombre=a\nnombre=b\n", "repetida"},
		{"intervalo bajo", "nombre=a\nintervalo_ms=9\n", "intervalo_ms"},
		{"intervalo texto", "nombre=a\nintervalo_ms=x\n", "intervalo_ms"},
		{"intervalo con signo", "nombre=a\nintervalo_ms=+50\n", "intervalo_ms"},
		{"intervalo con guion bajo", "nombre=a\nintervalo_ms=5_0\n", "intervalo_ms"},
		{"max entrada alto", "nombre=a\nmax_entrada_bytes=1048577\n", "max_entrada_bytes"},
		{"timeout bajo", "nombre=a\ntimeout_entrada_ms=1\n", "timeout_entrada_ms"},
		{"nivel", "nombre=a\nnivel_log=ruidoso\n", "nivel_log"},
		{"token vacío", "nombre=a\ntoken=\n", "token"},
		{"entrada vacía", "nombre=a\nentrada=\n", "entrada"},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			_, err := Analizar(c.texto)
			if err == nil || !strings.Contains(err.Error(), c.quiere) {
				t.Fatalf("error %v, quería algo con %q", err, c.quiere)
			}
		})
	}
}

func TestErrorNoFiltraElToken(t *testing.T) {
	_, err := Analizar("nombre=a\ntoken=secreto-muy-largo\nintervalo_ms=1\n")
	if err == nil || strings.Contains(err.Error(), "secreto-muy-largo") {
		t.Fatalf("el error debe existir y no contener el token: %v", err)
	}
}

func escribir(t *testing.T, texto string, modo os.FileMode) string {
	t.Helper()
	ruta := filepath.Join(t.TempDir(), "c.conf")
	if err := os.WriteFile(ruta, []byte(texto), modo); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(ruta, modo); err != nil {
		t.Fatal(err)
	}
	return ruta
}

func TestCargarPermisos(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("en Windows los permisos de archivo no se comprueban (contrato)")
	}
	if _, err := Cargar(escribir(t, "nombre=a\n", 0o644)); err != nil {
		t.Fatalf("0644 sin token debe valer: %v", err)
	}
	if _, err := Cargar(escribir(t, "nombre=a\ntoken=abcdefgh\n", 0o600)); err != nil {
		t.Fatalf("0600 con token debe valer: %v", err)
	}
	if _, err := Cargar(escribir(t, "nombre=a\n", 0o666)); err == nil || !strings.Contains(err.Error(), "escribible") {
		t.Fatalf("0666 debe rechazarse: %v", err)
	}
	if _, err := Cargar(escribir(t, "nombre=a\ntoken=abcdefgh\n", 0o644)); err == nil || !strings.Contains(err.Error(), "legible") {
		t.Fatalf("0644 con token debe rechazarse: %v", err)
	}
}

func TestCargarRechazaLoQueNoEsArchivoPequeno(t *testing.T) {
	if _, err := Cargar(filepath.Join(t.TempDir(), "no-existe")); err == nil {
		t.Fatal("un archivo que no existe debe fallar")
	}
	if _, err := Cargar(t.TempDir()); err == nil {
		t.Fatal("una carpeta no es una configuración")
	}
	if _, err := Cargar(escribir(t, "nombre=\xff\xfe\n", 0o600)); err == nil || !strings.Contains(err.Error(), "UTF-8") {
		t.Fatalf("un archivo que no es UTF-8 debe rechazarse: %v", err)
	}
	grande := "nombre=a\n#" + strings.Repeat("x", MaxBytesArchivo)
	if _, err := Cargar(escribir(t, grande, 0o600)); err == nil || !strings.Contains(err.Error(), "supera") {
		t.Fatalf("un archivo enorme debe rechazarse: %v", err)
	}
}
