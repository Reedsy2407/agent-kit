//! Bucle de trabajo con apagado ordenado.

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant};

use crate::registro::Registro;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct Resumen {
    pub ticks: u32,
    pub errores: u32,
}

/// Repite `trabajo(n)` cada `intervalo` hasta que `parar` se active o, con `una`, tras una vuelta.
/// Al activarse `parar` no empieza otra vuelta y la espera se interrumpe en menos de 50 ms; la vuelta en curso
/// termina (se drena): `parar` no se pasa al trabajo.
pub fn ejecutar(
    parar: &AtomicBool,
    intervalo: Duration,
    una: bool,
    trabajo: &mut dyn FnMut(u32) -> Result<(), String>,
    log: &Registro,
) -> Resumen {
    let mut r = Resumen::default();
    loop {
        if !una && parar.load(Ordering::SeqCst) {
            return r;
        }
        r.ticks += 1;
        if let Err(e) = trabajo(r.ticks) {
            r.errores += 1;
            log.warn(
                "trabajo_fallido",
                &[("n", r.ticks.into()), ("error", e.into())],
            );
        }
        if una {
            return r;
        }
        esperar(parar, intervalo);
    }
}

fn esperar(parar: &AtomicBool, intervalo: Duration) {
    let fin = Instant::now() + intervalo;
    while !parar.load(Ordering::SeqCst) {
        let resto = fin.saturating_duration_since(Instant::now());
        if resto.is_zero() {
            return;
        }
        thread::sleep(resto.min(Duration::from_millis(50)));
    }
}

#[cfg(test)]
mod pruebas {
    use super::*;
    use std::sync::mpsc;
    use std::sync::{Arc, Mutex};

    fn silencio() -> Registro {
        Registro::nuevo(Arc::new(Mutex::new(std::io::sink())), "error")
    }

    #[test]
    fn una_vuelta() {
        let parar = AtomicBool::new(false);
        let mut llamadas = Vec::new();
        let r = ejecutar(
            &parar,
            Duration::from_secs(3600),
            true,
            &mut |n| {
                llamadas.push(n);
                Ok(())
            },
            &silencio(),
        );
        assert_eq!(
            (r, llamadas),
            (
                Resumen {
                    ticks: 1,
                    errores: 0
                },
                vec![1]
            )
        );
    }

    #[test]
    fn cuenta_errores() {
        let parar = AtomicBool::new(false);
        let r = ejecutar(
            &parar,
            Duration::from_secs(3600),
            true,
            &mut |_| Err("falla".into()),
            &silencio(),
        );
        assert_eq!(
            r,
            Resumen {
                ticks: 1,
                errores: 1
            }
        );
    }

    #[test]
    fn repite_hasta_el_apagado() {
        let parar = AtomicBool::new(false);
        let r = ejecutar(
            &parar,
            Duration::from_millis(1),
            false,
            &mut |n| {
                if n == 3 {
                    parar.store(true, Ordering::SeqCst);
                }
                Ok(())
            },
            &silencio(),
        );
        assert_eq!(r.ticks, 3);
    }

    /// Apagado ordenado: se pide parar con una vuelta a medias; la vuelta termina (se drena), no empieza otra y la
    /// espera larga entre vueltas no retrasa la salida.
    #[test]
    fn apagado_ordenado_drena_la_vuelta_en_curso() {
        let parar = Arc::new(AtomicBool::new(false));
        let (empezo_tx, empezo_rx) = mpsc::channel::<()>();
        let (soltar_tx, soltar_rx) = mpsc::channel::<()>();
        let (hecho_tx, hecho_rx) = mpsc::channel::<(Resumen, u32)>();
        let parar_hilo = Arc::clone(&parar);
        let hilo = thread::spawn(move || {
            let mut terminadas = 0;
            let r = ejecutar(
                &parar_hilo,
                Duration::from_secs(3600),
                false,
                &mut |_| {
                    empezo_tx.send(()).unwrap();
                    soltar_rx.recv().unwrap();
                    terminadas += 1;
                    Ok(())
                },
                &silencio(),
            );
            hecho_tx.send((r, terminadas)).unwrap();
        });
        empezo_rx.recv_timeout(Duration::from_secs(5)).unwrap();
        parar.store(true, Ordering::SeqCst); // llega la señal con la vuelta a medias
        assert!(
            hecho_rx.recv_timeout(Duration::from_millis(100)).is_err(),
            "no debe salir antes de que termine la vuelta en curso"
        );
        soltar_tx.send(()).unwrap();
        let (r, terminadas) = hecho_rx
            .recv_timeout(Duration::from_secs(2))
            .expect("no salió tras drenar (¿esperó el intervalo de una hora?)");
        assert_eq!(
            (r, terminadas),
            (
                Resumen {
                    ticks: 1,
                    errores: 0
                },
                1
            )
        );
        hilo.join().unwrap();
    }
}
