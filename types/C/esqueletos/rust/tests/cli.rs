//! Contrato del CLI contra el binario real: tabla de casos (argumentos -> código de salida, stdout y stderr) y,
//! en sistemas POSIX, el apagado ordenado con SIGTERM de punta a punta.

use std::fs;
use std::path::PathBuf;
use std::process::{Command, Output};

const BIN: &str = env!("CARGO_BIN_EXE_herramienta");

struct Entorno {
    dir: PathBuf,
}

impl Entorno {
    fn nuevo(nombre: &str) -> Entorno {
        let dir = std::env::temp_dir().join(format!("herramienta-{nombre}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        Entorno { dir }
    }

    fn conf(&self, nombre: &str, texto: &str) -> String {
        let ruta = self.dir.join(nombre);
        fs::write(&ruta, texto).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&ruta, fs::Permissions::from_mode(0o600)).unwrap();
        }
        ruta.to_string_lossy().into_owned()
    }
}

impl Drop for Entorno {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.dir);
    }
}

fn correr(args: &[&str]) -> Output {
    Command::new(BIN)
        .args(args)
        .output()
        .expect("no se pudo lanzar el binario")
}

#[test]
fn tabla_de_casos_del_contrato() {
    let e = Entorno::nuevo("tabla");
    let buena = e.conf("buena.conf", "nombre=demo\nintervalo_ms=10\n");
    let mala = e.conf("mala.conf", "nombre=Mal\n");
    let secreta = e.conf("secreta.conf", "nombre=demo\ntoken=valor-secreto-1\n");
    let datos = e.conf("d.txt", "a\nb\nc");
    let con_entrada = e.conf(
        "entrada.conf",
        &format!("nombre=demo\nentrada={}\n", datos.replace('\\', "/")),
    );
    let grande = e.conf(
        "grande.conf",
        &format!(
            "nombre=demo\nmax_entrada_bytes=2\nentrada={}\n",
            datos.replace('\\', "/")
        ),
    );
    let ausente = e.conf(
        "ausente.conf",
        &format!(
            "nombre=demo\nentrada={}\n",
            e.dir.join("no-existe").to_string_lossy().replace('\\', "/")
        ),
    );
    let no_existe = e.dir.join("no").to_string_lossy().into_owned();

    // (nombre, argumentos, código, fragmento de stdout, fragmento de stderr); "-" = debe estar vacío, "" = sin condición
    let casos: Vec<(&str, Vec<&str>, i32, &str, &str)> = vec![
        ("sin argumentos", vec![], 2, "-", "falta el subcomando"),
        ("ayuda", vec!["--help"], 0, "uso:", "-"),
        (
            "subcomando desconocido",
            vec!["baila"],
            2,
            "-",
            "subcomando desconocido",
        ),
        ("version", vec!["version"], 0, "herramienta 0.1.0", "-"),
        (
            "version json",
            vec!["version", "--json"],
            0,
            "{\"nombre\":\"herramienta\",\"version\":\"0.1.0\"}",
            "-",
        ),
        (
            "version con sobrante",
            vec!["version", "x"],
            2,
            "-",
            "no reconocido",
        ),
        (
            "version opción rara",
            vec!["version", "--raro"],
            2,
            "-",
            "raro",
        ),
        (
            "check-config sin --config",
            vec!["check-config"],
            2,
            "-",
            "falta --config",
        ),
        (
            "check-config válida",
            vec!["check-config", "--config", &buena],
            0,
            "configuracion valida",
            "-",
        ),
        (
            "check-config json",
            vec!["check-config", "--config", &buena, "--json"],
            0,
            "\"valida\":true",
            "-",
        ),
        (
            "check-config inválida",
            vec!["check-config", "--config", &mala],
            3,
            "-",
            "error de configuración",
        ),
        (
            "check-config ausente",
            vec!["check-config", "--config", &no_existe],
            3,
            "-",
            "error de configuración",
        ),
        (
            "check-config oculta el token",
            vec!["check-config", "--config", &secreta],
            0,
            "token=<definido>",
            "-",
        ),
        (
            "run una vuelta",
            vec!["run", "--config", &buena, "--once"],
            0,
            "ticks=1 errores=0 bytes=0 lineas=0",
            "\"msg\":\"inicio\"",
        ),
        (
            "run una vuelta json",
            vec!["run", "--config", &buena, "--once", "--json"],
            0,
            "{\"ticks\":1,\"errores\":0,\"bytes\":0,\"lineas\":0}",
            "\"msg\":\"fin\"",
        ),
        (
            "run con entrada",
            vec!["run", "--config", &con_entrada, "--once"],
            0,
            "bytes=5 lineas=3",
            "\"msg\":\"fin\"",
        ),
        (
            "run entrada demasiado grande",
            vec!["run", "--config", &grande, "--once"],
            4,
            "-",
            "demasiado grande",
        ),
        (
            "run entrada ausente es error inesperado (1), no entrada rechazada (4)",
            vec!["run", "--config", &ausente, "--once"],
            1,
            "-",
            "error de entrada",
        ),
        (
            "run sin --config",
            vec!["run", "--once"],
            2,
            "-",
            "falta --config",
        ),
        (
            "run --config sin valor",
            vec!["run", "--config"],
            2,
            "-",
            "necesita un valor",
        ),
        (
            "run config inválida",
            vec!["run", "--config", &mala, "--once"],
            3,
            "-",
            "error de configuración",
        ),
    ];
    for (nombre, args, codigo, fuera, error) in casos {
        let o = correr(&args);
        let (out, err) = (
            String::from_utf8_lossy(&o.stdout),
            String::from_utf8_lossy(&o.stderr),
        );
        assert_eq!(
            o.status.code(),
            Some(codigo),
            "{nombre}: stdout {out:?} stderr {err:?}"
        );
        for (texto, quiere) in [(&out, fuera), (&err, error)] {
            match quiere {
                "-" => assert!(texto.is_empty(), "{nombre}: debía estar vacío: {texto:?}"),
                "" => {}
                q => assert!(texto.contains(q), "{nombre}: {texto:?} no contiene {q:?}"),
            }
        }
        assert!(
            !format!("{out}{err}").contains("valor-secreto-1"),
            "{nombre}: se filtró el token"
        );
    }
}

