import os
import sys
import tempfile
import unittest

from herramienta.config import MAX_BYTES_ARCHIVO, ErrorConfig, analizar, cargar, comprobar_permisos


class Analizar(unittest.TestCase):
    def test_valida_con_valores_por_defecto(self):
        c = analizar(
            "# comentario\n\nnombre = demo-1\nintervalo_ms=50\nnivel_log=debug\ntoken=abcdefgh\nentrada=d.txt\n"
        )
        self.assertEqual((c.nombre, c.intervalo_ms, c.nivel_log, c.entrada), ("demo-1", 50, "debug", "d.txt"))
        self.assertTrue(c.token_definido)
        self.assertEqual((c.max_entrada_bytes, c.timeout_entrada_ms), (65536, 2000))

    def test_errores(self):
        casos = [
            ("intervalo_ms=100\n", "falta la clave obligatoria nombre"),
            ("nombre=Mayus\n", "línea 1: nombre"),
            ("nombre=a\nresto\n", "línea 2: se esperaba clave=valor"),
            ("nombre=a\nraro=1\n", "clave desconocida"),
            ("nombre=a\nnombre=b\n", "repetida"),
            ("nombre=a\nintervalo_ms=9\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=x\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=+50\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=5_0\n", "intervalo_ms"),
            ("nombre=a\nintervalo_ms=٥٠\n", "intervalo_ms"),
            ("nombre=a\nmax_entrada_bytes=1048577\n", "max_entrada_bytes"),
            ("nombre=a\ntimeout_entrada_ms=1\n", "timeout_entrada_ms"),
            ("nombre=a\nnivel_log=ruidoso\n", "nivel_log"),
            ("nombre=a\ntoken=\n", "token"),
            ("nombre=a\nentrada=\n", "entrada"),
        ]
        for texto, esperado in casos:
            with self.subTest(texto=texto), self.assertRaises(ErrorConfig) as cm:
                analizar(texto)
            self.assertIn(esperado, str(cm.exception))

    def test_el_error_no_filtra_el_token(self):
        with self.assertRaises(ErrorConfig) as cm:
            analizar("nombre=a\ntoken=secreto-muy-largo\nintervalo_ms=1\n")
        self.assertNotIn("secreto-muy-largo", str(cm.exception))


class Permisos(unittest.TestCase):
    def test_logica_de_permisos_en_cualquier_sistema(self):
        comprobar_permisos(0o644, False, "linux")
        comprobar_permisos(0o600, True, "linux")
        with self.assertRaisesRegex(ErrorConfig, "escribible"):
            comprobar_permisos(0o666, False, "linux")
        with self.assertRaisesRegex(ErrorConfig, "legible"):
            comprobar_permisos(0o644, True, "linux")
        comprobar_permisos(0o666, True, "win32")  # en Windows no se comprueba (contrato)


class Cargar(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)

    def escribir(self, texto, modo=0o600):
        ruta = os.path.join(self.dir.name, "c.conf")
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(texto)
        os.chmod(ruta, modo)
        return ruta

    def test_carga_valida(self):
        self.assertEqual(cargar(self.escribir("nombre=a\n")).nombre, "a")

    @unittest.skipIf(sys.platform == "win32", "los permisos no se comprueban en Windows (contrato)")
    def test_permisos_reales(self):
        with self.assertRaisesRegex(ErrorConfig, "escribible"):
            cargar(self.escribir("nombre=a\n", 0o666))
        with self.assertRaisesRegex(ErrorConfig, "legible"):
            cargar(self.escribir("nombre=a\ntoken=abcdefgh\n", 0o644))
        cargar(self.escribir("nombre=a\ntoken=abcdefgh\n", 0o600))

    def test_rechaza_ausente_carpeta_enorme_y_no_utf8(self):
        with self.assertRaises(ErrorConfig):
            cargar(os.path.join(self.dir.name, "no-existe"))
        with self.assertRaises(ErrorConfig):
            cargar(self.dir.name)
        with self.assertRaisesRegex(ErrorConfig, "supera"):
            cargar(self.escribir("nombre=a\n#" + "x" * MAX_BYTES_ARCHIVO))
        ruta = os.path.join(self.dir.name, "b.conf")
        with open(ruta, "wb") as f:
            f.write(b"nombre=\xff\xfe\n")
        with self.assertRaisesRegex(ErrorConfig, "UTF-8"):
            cargar(ruta)


if __name__ == "__main__":
    unittest.main()
