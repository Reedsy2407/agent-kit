package app.servicio;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Ajustes obligatorios: si APP_ENTORNO falta o no es válida, el servicio NO arranca (y el mensaje no muestra valores). */
@Validated
@ConfigurationProperties("app")
public record AjustesApp(
        @NotNull(message = "falta APP_ENTORNO (obligatoria: desarrollo o produccion)")
        @Pattern(regexp = "desarrollo|produccion", message = "APP_ENTORNO debe ser desarrollo o produccion")
        String entorno) {
}
