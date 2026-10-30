//! Lectura y validación del archivo de configuración (contrato en kit/CONTRATO-ESQUELETOS.md).

use std::collections::HashSet;
use std::fs::File;
use std::io::Read;
use std::path::Path;

pub const MAX_BYTES_ARCHIVO: usize = 64 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub nombre: String,
    pub intervalo_ms: u64,
    pub max_entrada_bytes: usize,
    pub timeout_entrada_ms: u64,
    pub entrada: String,
    pub nivel_log: String,
    /// Secreto: nunca se imprime ni se registra.
    pub token: String,
}

impl Config {
    pub fn token_definido(&self) -> bool {
        !self.token.is_empty()
    }
}

fn nombre_valido(v: &str) -> bool {
    let b = v.as_bytes();
    !b.is_empty()
        && b.len() <= 64
        && (b[0].is_ascii_lowercase() || b[0].is_ascii_digit())
        && b.iter()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == b'_' || *c == b'-')
}

fn entero(valor: &str, min: u64, max: u64) -> Result<u64, String> {
    let n = if !valor.is_empty() && valor.bytes().all(|c| c.is_ascii_digit()) {
        valor.parse::<u64>().ok()
    } else {
        None
    };
    match n {
        Some(n) if (min..=max).contains(&n) => Ok(n),
        _ => Err(format!("debe ser un entero de {min} a {max}")),
    }
}

pub fn analizar(texto: &str) -> Result<Config, String> {
    let mut c = Config {
        nombre: String::new(),
        intervalo_ms: 1000,
        max_entrada_bytes: 65_536,
        timeout_entrada_ms: 2000,
        entrada: String::new(),
        nivel_log: "info".to_string(),
        token: String::new(),
    };
    let mut vistas: HashSet<String> = HashSet::new();
    for (i, linea) in texto.split('\n').enumerate() {
        let n = i + 1;
        let linea = linea.trim();
        if linea.is_empty() || linea.starts_with('#') {
            continue;
        }
        let Some((clave, valor)) = linea.split_once('=') else {
            return Err(format!("línea {n}: se esperaba clave=valor"));
        };
        let (clave, valor) = (clave.trim(), valor.trim());
        if !vistas.insert(clave.to_string()) {
            return Err(format!("línea {n}: la clave {clave:?} está repetida"));
        }
        let resultado: Result<(), String> = match clave {
            "nombre" => {
                c.nombre = valor.to_string();
                if nombre_valido(valor) {
                    Ok(())
                } else {
                    Err("debe cumplir [a-z0-9][a-z0-9_-]{0,63}".to_string())
                }
            }
            "intervalo_ms" => entero(valor, 10, 3_600_000).map(|v| c.intervalo_ms = v),
            "max_entrada_bytes" => {
                entero(valor, 1, 1_048_576).map(|v| c.max_entrada_bytes = v as usize)
            }
            "timeout_entrada_ms" => entero(valor, 10, 60_000).map(|v| c.timeout_entrada_ms = v),
            "entrada" | "token" if valor.is_empty() => Err("no puede estar vacío".to_string()),
            "entrada" => {
                c.entrada = valor.to_string();
                Ok(())
            }
            "token" => {
                c.token = valor.to_string();
                Ok(())
            }
            "nivel_log" => {
                if ["debug", "info", "warn", "error"].contains(&valor) {
                    c.nivel_log = valor.to_string();
                    Ok(())
                } else {
                    Err("debe ser debug, info, warn o error".to_string())
                }
            }
            _ => return Err(format!("línea {n}: clave desconocida {clave:?}")),
        };
        resultado.map_err(|e| format!("línea {n}: {clave} {e}"))?;
    }
    if c.nombre.is_empty() {
        return Err("falta la clave obligatoria nombre".to_string());
    }
    Ok(c)
}

/// Rechaza un archivo escribible por otros y, si guarda un token, legible por otros.
/// En Windows los bits de modo no representan los permisos reales: no se comprueba.
pub fn comprobar_permisos(modo: u32, hay_token: bool, es_windows: bool) -> Result<(), String> {
    if es_windows {
        return Ok(());
    }
    let modo = modo & 0o777;
    if modo & 0o022 != 0 {
        return Err(format!(
            "el archivo de configuración es escribible por grupo u otros (modo {modo:04o}): usa chmod 600"
        ));
    }
    if hay_token && modo & 0o044 != 0 {
        return Err(format!(
            "el archivo de configuración tiene un token y es legible por grupo u otros (modo {modo:04o}): usa chmod 600"
        ));
    }
    Ok(())
}

#[cfg(unix)]
fn modo_de(meta: &std::fs::Metadata) -> Option<u32> {
    use std::os::unix::fs::PermissionsExt;
    Some(meta.permissions().mode())
}

#[cfg(not(unix))]
fn modo_de(_meta: &std::fs::Metadata) -> Option<u32> {
    None
}

