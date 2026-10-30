// Package config lee y valida el archivo de configuración (contrato en kit/CONTRATO-ESQUELETOS.md).
package config

import (
	"errors"
	"fmt"
	"io"
	"os"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"unicode/utf8"
)

// MaxBytesArchivo es el tamaño máximo del archivo de configuración: también es entrada no confiable.
const MaxBytesArchivo = 64 * 1024

var reNombre = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,63}$`)

// Config es la configuración ya validada.
type Config struct {
	Nombre           string
	IntervaloMS      int
	MaxEntradaBytes  int
	TimeoutEntradaMS int
	Entrada          string
	NivelLog         string
	Token            string // secreto: nunca se imprime ni se registra
}

// TokenDefinido dice si hay token sin exponer su valor.
func (c Config) TokenDefinido() bool { return c.Token != "" }

// Cargar lee el archivo, comprueba sus permisos y lo valida.
func Cargar(ruta string) (Config, error) {
	f, err := os.Open(ruta)
	if err != nil {
		return Config{}, fmt.Errorf("no se puede abrir el archivo de configuración: %w", err)
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return Config{}, fmt.Errorf("no se puede consultar el archivo de configuración: %w", err)
	}
	if !info.Mode().IsRegular() {
		return Config{}, errors.New("la configuración debe ser un archivo regular")
	}
	datos, err := io.ReadAll(io.LimitReader(f, MaxBytesArchivo+1))
	if err != nil {
		return Config{}, fmt.Errorf("no se puede leer el archivo de configuración: %w", err)
	}
	if len(datos) > MaxBytesArchivo {
		return Config{}, fmt.Errorf("el archivo de configuración supera %d bytes", MaxBytesArchivo)
	}
	if !utf8.Valid(datos) {
		return Config{}, errors.New("el archivo de configuración no es UTF-8")
	}
	c, err := Analizar(string(datos))
	if err != nil {
		return Config{}, err
	}
	if err := comprobarPermisos(info.Mode().Perm(), c.TokenDefinido()); err != nil {
		return Config{}, err
	}
	return c, nil
}

// comprobarPermisos rechaza un archivo escribible por otros y, si guarda un token, legible por otros.
// En Windows los bits de modo no representan los permisos reales: no se comprueba.
func comprobarPermisos(modo os.FileMode, hayToken bool) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	if modo&0o022 != 0 {
		return fmt.Errorf("el archivo de configuración es escribible por grupo u otros (modo %04o): usa chmod 600", modo)
	}
	if hayToken && modo&0o044 != 0 {
		return fmt.Errorf("el archivo de configuración tiene un token y es legible por grupo u otros (modo %04o): usa chmod 600", modo)
	}
	return nil
}

// Analizar valida el texto de una configuración.
func Analizar(texto string) (Config, error) {
	c := Config{IntervaloMS: 1000, MaxEntradaBytes: 65536, TimeoutEntradaMS: 2000, NivelLog: "info"}
	vistas := map[string]bool{}
	for i, linea := range strings.Split(texto, "\n") {
		n := i + 1
		linea = strings.TrimSpace(linea)
		if linea == "" || strings.HasPrefix(linea, "#") {
			continue
		}
		clave, valor, ok := strings.Cut(linea, "=")
		if !ok {
			return Config{}, fmt.Errorf("línea %d: se esperaba clave=valor", n)
		}
		clave, valor = strings.TrimSpace(clave), strings.TrimSpace(valor)
		if vistas[clave] {
			return Config{}, fmt.Errorf("línea %d: la clave %q está repetida", n, clave)
		}
		vistas[clave] = true
		var err error
		switch clave {
		case "nombre":
			if !reNombre.MatchString(valor) {
				err = errors.New("debe cumplir [a-z0-9][a-z0-9_-]{0,63}")
			}
			c.Nombre = valor
		case "intervalo_ms":
			c.IntervaloMS, err = entero(valor, 10, 3600000)
		case "max_entrada_bytes":
			c.MaxEntradaBytes, err = entero(valor, 1, 1048576)
		case "timeout_entrada_ms":
			c.TimeoutEntradaMS, err = entero(valor, 10, 60000)
		case "entrada":
			if valor == "" {
				err = errors.New("no puede estar vacía")
			}
			c.Entrada = valor
		case "nivel_log":
			if valor != "debug" && valor != "info" && valor != "warn" && valor != "error" {
				err = errors.New("debe ser debug, info, warn o error")
			}
			c.NivelLog = valor
		case "token":
			if valor == "" {
				err = errors.New("no puede estar vacío")
			}
			c.Token = valor
		default:
			return Config{}, fmt.Errorf("línea %d: clave desconocida %q", n, clave)
		}
		if err != nil {
			return Config{}, fmt.Errorf("línea %d: %s %s", n, clave, err)
		}
	}
	if c.Nombre == "" {
		return Config{}, errors.New("falta la clave obligatoria nombre")
	}
	return c, nil
}

func entero(valor string, min, max int) (int, error) {
	n, err := strconv.Atoi(valor)
	// Solo dígitos decimales ASCII: Atoi aceptaría también «+10».
	if err != nil || strings.Trim(valor, "0123456789") != "" || n < min || n > max {
		return 0, fmt.Errorf("debe ser un entero de %d a %d", min, max)
	}
	return n, nil
}
