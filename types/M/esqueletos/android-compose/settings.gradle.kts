// De dónde salen los complementos y las dependencias. Solo fuentes oficiales y públicas; ningún módulo declara las suyas.
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// Marcador: cambia el nombre al adoptar el esqueleto.
rootProject.name = "esqueleto-android"
include(":app")
