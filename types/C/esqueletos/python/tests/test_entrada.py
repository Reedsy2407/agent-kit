import io
import os
import tempfile
import threading
import time
import unittest

from herramienta.entrada import ErrDemasiado, ErrTiempo, leer, leer_archivo


def desde(texto: bytes):
    return lambda: io.BytesIO(texto)


class Entrada(unittest.TestCase):
    def test_cuenta_bytes_y_lineas(self):
        for texto, nbytes, lineas in [(b"", 0, 0), (b"a\n", 2, 1), (b"a\nb", 3, 2), (b"\n\n", 2, 2)]:
            with self.subTest(texto=texto):
                r = leer(desde(texto), 100, 1)
                self.assertEqual((r.bytes, r.lineas), (nbytes, lineas))

    def test_limite_exacto(self):
        self.assertEqual(leer(desde(b"x" * 10), 10, 1).bytes, 10)
        with self.assertRaises(ErrDemasiado):
            leer(desde(b"x" * 11), 10, 1)

    def test_no_lee_mas_del_limite(self):
        class Infinita:
            leidos = 0

            def read(self, n):
                self.leidos += n
                return b"\0" * n

            def close(self):
                pass

        fuente = Infinita()
        with self.assertRaises(ErrDemasiado):
            leer(lambda: fuente, 1024, 5)
        self.assertEqual(fuente.leidos, 1025, "pidió exactamente límite + 1")

    def test_plazo(self):
        liberar = threading.Event()

        class Bloqueada:
            def read(self, n):
                liberar.wait(10)
                return b""

            def close(self):
                pass

        self.addCleanup(liberar.set)
        inicio = time.monotonic()
        with self.assertRaises(ErrTiempo):
            leer(lambda: Bloqueada(), 10, 0.05)
        self.assertLess(time.monotonic() - inicio, 2)

    def test_archivo(self):
        with tempfile.TemporaryDirectory() as d:
            ruta = os.path.join(d, "d.txt")
            with open(ruta, "wb") as f:
                f.write(b"uno\ndos\n")
            r = leer_archivo(ruta, 100, 1)
            self.assertEqual((r.bytes, r.lineas), (8, 2))
            with self.assertRaises(OSError):
                leer_archivo(os.path.join(d, "no"), 100, 1)

    def test_mensajes(self):
        self.assertEqual(str(ErrDemasiado()), "entrada demasiado grande")
        self.assertEqual(str(ErrTiempo()), "entrada sin respuesta")


if __name__ == "__main__":
    unittest.main()
