package registro

import (
	"bytes"
	"encoding/json"
	"regexp"
	"strings"
	"testing"
)

func TestFormatoEstructurado(t *testing.T) {
	var b bytes.Buffer
	Nuevo(&b, "info").Info("hola", "n", 3)
	var linea map[string]any
	if err := json.Unmarshal(b.Bytes(), &linea); err != nil {
		t.Fatalf("no es JSON: %v (%q)", err, b.String())
	}
	if !regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`).MatchString(linea["ts"].(string)) {
		t.Fatalf("ts inesperado: %v", linea["ts"])
	}
	if linea["nivel"] != "info" || linea["msg"] != "hola" || linea["n"] != float64(3) {
		t.Fatalf("campos inesperados: %v", linea)
	}
}

func TestNivelesFiltran(t *testing.T) {
	var b bytes.Buffer
	l := Nuevo(&b, "warn")
	l.Debug("d")
	l.Info("i")
	l.Warn("w")
	if strings.Count(b.String(), "\n") != 1 || !strings.Contains(b.String(), `"nivel":"warn"`) {
		t.Fatalf("solo debía salir warn: %q", b.String())
	}
}