#[test]
fn el_registro_es_una_linea_json_por_evento_y_no_filtra_el_token() {
    let e = Entorno::nuevo("registro");
    let c = e.conf(
        "c.conf",
        "nombre=demo\ntoken=valor-secreto-1\nnivel_log=debug\n",
    );
    let o = correr(&["run", "--config", &c, "--once"]);
    let err = String::from_utf8_lossy(&o.stderr);
    assert!(!err.contains("valor-secreto-1"));
    assert!(err.contains("\"token_definido\":true"));
    let lineas: Vec<&str> = err.trim().split('\n').collect();
    assert!(lineas.len() >= 3, "inicio, tick y fin: {err:?}");
    for l in lineas {
        assert!(
            l.starts_with("{\"ts\":\"")
                && l.contains("\"nivel\":\"")
                && l.contains("\"msg\":\"")
                && l.ends_with('}'),
            "{l}"
        );
    }
}

#[cfg(unix)]
#[test]
fn sigterm_apaga_en_orden() {
    use std::io::{BufRead, BufReader};
    use std::process::Stdio;
    use std::time::{Duration, Instant};

    let e = Entorno::nuevo("senal");
    let c = e.conf("c.conf", "nombre=demo\nintervalo_ms=20\nnivel_log=debug\n");
    let mut hijo = Command::new(BIN)
        .args(["run", "--config", &c])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut lector = BufReader::new(hijo.stderr.take().unwrap());
    let mut linea = String::new();
    let limite = Instant::now() + Duration::from_secs(10);
    let mut visto = false;
    while Instant::now() < limite && lector.read_line(&mut linea).unwrap() > 0 {
        if linea.contains("\"msg\":\"tick\"") {
            visto = true;
            break;
        }
        linea.clear();
    }
    assert!(visto, "el daemon no llegó a hacer una vuelta");
    let estado = Command::new("kill")
        .args(["-TERM", &hijo.id().to_string()])
        .status()
        .unwrap();
    assert!(estado.success());
    let resto: Vec<String> = lector.lines().map_while(Result::ok).collect();
    let salida = hijo.wait_with_output().unwrap();
    assert_eq!(
        salida.status.code(),
        Some(0),
        "debe salir con 0 tras el apagado ordenado"
    );
    let resto = resto.join("\n");
    assert!(
        resto.contains("\"msg\":\"apagado\"") && resto.contains("\"msg\":\"fin\""),
        "{resto}"
    );
    assert!(
        String::from_utf8_lossy(&salida.stdout).contains("ticks="),
        "debe imprimir el resumen"
    );
}
