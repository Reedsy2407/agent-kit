package app.servicio;

import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Salud y un endpoint trivial. Sin base de datos ni clientes salientes (si los hay, cada cliente lleva tres tiempos). */
@RestController
public class Endpoints {

    static final int MAX_NOMBRE = 50;
    private static final Pattern CONTROLES = Pattern.compile("\\p{Cntrl}");

    private final AjustesApp ajustes;

    public Endpoints(AjustesApp ajustes) {
        this.ajustes = ajustes;
    }

    @GetMapping("/salud")
    public Map<String, String> salud() {
        return Map.of("estado", "ok", "entorno", ajustes.entorno());
    }

    @GetMapping("/api/saludo")
    public Map<String, String> saludo(@RequestParam(defaultValue = "mundo") String nombre) {
        if (nombre.isBlank() || nombre.length() > MAX_NOMBRE || CONTROLES.matcher(nombre).find()) {
            throw new NombreInvalido("nombre debe tener de 1 a " + MAX_NOMBRE + " caracteres, sin controles.");
        }
        return Map.of("mensaje", "Hola, " + nombre);
    }

    /** Error de petición del cliente: se convierte en un problema HTTP 400 por ManejadorErrores. */
    public static class NombreInvalido extends RuntimeException {
        public NombreInvalido(String mensaje) {
            super(mensaje);
        }
    }
}
