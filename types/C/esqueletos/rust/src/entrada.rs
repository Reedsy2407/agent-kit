//! Lectura de entrada no confiable con límite de tamaño y plazo.

use std::fmt;
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[derive(Debug)]
pub enum ErrorEntrada {
    /// La entrada supera el límite.
    Demasiado,
    /// La entrada no terminó dentro del plazo.
    Tiempo,
    /// No se pudo abrir o leer (error inesperado, no un rechazo de la entrada).
    Io(io::Error),
}

impl fmt::Display for ErrorEntrada {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorEntrada::Demasiado => write!(f, "entrada demasiado grande"),
            ErrorEntrada::Tiempo => write!(f, "entrada sin respuesta"),
            ErrorEntrada::Io(e) => write!(f, "{e}"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Resultado {
    pub bytes: usize,
    pub lineas: usize,
}

fn contar_lineas(datos: &[u8]) -> usize {
    let n = datos.iter().filter(|b| **b == b'\n').count();
    if datos.last().is_some_and(|b| *b != b'\n') {
        n + 1
    } else {
        n
    }
}

/// Abre la fuente y lee como máximo `max` bytes (+1 para detectar el exceso) con plazo `timeout`.
/// La lectura ocurre en otro hilo; si vence el plazo se devuelve `Tiempo` y el hilo se abandona (no impide terminar el proceso).
pub fn leer<R, F>(abrir: F, max: usize, timeout: Duration) -> Result<Resultado, ErrorEntrada>
where
    R: Read,
    F: FnOnce() -> io::Result<R> + Send + 'static,
{
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        let resultado = abrir().and_then(|fuente| {
            let mut datos = Vec::new();
            fuente
                .take(max as u64 + 1)
                .read_to_end(&mut datos)
                .map(|_| datos)
        });
        let _ = tx.send(resultado);
    });
    match rx.recv_timeout(timeout) {
        Err(_) => Err(ErrorEntrada::Tiempo),
        Ok(Err(e)) => Err(ErrorEntrada::Io(e)),
        Ok(Ok(datos)) if datos.len() > max => Err(ErrorEntrada::Demasiado),
        Ok(Ok(datos)) => Ok(Resultado {
            bytes: datos.len(),
            lineas: contar_lineas(&datos),
        }),
    }
}

pub fn leer_archivo(ruta: &Path, max: usize, timeout: Duration) -> Result<Resultado, ErrorEntrada> {
    let ruta = ruta.to_path_buf();
    leer(move || File::open(ruta), max, timeout)
}

#[cfg(test)]
mod pruebas {
    use super::*;
    use std::io::Cursor;

    fn desde(
        texto: &'static [u8],
    ) -> impl FnOnce() -> io::Result<Cursor<&'static [u8]>> + Send + 'static {
        move || Ok(Cursor::new(texto))
    }

    #[test]
    fn cuenta_bytes_y_lineas() {
        for (texto, bytes, lineas) in [
            (&b""[..], 0, 0),
            (b"a\n", 2, 1),
            (b"a\nb", 3, 2),
            (b"\n\n", 2, 2),
        ] {
            let r = leer(desde(texto), 100, Duration::from_secs(1)).unwrap();
            assert_eq!((r.bytes, r.lineas), (bytes, lineas), "{texto:?}");
        }
    }

    #[test]
    fn limite_exacto() {
        assert_eq!(
            leer(desde(b"xxxxxxxxxx"), 10, Duration::from_secs(1))
                .unwrap()
                .bytes,
            10
        );
        assert!(matches!(
            leer(desde(b"xxxxxxxxxxx"), 10, Duration::from_secs(1)),
            Err(ErrorEntrada::Demasiado)
        ));
    }

    #[test]
    fn no_lee_mas_del_limite() {
        struct Infinita;
        impl Read for Infinita {
            fn read(&mut self, b: &mut [u8]) -> io::Result<usize> {
                b.fill(0);
                Ok(b.len())
            }
        }
        let r = leer(|| Ok(Infinita), 1024, Duration::from_secs(5));
        assert!(matches!(r, Err(ErrorEntrada::Demasiado)));
    }

    #[test]
    fn plazo() {
        struct Bloqueada(mpsc::Receiver<()>);
        impl Read for Bloqueada {
            fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
                let _ = self.0.recv(); // espera hasta que se suelte el emisor
                Ok(0)
            }
        }
        let (tx, rx) = mpsc::channel::<()>();
        let inicio = std::time::Instant::now();
        let r = leer(move || Ok(Bloqueada(rx)), 10, Duration::from_millis(50));
        assert!(matches!(r, Err(ErrorEntrada::Tiempo)));
        assert!(inicio.elapsed() < Duration::from_secs(2));
        drop(tx);
    }

    #[test]
    fn archivo_y_error_de_apertura() {
        let ruta =
            std::env::temp_dir().join(format!("herramienta-entrada-{}.txt", std::process::id()));
        std::fs::write(&ruta, "uno\ndos\n").unwrap();
        let r = leer_archivo(&ruta, 100, Duration::from_secs(1)).unwrap();
        assert_eq!((r.bytes, r.lineas), (8, 2));
        std::fs::remove_file(&ruta).unwrap();
        assert!(matches!(
            leer_archivo(&ruta, 100, Duration::from_secs(1)),
            Err(ErrorEntrada::Io(_))
        ));
    }

    #[test]
    fn mensajes() {
        assert_eq!(
            ErrorEntrada::Demasiado.to_string(),
            "entrada demasiado grande"
        );
        assert_eq!(ErrorEntrada::Tiempo.to_string(), "entrada sin respuesta");
    }
}
