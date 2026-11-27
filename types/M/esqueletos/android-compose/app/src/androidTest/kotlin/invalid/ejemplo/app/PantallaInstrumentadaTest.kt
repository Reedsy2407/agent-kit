package invalid.ejemplo.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

/**
 * PRUEBA INSTRUMENTADA de interfaz (ejemplo): necesita un equipo o un emulador. `check` NO la ejecuta [P-HER-1]; se lanza
 * con `./gradlew connectedAndroidTest` y su resultado se registra aparte. Un emulador no demuestra el segundo plano, el
 * tiempo real ni el uso al volante.
 */
class PantallaInstrumentadaTest {
    @get:Rule
    val regla = createAndroidComposeRule<MainActivity>()

    @Test
    fun laPantallaVaciaSeVe() {
        val texto = regla.activity.getString(R.string.pantalla_vacia)
        regla.onNodeWithText(texto).assertIsDisplayed()
    }
}
