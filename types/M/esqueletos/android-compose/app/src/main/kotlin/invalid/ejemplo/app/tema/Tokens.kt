package invalid.ejemplo.app.tema

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Tokens como ideas, agrupados como la tabla «Tokens como idea» del brief móvil.
// Si existe design/DESIGN-BRIEF.md, manda ese archivo: lee sus ideas, fija aquí los valores y anótalos allí en la columna
// «Valor» antes de usarlos. Sin brief, estos valores son provisionales y neutros: no son un diseño ni una marca.
// Iconos y movimiento no tienen tokens porque la pantalla vacía no usa ninguno.

/** Color: fondo, texto, acción principal y estados, en claro y en oscuro. */
data class Paleta(
    val fondo: Color,
    val texto: Color,
    val accion: Color,
    val sobreAccion: Color,
    val error: Color,
    val sobreError: Color,
)

object Colores {
    val claro = Paleta(
        fondo = Color(0xFFFFFFFF),
        texto = Color(0xFF1B1B1B),
        accion = Color(0xFF2F4F6F),
        sobreAccion = Color(0xFFFFFFFF),
        error = Color(0xFF9B1C1C),
        sobreError = Color(0xFFFFFFFF),
    )
    val oscuro = Paleta(
        fondo = Color(0xFF121212),
        texto = Color(0xFFEDEDED),
        accion = Color(0xFFA9C7E4),
        sobreAccion = Color(0xFF0C2033),
        error = Color(0xFFF2B8B5),
        sobreError = Color(0xFF410E0B),
    )
}

/** Tipografía: escalones en sp para que sigan el tamaño de letra del sistema [P-ACC-3]. */
object Letra {
    val titulo = 22.sp
    val cuerpo = 16.sp
    val apoyo = 14.sp
}

/** Espaciado: densidad y ritmo. */
object Espaciado {
    val chico = 8.dp
    val medio = 16.dp
    val grande = 24.dp
}

/** Radios y forma. */
object Radios {
    val chico = 4.dp
    val medio = 12.dp
}
