//! Subcomandos y códigos de salida (contrato en kit/CONTRATO-ESQUELETOS.md).

use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use crate::config::{self, Config};
use crate::demonio;
use crate::entrada::{self, ErrorEntrada};
use crate::json::{Valor, objeto};
use crate::registro::{Registro, Salida};

pub const SALIDA_OK: i32 = 0;
pub const SALIDA_ERROR: i32 = 1;
pub const SALIDA_USO: i32 = 2;
pub const SALIDA_CONFIG: i32 = 3;
pub const SALIDA_ENTRADA: i32 = 4;

pub const NOMBRE: &str = "herramienta";
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

const AYUDA: &str = "uso:\n  herramienta version [--json]\n  herramienta check-config --config RUTA [--json]\n  herramienta run --config RUTA [--once] [--json]\n";

#[derive(Default)]
struct Opciones {
    config: Option<String>,
    once: bool,
    json: bool,
}

/// Analizador mínimo: `--config VALOR`, `--once` y `--json` según el subcomando; cualquier otra cosa es un error de uso.
fn opciones(args: &[String], admite_config: bool, admite_once: bool) -> Result<Opciones, String> {
    let mut o = Opciones::default();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--json" => o.json = true,
            "--once" if admite_once => o.once = true,
            "--config" if admite_config => {
                i += 1;
                o.config = Some(args.get(i).ok_or("--config necesita un valor")?.clone());
            }
            otro => return Err(format!("argumento no reconocido: {otro}")),
        }
        i += 1;
    }
    Ok(o)
}

fn escribir(destino: &Salida, texto: &str) {
    if let Ok(mut s) = destino.lock() {
        let _ = s.write_all(texto.as_bytes());
    }
}

fn linea_json(out: &mut dyn Write, v: &Valor) {
    let _ = writeln!(out, "{}", v.a_cadena());
}

/// Corre la línea de órdenes y devuelve el código de salida. `parar` se activa con la señal de apagado.
pub fn ejecutar(args: &[String], out: &mut dyn Write, err: &Salida, parar: &AtomicBool) -> i32 {
    let Some(orden) = args.first() else {
        escribir(err, &format!("falta el subcomando\n{AYUDA}"));
        return SALIDA_USO;
    };
    let resto = &args[1..];
    match orden.as_str() {
        "-h" | "--help" | "help" => {
            let _ = write!(out, "{AYUDA}");
            SALIDA_OK
        }
        "version" => con_opciones(resto, false, false, err, |o| version(&o, out)),
        "check-config" => con_opciones(resto, true, false, err, |o| check_config(&o, out, err)),
        "run" => con_opciones(resto, true, true, err, |o| run(&o, out, err, parar)),
        otro => {
            escribir(err, &format!("subcomando desconocido: {otro}\n{AYUDA}"));
            SALIDA_USO
        }
    }
}

fn con_opciones(
    args: &[String],
    config: bool,
    once: bool,
    err: &Salida,
    f: impl FnOnce(Opciones) -> i32,
) -> i32 {
    match opciones(args, config, once) {
        Ok(o) => f(o),
        Err(e) => {
            escribir(err, &format!("{e}\n"));
            SALIDA_USO
        }
    }
}

fn version(o: &Opciones, out: &mut dyn Write) -> i32 {
    if o.json {
        linea_json(
            out,
            &objeto([("nombre", NOMBRE.into()), ("version", VERSION.into())]),
        );
    } else {
        let _ = writeln!(out, "{NOMBRE} {VERSION}");
    }
    SALIDA_OK
}

fn cargar(o: &Opciones, err: &Salida) -> Result<Config, i32> {
    let Some(ruta) = o.config.as_deref().filter(|r| !r.is_empty()) else {
        escribir(err, "falta --config RUTA\n");
        return Err(SALIDA_USO);
    };
    config::cargar(Path::new(ruta)).map_err(|e| {
        escribir(err, &format!("error de configuración: {e}\n"));
        SALIDA_CONFIG
    })
}

