package invalid.ejemplo.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import invalid.ejemplo.app.tema.Espaciado

/** La única pantalla: vacía a propósito. El armazón entrega el hueco de las barras del sistema [P-ACC-7]. */
@Composable
fun PantallaVacia() {
    Scaffold(modifier = Modifier.fillMaxSize()) { barrasDelSistema ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(barrasDelSistema)
                .padding(Espaciado.medio),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = stringResource(R.string.pantalla_vacia))
        }
    }
}
