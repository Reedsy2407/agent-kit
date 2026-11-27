package invalid.ejemplo.app.tema

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val tipografia = Typography().let {
    it.copy(
        titleLarge = it.titleLarge.copy(fontSize = Letra.titulo),
        bodyLarge = it.bodyLarge.copy(fontSize = Letra.cuerpo),
        bodyMedium = it.bodyMedium.copy(fontSize = Letra.apoyo),
    )
}

private val formas = Shapes(
    small = RoundedCornerShape(Radios.chico),
    medium = RoundedCornerShape(Radios.medio),
)

/**
 * Tema de la app. Sigue el modo oscuro del sistema [P-ACC-5]. Solo se asignan los papeles de color que tienen token;
 * los demás quedan con el valor de la biblioteca hasta que el brief los defina.
 */
@Composable
fun TemaApp(oscuro: Boolean = isSystemInDarkTheme(), contenido: @Composable () -> Unit) {
    val p = if (oscuro) Colores.oscuro else Colores.claro
    val esquema = (if (oscuro) darkColorScheme() else lightColorScheme()).copy(
        background = p.fondo,
        onBackground = p.texto,
        surface = p.fondo,
        onSurface = p.texto,
        primary = p.accion,
        onPrimary = p.sobreAccion,
        error = p.error,
        onError = p.sobreError,
    )
    MaterialTheme(colorScheme = esquema, typography = tipografia, shapes = formas, content = contenido)
}
