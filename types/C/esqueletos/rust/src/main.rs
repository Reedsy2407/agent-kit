//! Punto de entrada: conecta las señales del sistema con `cli::ejecutar`.

use std::io::Write;
use std::panic::{self, AssertUnwindSafe};
use std::sync::{Arc, Mutex};

use herramienta::{cli, senal};

fn main() {
    // Un fallo inesperado sale con 1 y sin traza: una traza podría mostrar valores de la configuración.
    panic::set_hook(Box::new(|_| {}));
    let codigo = panic::catch_unwind(AssertUnwindSafe(|| {
        let parar = senal::instalar();
        let args: Vec<String> = std::env::args_os()
            .skip(1)
            .map(|a| a.to_string_lossy().into_owned())
            .collect();
        let err: herramienta::registro::Salida = Arc::new(Mutex::new(std::io::stderr()));
        let mut out = std::io::stdout();
        let codigo = cli::ejecutar(&args, &mut out, &err, parar);
        let _ = out.flush();
        codigo
    }))
    .unwrap_or_else(|_| {
        let _ = writeln!(std::io::stderr(), "error inesperado");
        cli::SALIDA_ERROR
    });
    std::process::exit(codigo);
}