fn check_config(o: &Opciones, out: &mut dyn Write, err: &Salida) -> i32 {
    let c = match cargar(o, err) {
        Ok(c) => c,
        Err(codigo) => return codigo,
    };
    let token = if c.token_definido() {
        "definido"
    } else {
        "ausente"
    };
    if o.json {
        let mut pares = vec![
            ("nombre", Valor::from(c.nombre.as_str())),
            ("intervalo_ms", c.intervalo_ms.into()),
            ("max_entrada_bytes", (c.max_entrada_bytes as u64).into()),
            ("timeout_entrada_ms", c.timeout_entrada_ms.into()),
            ("nivel_log", c.nivel_log.as_str().into()),
            ("token", token.into()),
        ];
        if !c.entrada.is_empty() {
            pares.push(("entrada", c.entrada.as_str().into()));
        }
        let datos = Valor::Objeto(pares.into_iter().map(|(k, v)| (k.to_string(), v)).collect());
        linea_json(out, &objeto([("valida", true.into()), ("config", datos)]));
        return SALIDA_OK;
    }
    let _ = write!(
        out,
        "configuracion valida\nnombre={}\nintervalo_ms={}\nmax_entrada_bytes={}\ntimeout_entrada_ms={}\nnivel_log={}\n",
        c.nombre, c.intervalo_ms, c.max_entrada_bytes, c.timeout_entrada_ms, c.nivel_log
    );
    if !c.entrada.is_empty() {
        let _ = writeln!(out, "entrada={}", c.entrada);
    }
    if c.token_definido() {
        let _ = writeln!(out, "token=<definido>");
    }
    SALIDA_OK
}

fn run(o: &Opciones, out: &mut dyn Write, err: &Salida, parar: &AtomicBool) -> i32 {
    let c = match cargar(o, err) {
        Ok(c) => c,
        Err(codigo) => return codigo,
    };
    let log = Registro::nuevo(err.clone(), &c.nivel_log);
    log.info(
        "inicio",
        &[
            ("nombre", c.nombre.as_str().into()),
            ("intervalo_ms", c.intervalo_ms.into()),
            ("token_definido", c.token_definido().into()),
        ],
    );

    let (mut bytes, mut lineas) = (0usize, 0usize);
    let mut ultimo_error: Option<ErrorEntrada> = None;
    let mut trabajo = |n: u32| -> Result<(), String> {
        log.debug("tick", &[("n", n.into())]);
        if c.entrada.is_empty() {
            return Ok(());
        }
        match entrada::leer_archivo(
            Path::new(&c.entrada),
            c.max_entrada_bytes,
            Duration::from_millis(c.timeout_entrada_ms),
        ) {
            Ok(r) => {
                bytes += r.bytes;
                lineas += r.lineas;
                Ok(())
            }
            Err(e) => {
                let mensaje = e.to_string();
                ultimo_error = Some(e);
                Err(mensaje)
            }
        }
    };
    let r = demonio::ejecutar(
        parar,
        Duration::from_millis(c.intervalo_ms),
        o.once,
        &mut trabajo,
        &log,
    );
    if parar.load(Ordering::SeqCst) {
        log.info("apagado", &[("motivo", "señal".into())]);
    }
    log.info(
        "fin",
        &[("ticks", r.ticks.into()), ("errores", r.errores.into())],
    );
    if let (true, Some(e)) = (o.once, &ultimo_error) {
        return match e {
            ErrorEntrada::Demasiado | ErrorEntrada::Tiempo => {
                escribir(err, &format!("entrada rechazada: {e}\n"));
                SALIDA_ENTRADA
            }
            ErrorEntrada::Io(_) => {
                escribir(err, &format!("error de entrada: {e}\n"));
                SALIDA_ERROR
            }
        };
    }
    if o.json {
        linea_json(
            out,
            &objeto([
                ("ticks", r.ticks.into()),
                ("errores", r.errores.into()),
                ("bytes", (bytes as u64).into()),
                ("lineas", (lineas as u64).into()),
            ]),
        );
    } else {
        let _ = writeln!(
            out,
            "ticks={} errores={} bytes={bytes} lineas={lineas}",
            r.ticks, r.errores
        );
    }
    SALIDA_OK
}
