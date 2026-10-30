//! Registro estructurado: una línea JSON por evento con `ts`, `nivel` y `msg`.

use std::io::Write;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::json::Valor;

/// Destino compartido de escritura (stderr en producción, un búfer en las pruebas).
pub type Salida = Arc<Mutex<dyn Write + Send>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Nivel {
    Debug,
    Info,
    Warn,
    Error,
}

impl Nivel {
    pub fn desde(texto: &str) -> Nivel {
        match texto {
            "debug" => Nivel::Debug,
            "warn" => Nivel::Warn,
            "error" => Nivel::Error,
            _ => Nivel::Info,
        }
    }

    fn nombre(self) -> &'static str {
        match self {
            Nivel::Debug => "debug",
            Nivel::Info => "info",
            Nivel::Warn => "warn",
            Nivel::Error => "error",
        }
    }
}

pub struct Registro {
    nivel: Nivel,
    salida: Salida,
}

impl Registro {
    pub fn nuevo(salida: Salida, nivel: &str) -> Registro {
        Registro {
            nivel: Nivel::desde(nivel),
            salida,
        }
    }

    pub fn registrar(&self, nivel: Nivel, msg: &str, campos: &[(&str, Valor)]) {
        if nivel < self.nivel {
            return;
        }
        let mut pares = vec![
            ("ts".to_string(), Valor::Texto(rfc3339(ahora_ms()))),
            (
                "nivel".to_string(),
                Valor::Texto(nivel.nombre().to_string()),
            ),
            ("msg".to_string(), Valor::Texto(msg.to_string())),
        ];
        pares.extend(campos.iter().map(|(k, v)| ((*k).to_string(), v.clone())));
        let linea = Valor::Objeto(pares).a_cadena();
        if let Ok(mut s) = self.salida.lock() {
            let _ = writeln!(s, "{linea}");
        }
    }

    pub fn debug(&self, msg: &str, campos: &[(&str, Valor)]) {
        self.registrar(Nivel::Debug, msg, campos);
    }
    pub fn info(&self, msg: &str, campos: &[(&str, Valor)]) {
        self.registrar(Nivel::Info, msg, campos);
    }
    pub fn warn(&self, msg: &str, campos: &[(&str, Valor)]) {
        self.registrar(Nivel::Warn, msg, campos);
    }
}

fn ahora_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| u64::try_from(d.as_millis()).unwrap_or(0))
}

/// Formatea milisegundos desde la época Unix como RFC 3339 en UTC con milisegundos.
/// Usa el algoritmo de fecha civil de Howard Hinnant (dominio público), sin dependencias.
pub fn rfc3339(ms: u64) -> String {
    let segundos = ms / 1000;
    let dias = i64::try_from(segundos / 86_400).unwrap_or(0);
    let resto = segundos % 86_400;
    let z = dias + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let dia = doy - (153 * mp + 2) / 5 + 1;
    let mes = if mp < 10 { mp + 3 } else { mp - 9 };
    let anio = yoe + era * 400 + i64::from(mes <= 2);
    format!(
        "{anio:04}-{mes:02}-{dia:02}T{:02}:{:02}:{:02}.{:03}Z",
        resto / 3600,
        resto % 3600 / 60,
        resto % 60,
        ms % 1000
    )
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[derive(Clone)]
    struct Bufer(Arc<Mutex<Vec<u8>>>);
    impl Write for Bufer {
        fn write(&mut self, b: &[u8]) -> std::io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(b);
            Ok(b.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn rfc3339_fechas_conocidas() {
        assert_eq!(rfc3339(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(rfc3339(951_782_400_000 + 1_234), "2000-02-29T00:00:01.234Z");
        assert_eq!(rfc3339(1_782_777_600_000), "2026-06-30T00:00:00.000Z");
    }

    #[test]
    fn una_linea_json_por_evento_y_filtra_por_nivel() {
        let b = Bufer(Arc::new(Mutex::new(Vec::new())));
        let r = Registro::nuevo(Arc::new(Mutex::new(b.clone())), "warn");
        r.info("oculto", &[]);
        r.warn(
            "aviso",
            &[("n", 3u32.into()), ("token_definido", true.into())],
        );
        let texto = String::from_utf8(b.0.lock().unwrap().clone()).unwrap();
        assert_eq!(texto.matches('\n').count(), 1);
        assert!(texto.starts_with("{\"ts\":\""));
        assert!(
            texto.contains("\"nivel\":\"warn\",\"msg\":\"aviso\",\"n\":3,\"token_definido\":true}")
        );
    }
}
