//! Señales de apagado sin dependencias externas (ADR 0019: la biblioteca estándar de Rust no trae manejo de señales).
//!
//! Es la única excepción a `unsafe_code = "deny"`: declara a mano las dos funciones del sistema que hacen falta
//! (`signal` en POSIX, `SetConsoleCtrlHandler` en Windows) y el manejador solo escribe en un `AtomicBool`, lo único
//! que es seguro hacer dentro de un manejador de señal. No hay ninguna otra operación insegura en el esqueleto.
//! SIGINT es 2 y SIGTERM es 15 en Linux y macOS.

use std::sync::atomic::{AtomicBool, Ordering};

static PARAR: AtomicBool = AtomicBool::new(false);

#[cfg(unix)]
mod plataforma {
    use super::{Ordering, PARAR};

    const SIGINT: i32 = 2;
    const SIGTERM: i32 = 15;

    unsafe extern "C" {
        // El valor devuelto es el manejador anterior (o SIG_ERR); no se usa, por eso basta un entero.
        fn signal(signum: i32, handler: extern "C" fn(i32)) -> usize;
    }

    extern "C" fn manejador(_senal: i32) {
        PARAR.store(true, Ordering::SeqCst);
    }

    pub fn instalar() {
        // SAFETY: `signal` es la función estándar de C; el manejador solo escribe un AtomicBool.
        unsafe {
            signal(SIGINT, manejador);
            signal(SIGTERM, manejador);
        }
    }
}

#[cfg(windows)]
mod plataforma {
    use super::{Ordering, PARAR};

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn SetConsoleCtrlHandler(
            handler: Option<unsafe extern "system" fn(u32) -> i32>,
            agregar: i32,
        ) -> i32;
    }

    /// Ctrl+C, Ctrl+Break y cierre de la consola. Devolver 1 dice que la señal está atendida.
    unsafe extern "system" fn manejador(_tipo: u32) -> i32 {
        PARAR.store(true, Ordering::SeqCst);
        1
    }

    pub fn instalar() {
        // SAFETY: función documentada de la API de consola de Windows; el manejador solo escribe un AtomicBool.
        unsafe {
            SetConsoleCtrlHandler(Some(manejador), 1);
        }
    }
}

#[cfg(not(any(unix, windows)))]
mod plataforma {
    pub fn instalar() {}
}

/// Instala los manejadores y devuelve la bandera que se activa al recibir la señal de apagado.
pub fn instalar() -> &'static AtomicBool {
    plataforma::instalar();
    &PARAR
}
