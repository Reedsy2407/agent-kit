import io
import json
import os
import sys
import tempfile
import threading
import unittest

from herramienta.cli import ejecutar_cli


def correr(*args, parar=None):
    out, err = io.StringIO(), io.StringIO()
    codigo = ejecutar_cli(list(args), out, err, parar or threading.Event())
    return codigo, out.getvalue(), err.getvalue()


class ContratoDelCli(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def conf(self, texto):
        ruta = os.path.join(self.dir.name, f"c{len(os.listdir(self.dir.name))}.conf")
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(texto)
        os.chmod(ruta, 0o600)
        return ruta

    def test_tabla_de_casos(self):
        buena = self.conf("nombre=demo\nintervalo_ms=10\n")
        mala = self.conf("nombre=Mal\n")
        secreta = self.conf("nombre=demo\ntoken=valor-secreto-1\n")
        datos = os.path.join(self.dir.name, "d.txt")
        with open(datos, "wb") as f:
            f.write(b"a\nb\nc")
        con_entrada = self.conf(f"nombre=demo\nentrada={datos}\n")
        ausente = self.conf(f"nombre=demo\nentrada={os.path.join(self.dir.name, 'no-existe')}\n")
        grande = self.conf(f"nombre=demo\nmax_entrada_bytes=2\nentrada={datos}\n")
        # (nombre, args, código, fragmento de stdout, fragmento de stderr); "-" = debe estar vacío, "" = sin condición
        casos = [
            ("sin argumentos", [], 2, "-", "falta el subcomando"),
            ("ayuda", ["--help"], 0, "uso:", "-"),
            ("subcomando desconocido", ["baila"], 2, "-", "subcomando desconocido"),
            ("version", ["version"], 0, "herramienta 0.1.0", "-"),
            ("version json", ["version", "--json"], 0, '{"nombre":"herramienta","version":"0.1.0"}', "-"),
            ("version con sobrante", ["version", "x"], 2, "-", "no reconocido"),
            ("version opción rara", ["version", "--raro"], 2, "-", "raro"),
            ("check-config sin --config", ["check-config"], 2, "-", "falta --config"),
            ("check-config válida", ["check-config", "--config", buena], 0, "configuracion valida", "-"),
            ("check-config json", ["check-config", "--config", buena, "--json"], 0, '"valida":true', "-"),
            ("check-config json sin token", ["check-config", "--config", buena, "--json"], 0, '"token":"ausente"', "-"),
            (
                "check-config json con token",
                ["check-config", "--config", secreta, "--json"],
                0,
                '"token":"definido"',
                "-",
            ),
            ("check-config inválida", ["check-config", "--config", mala], 3, "-", "error de configuración"),
            (
                "check-config ausente",
                ["check-config", "--config", os.path.join(self.dir.name, "no")],
                3,
                "-",
                "error de configuración",
            ),
            ("check-config oculta el token", ["check-config", "--config", secreta], 0, "token=<definido>", "-"),
            (
                "run una vuelta",
                ["run", "--config", buena, "--once"],
                0,
                "ticks=1 errores=0 bytes=0 lineas=0",
                '"msg":"inicio"',
            ),
            (
                "run una vuelta json",
                ["run", "--config", buena, "--once", "--json"],
                0,
                '{"ticks":1,"errores":0,"bytes":0,"lineas":0}',
                '"msg":"fin"',
            ),
            ("run con entrada", ["run", "--config", con_entrada, "--once"], 0, "bytes=5 lineas=3", '"msg":"fin"'),
            ("run entrada demasiado grande", ["run", "--config", grande, "--once"], 4, "-", "demasiado grande"),
            (
                "run entrada ausente es error inesperado (1), no entrada rechazada (4)",
                ["run", "--config", ausente, "--once"],
                1,
                "-",
                "error de entrada",
            ),
            ("run sin --config", ["run", "--once"], 2, "-", "falta --config"),
            ("run --config sin valor", ["run", "--config"], 2, "-", "necesita un valor"),
            ("run config inválida", ["run", "--config", mala, "--once"], 3, "-", "error de configuración"),
        ]
        for nombre, args, codigo, fuera, error in casos:
            with self.subTest(nombre):
                c, out, err = correr(*args)
                self.assertEqual(c, codigo, f"stdout={out!r} stderr={err!r}")
                for texto, quiere in ((out, fuera), (err, error)):
                    if quiere == "-":
                        self.assertEqual(texto, "")
                    elif quiere:
                        self.assertIn(quiere, texto)
                self.assertNotIn("valor-secreto-1", out + err)

    def test_check_config_en_texto_no_muestra_token_si_no_hay(self):
        _, out, _ = correr("check-config", "--config", self.conf("nombre=demo\n"))
        self.assertNotIn("token=", out)

    def test_run_no_registra_el_token(self):
        _, out, err = correr(
            "run", "--config", self.conf("nombre=demo\ntoken=valor-secreto-1\nnivel_log=debug\n"), "--once"
        )
        self.assertNotIn("valor-secreto-1", out + err)
        self.assertIn('"token_definido":true', err)

    def test_el_registro_es_una_linea_json_por_evento(self):
        _, _, err = correr("run", "--config", self.conf("nombre=demo\nnivel_log=debug\n"), "--once")
        lineas = err.strip().split("\n")
        self.assertGreaterEqual(len(lineas), 3, "inicio, tick y fin")
        for linea in lineas:
            v = json.loads(linea)
            self.assertTrue({"ts", "nivel", "msg"} <= v.keys(), linea)

    def test_apagado_ya_pedido_antes_de_empezar(self):
        parar = threading.Event()
        parar.set()
        codigo, out, err = correr("run", "--config", self.conf("nombre=demo\n"), parar=parar)
        self.assertEqual(codigo, 0)
        self.assertIn("ticks=0", out)
        self.assertIn('"msg":"apagado"', err)

    @unittest.skipIf(sys.platform == "win32", "los permisos no se comprueban en Windows (contrato)")
    def test_permisos_del_archivo_de_configuracion(self):
        ruta = self.conf("nombre=demo\ntoken=abcdefgh\n")
        os.chmod(ruta, 0o644)
        codigo, _, err = correr("check-config", "--config", ruta)
        self.assertEqual(codigo, 3)
        self.assertIn("legible", err)


if __name__ == "__main__":
    unittest.main()
