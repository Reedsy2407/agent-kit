//! JSON mínimo de solo escritura (la biblioteca estándar de Rust no trae uno). Cubre lo que necesitan la salida
//! `--json` y el registro: objetos con claves en orden, cadenas, enteros y booleanos.

use std::fmt::Write;

/// Un valor JSON de salida.
#[derive(Debug, Clone, PartialEq)]
pub enum Valor {
    Texto(String),
    Entero(i64),
    Bool(bool),
    Objeto(Vec<(String, Valor)>),
}

impl From<&str> for Valor {
    fn from(t: &str) -> Self {
        Valor::Texto(t.to_string())
    }
}
impl From<String> for Valor {
    fn from(t: String) -> Self {
        Valor::Texto(t)
    }
}
impl From<i64> for Valor {
    fn from(n: i64) -> Self {
        Valor::Entero(n)
    }
}
impl From<u32> for Valor {
    fn from(n: u32) -> Self {
        Valor::Entero(i64::from(n))
    }
}
impl From<u64> for Valor {
    fn from(n: u64) -> Self {
        Valor::Entero(i64::try_from(n).unwrap_or(i64::MAX))
    }
}
impl From<bool> for Valor {
    fn from(b: bool) -> Self {
        Valor::Bool(b)
    }
}

/// Construye un objeto conservando el orden de las claves.
pub fn objeto<const N: usize>(pares: [(&str, Valor); N]) -> Valor {
    Valor::Objeto(pares.into_iter().map(|(k, v)| (k.to_string(), v)).collect())
}

/// Escapa una cadena como literal JSON (con comillas).
pub fn escapar(texto: &str) -> String {
    let mut s = String::with_capacity(texto.len() + 2);
    s.push('"');
    for c in texto.chars() {
        match c {
            '"' => s.push_str("\\\""),
            '\\' => s.push_str("\\\\"),
            '\n' => s.push_str("\\n"),
            '\r' => s.push_str("\\r"),
            '\t' => s.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(s, "\\u{:04x}", c as u32);
            }
            c => s.push(c),
        }
    }
    s.push('"');
    s
}

impl Valor {
    /// Serializa en una sola línea, sin espacios.
    pub fn a_cadena(&self) -> String {
        match self {
            Valor::Texto(t) => escapar(t),
            Valor::Entero(n) => n.to_string(),
            Valor::Bool(b) => b.to_string(),
            Valor::Objeto(pares) => {
                let partes: Vec<String> = pares
                    .iter()
                    .map(|(k, v)| format!("{}:{}", escapar(k), v.a_cadena()))
                    .collect();
                format!("{{{}}}", partes.join(","))
            }
        }
    }
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn escapa_lo_que_rompe_json() {
        assert_eq!(
            escapar("a\"b\\c\nd\te\u{1}"),
            "\"a\\\"b\\\\c\\nd\\te\\u0001\""
        );
        assert_eq!(escapar("ñandú"), "\"ñandú\"");
    }

    #[test]
    fn objeto_en_una_linea_y_en_orden() {
        let v = objeto([
            ("b", 1u32.into()),
            ("a", true.into()),
            ("c", objeto([("x", "y".into())])),
        ]);
        assert_eq!(v.a_cadena(), "{\"b\":1,\"a\":true,\"c\":{\"x\":\"y\"}}");
    }
}