pub fn cargar(ruta: &Path) -> Result<Config, String> {
    let archivo = File::open(ruta)
        .map_err(|e| format!("no se puede abrir el archivo de configuración: {e}"))?;
    let meta = archivo
        .metadata()
        .map_err(|e| format!("no se puede consultar el archivo de configuración: {e}"))?;
    if !meta.is_file() {
        return Err("la configuración debe ser un archivo regular".to_string());
    }
    let mut datos = Vec::new();
    archivo
        .take(MAX_BYTES_ARCHIVO as u64 + 1)
        .read_to_end(&mut datos)
        .map_err(|e| format!("no se puede leer el archivo de configuración: {e}"))?;
    if datos.len() > MAX_BYTES_ARCHIVO {
        return Err(format!(
            "el archivo de configuración supera {MAX_BYTES_ARCHIVO} bytes"
        ));
    }
    let texto = String::from_utf8(datos)
        .map_err(|_| "el archivo de configuración no es UTF-8".to_string())?;
    let c = analizar(&texto)?;
    if let Some(modo) = modo_de(&meta) {
        comprobar_permisos(modo, c.token_definido(), cfg!(windows))?;
    }
    Ok(c)
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn valida_con_valores_por_defecto() {
        let c = analizar("# comentario\n\nnombre = demo-1\nintervalo_ms=50\nnivel_log=debug\ntoken=abcdefgh\nentrada=d.txt\n").unwrap();
        assert_eq!(
            (
                c.nombre.as_str(),
                c.intervalo_ms,
                c.nivel_log.as_str(),
                c.entrada.as_str()
            ),
            ("demo-1", 50, "debug", "d.txt")
        );
        assert!(c.token_definido());
        assert_eq!((c.max_entrada_bytes, c.timeout_entrada_ms), (65_536, 2000));
    }

    #[test]
    fn errores() {
        let casos = [
            ("intervalo_ms=100\n", "falta la clave obligatoria nombre"),
            ("nombre=Mayus\n", "línea 1: nombre"),
            ("nombre=a\nresto\n", "línea 2: se esperaba clave=valor"),
            ("nombre=a\nraro=1\n", "clave desconocida"),
            ("nombre=a\nnombre=b\n", "repetida"),
            ("nombre=a\nintervalo_ms=9\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=x\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=+50\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=5_0\n", "intervalo_ms"),
            ("nombre=a\nmax_entrada_bytes=1048577\n", "max_entrada_bytes"),
            ("nombre=a\ntimeout_entrada_ms=1\n", "timeout_entrada_ms"),
            ("nombre=a\nnivel_log=ruidoso\n", "nivel_log"),
            ("nombre=a\ntoken=\n", "token"),
            ("nombre=a\nentrada=\n", "entrada"),
        ];
        for (texto, esperado) in casos {
            let e = analizar(texto).unwrap_err();
            assert!(
                e.contains(esperado),
                "{texto:?}: {e:?} no contiene {esperado:?}"
            );
        }
    }

    #[test]
    fn el_error_no_filtra_el_token() {
        let e = analizar("nombre=a\ntoken=secreto-muy-largo\nintervalo_ms=1\n").unwrap_err();
        assert!(!e.contains("secreto-muy-largo"));
    }

    #[test]
    fn logica_de_permisos_en_cualquier_sistema() {
        assert!(comprobar_permisos(0o644, false, false).is_ok());
        assert!(comprobar_permisos(0o600, true, false).is_ok());
        assert!(
            comprobar_permisos(0o666, false, false)
                .unwrap_err()
                .contains("escribible")
        );
        assert!(
            comprobar_permisos(0o644, true, false)
                .unwrap_err()
                .contains("legible")
        );
        assert!(
            comprobar_permisos(0o666, true, true).is_ok(),
            "en Windows no se comprueba (contrato)"
        );
    }

    #[test]
    fn carga_desde_archivo_y_rechaza_lo_que_no_es_archivo_pequeno() {
        let dir = std::env::temp_dir().join(format!("herramienta-config-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ruta = dir.join("c.conf");
        std::fs::write(&ruta, "nombre=a\n").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&ruta, std::fs::Permissions::from_mode(0o600)).unwrap();
        }
        assert_eq!(cargar(&ruta).unwrap().nombre, "a");
        assert!(cargar(&dir.join("no-existe")).is_err());
        assert!(cargar(&dir).is_err(), "una carpeta no es una configuración");
        std::fs::write(
            &ruta,
            format!("nombre=a\n#{}", "x".repeat(MAX_BYTES_ARCHIVO)),
        )
        .unwrap();
        assert!(cargar(&ruta).unwrap_err().contains("supera"));
        std::fs::write(&ruta, b"nombre=\xff\xfe\n").unwrap();
        assert!(cargar(&ruta).unwrap_err().contains("UTF-8"));
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn permisos_reales() {
        use std::os::unix::fs::PermissionsExt;
        let dir = std::env::temp_dir().join(format!("herramienta-perm-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ruta = dir.join("c.conf");
        std::fs::write(&ruta, "nombre=a\ntoken=abcdefgh\n").unwrap();
        std::fs::set_permissions(&ruta, std::fs::Permissions::from_mode(0o644)).unwrap();
        assert!(cargar(&ruta).unwrap_err().contains("legible"));
        std::fs::set_permissions(&ruta, std::fs::Permissions::from_mode(0o600)).unwrap();
        assert!(cargar(&ruta).is_ok());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
