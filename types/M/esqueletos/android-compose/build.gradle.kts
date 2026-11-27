// Complementos de la compilación, declarados una vez. Kotlin llega integrado en el complemento de Android [P-HER-5]:
// declarar el compilador de Compose con la versión de Kotlin del catálogo fija también esa versión de Kotlin.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.compose.compiler) apply false
}
