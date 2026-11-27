package invalid.ejemplo.app.tema

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Prueba local (en la máquina, sin equipo ni emulador; la corre `check` [P-HER-1]). Falla si las parejas de color o los
 * escalones de letra que enumera aquí bajan del mínimo de accesibilidad. Un token nuevo se añade a la prueba: lo que no
 * está enumerado, y los estilos de la biblioteca, no se comprueban. No sustituye la revisión visual en un equipo.
 */
class TokensTest {
    /** Contraste entre dos colores opacos a partir de su luminancia relativa. */
    private fun contraste(a: Color, b: Color): Float {
        val (claro, oscuro) = listOf(a.luminance(), b.luminance()).sortedDescending()
        return (claro + 0.05f) / (oscuro + 0.05f)
    }

    @Test
    fun elCalculoDeContrasteDistingueLosExtremos() {
        assertTrue(contraste(Color.Black, Color.White) > 20f)
        assertTrue(contraste(Color.White, Color.White) < 1.01f)
    }

    @Test
    fun cadaParejaDeTextoYFondoLlegaAlMinimoEnClaroYEnOscuro() {
        for ((tema, p) in listOf("claro" to Colores.claro, "oscuro" to Colores.oscuro)) {
            val parejas = listOf(
                "texto sobre fondo" to (p.texto to p.fondo),
                "texto sobre la acción" to (p.sobreAccion to p.accion),
                "texto sobre el error" to (p.sobreError to p.error),
                "acción como texto sobre fondo" to (p.accion to p.fondo),
                "error como texto sobre fondo" to (p.error to p.fondo),
            )
            for ((nombre, par) in parejas) {
                val c = contraste(par.first, par.second)
                // Mínimo para texto pequeño [P-ACC-2].
                assertTrue("$tema, $nombre: $c", c >= 4.5f)
            }
        }
    }

    @Test
    fun laLetraNoBajaDelCuerpoMinimo() {
        // Mínimo de cuerpo de la guía de diseño móvil [P-ACC-3].
        for (escalon in listOf(Letra.titulo, Letra.cuerpo, Letra.apoyo)) {
            assertTrue("$escalon", escalon.isSp && escalon.value >= 12f)
        }
    }
}
