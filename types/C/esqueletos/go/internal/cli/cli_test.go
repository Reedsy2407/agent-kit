package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func conf(t *testing.T, texto string) string {
	t.Helper()
	ruta := filepath.Join(t.TempDir(), "c.conf")
	if err := os.WriteFile(ruta, []byte(texto), 0o600); err != nil {
		t.Fatal(err)
	}
	return ruta
}

func correr(ctx context.Context, args ...string) (int, string, string) {
	var o, e bytes.Buffer
	c := Ejecutar(ctx, args, &o, &e)
	return c, o.String(), e.String()
}

// Tabla de casos del contrato del CLI: argumentos -> código de salida, stdout y stderr.
func TestContratoDelCLI(t *testing.T) {
	buena := conf(t, "nombre=demo\nintervalo_ms=10\n")
	mala := conf(t, "nombre=Mal\n")
	secreta := conf(t, "nombre=demo\ntoken=valor-secreto-1\n")
	datos := filepath.Join(t.TempDir(), "d.txt")
	if err := os.WriteFile(datos, []byte("a\nb\nc"), 0o600); err != nil {
		t.Fatal(err)
	}
	conEntrada := conf(t, "nombre=demo\nentrada="+datos+"\n")
	ausente := conf(t, "nombre=demo\nentrada="+filepath.Join(t.TempDir(), "no-existe")+"\n")
	grande := conf(t, "nombre=demo\nmax_entrada_bytes=2\nentrada="+datos+"\n")
	casos := []struct {
		nombre         string
		args           []string
		codigo         int
		stdout, stderr string // fragmentos obligatorios ("" = sin condición); "-" = debe estar vacío
	}{
		{"sin argumentos", nil, 2, "-", "falta el subcomando"},
		{"ayuda", []string{"--help"}, 0, "uso:", "-"},
		{"subcomando desconocido", []string{"baila"}, 2, "-", "subcomando desconocido"},
		{"version", []string{"version"}, 0, "herramienta 0.1.0", "-"},
		{"version json", []string{"version", "--json"}, 0, `{"nombre":"herramienta","version":"0.1.0"}`, "-"},
		{"version con sobrante", []string{"version", "x"}, 2, "-", ""},
		{"version opción rara", []string{"version", "--raro"}, 2, "-", "raro"},
		{"check-config sin --config", []string{"check-config"}, 2, "-", "falta --config"},
		{"check-config válida", []string{"check-config", "--config", buena}, 0, "configuracion valida", "-"},
		{"check-config json", []string{"check-config", "--config", buena, "--json"}, 0, `"valida":true`, "-"},
		{"check-config inválida", []string{"check-config", "--config", mala}, 3, "-", "error de configuración"},
		{"check-config ausente", []string{"check-config", "--config", filepath.Join(t.TempDir(), "no")}, 3, "-", "error de configuración"},
		{"check-config oculta el token", []string{"check-config", "--config", secreta}, 0, "token=<definido>", "-"},
		{"run una vuelta", []string{"run", "--config", buena, "--once"}, 0, "ticks=1 errores=0 bytes=0 lineas=0", `"msg":"inicio"`},
		{"run una vuelta json", []string{"run", "--config", buena, "--once", "--json"}, 0, `{"ticks":1,"errores":0,"bytes":0,"lineas":0}`, `"msg":"fin"`},
		{"run con entrada", []string{"run", "--config", conEntrada, "--once"}, 0, "bytes=5 lineas=3", `"msg":"fin"`},
		{"run entrada demasiado grande", []string{"run", "--config", grande, "--once"}, 4, "-", "demasiado grande"},
		{"run entrada ausente es error inesperado (1), no entrada rechazada (4)", []string{"run", "--config", ausente, "--once"}, 1, "-", "error de entrada"},
		{"run sin --config", []string{"run", "--once"}, 2, "-", "falta --config"},
		{"run config inválida", []string{"run", "--config", mala, "--once"}, 3, "-", "error de configuración"},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			codigo, out, err := correr(context.Background(), c.args...)
			if codigo != c.codigo {
				t.Fatalf("código %d, quería %d (stdout %q, stderr %q)", codigo, c.codigo, out, err)
			}
			for _, par := range [][2]string{{out, c.stdout}, {err, c.stderr}} {
				if par[1] == "-" && par[0] != "" {
					t.Fatalf("debía estar vacío: %q", par[0])
				}
				if par[1] != "" && par[1] != "-" && !strings.Contains(par[0], par[1]) {
					t.Fatalf("%q no contiene %q", par[0], par[1])
				}
			}
			if strings.Contains(out+err, "valor-secreto-1") {
				t.Fatal("se filtró el token")
			}
		})
	}
}

func TestRunNoRegistraElToken(t *testing.T) {
	_, out, err := correr(context.Background(), "run", "--config", conf(t, "nombre=demo\ntoken=valor-secreto-1\nnivel_log=debug\n"), "--once")
	if strings.Contains(out+err, "valor-secreto-1") || !strings.Contains(err, `"token_definido":true`) {
		t.Fatalf("el registro no debe contener el token: %q", err)
	}
}

func TestRegistroEsUnaLineaJSONPorEvento(t *testing.T) {
	_, _, err := correr(context.Background(), "run", "--config", conf(t, "nombre=demo\nnivel_log=debug\n"), "--once")
	lineas := strings.Split(strings.TrimSpace(err), "\n")
	if len(lineas) < 3 {
		t.Fatalf("debía haber inicio, tick y fin: %q", err)
	}
	for _, l := range lineas {
		var v map[string]any
		if json.Unmarshal([]byte(l), &v) != nil || v["ts"] == nil || v["nivel"] == nil || v["msg"] == nil {
			t.Fatalf("línea no estructurada: %q", l)
		}
	}
}

func TestApagadoYaPedidoAntesDeEmpezar(t *testing.T) {
	// Un apagado ya pedido antes de empezar: el modo daemon sale sin trabajar y con 0.
	ctx, parar := context.WithCancel(context.Background())
	parar()
	codigo, out, err := correr(ctx, "run", "--config", conf(t, "nombre=demo\n"))
	if codigo != 0 || !strings.Contains(out, "ticks=0") || !strings.Contains(err, `"msg":"apagado"`) {
		t.Fatalf("%d %q %q", codigo, out, err)
	}
}

func TestPermisosDelArchivoDeConfiguracion(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("los permisos no se comprueban en Windows (contrato)")
	}
	ruta := conf(t, "nombre=demo\ntoken=abcdefgh\n")
	if err := os.Chmod(ruta, 0o644); err != nil {
		t.Fatal(err)
	}
	if codigo, _, err := correr(context.Background(), "check-config", "--config", ruta); codigo != 3 || !strings.Contains(err, "legible") {
		t.Fatalf("%d %q", codigo, err)
	}
}
