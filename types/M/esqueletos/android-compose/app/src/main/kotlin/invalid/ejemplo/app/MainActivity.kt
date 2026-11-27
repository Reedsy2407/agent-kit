package invalid.ejemplo.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import invalid.ejemplo.app.tema.TemaApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Borde a borde: al destino del esqueleto no se puede renunciar a ello [P-ACC-7].
        enableEdgeToEdge()
        setContent {
            TemaApp {
                PantallaVacia()
            }
        }
    }
}
