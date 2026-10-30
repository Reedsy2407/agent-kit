// Package registro crea el registro estructurado: una línea JSON por evento con ts, nivel y msg.
package registro

import (
	"io"
	"log/slog"
	"strings"
)

// Nuevo devuelve un registro JSON que escribe en w. Nivel: debug, info, warn o error.
func Nuevo(w io.Writer, nivel string) *slog.Logger {
	var n slog.Level
	switch nivel {
	case "debug":
		n = slog.LevelDebug
	case "warn":
		n = slog.LevelWarn
	case "error":
		n = slog.LevelError
	default:
		n = slog.LevelInfo
	}
	opciones := &slog.HandlerOptions{
		Level: n,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			switch a.Key {
			case slog.TimeKey:
				return slog.String("ts", a.Value.Time().UTC().Format("2006-01-02T15:04:05.000Z"))
			case slog.LevelKey:
				return slog.String("nivel", strings.ToLower(a.Value.String()))
			}
			return a
		},
	}
	return slog.New(slog.NewJSONHandler(w, opciones))
}
