import io
import json
import threading
import unittest

from herramienta.demonio import ejecutar
from herramienta.registro import Registro


def silencio():
    return Registro(io.StringIO(), "error")


class Demonio(unittest.TestCase):
    def test_una_vuelta(self):
        llamadas = []
        r = ejecutar(threading.Event(), 3600, True, llamadas.append, silencio())
        self.assertEqual((r.ticks, r.errores, llamadas), (1, 0, [1]))

    def test_cuenta_errores(self):
        def falla(_n):
            raise RuntimeError("falla")

        r = ejecutar(threading.Event(), 3600, True, falla, silencio())
        self.assertEqual((r.ticks, r.errores), (1, 1))

    def test_un_fallo_no_mata_el_daemon_y_se_registra_una_vez_por_fallo(self):
        flujo = io.StringIO()
        parar = threading.Event()

        def falla(n):
            if n == 3:
                parar.set()
            raise RuntimeError(f"falla {n}")

        r = ejecutar(parar, 0.001, False, falla, Registro(flujo, "info"))
        self.assertEqual((r.ticks, r.errores), (3, 3))
        eventos = [json.loads(linea) for linea in flujo.getvalue().strip().split("\n")]
        self.assertEqual([e["msg"] for e in eventos], ["trabajo_fallido"] * 3)
        self.assertEqual([(e["n"], e["error"]) for e in eventos], [(1, "falla 1"), (2, "falla 2"), (3, "falla 3")])

    def test_repite_hasta_el_apagado(self):
        parar = threading.Event()

        def trabajo(n):
            if n == 3:
                parar.set()

        r = ejecutar(parar, 0.001, False, trabajo, silencio())
        self.assertEqual(r.ticks, 3)

    def test_apagado_ordenado_drena_la_vuelta_en_curso(self):
        """Parar con una vuelta a medias: se drena, no empieza otra y la espera larga no retrasa la salida."""
        parar = threading.Event()
        empezo, soltar, hecho = threading.Event(), threading.Event(), threading.Event()
        terminadas = []
        resultado = []

        def trabajo(n):
            empezo.set()
            soltar.wait(5)
            terminadas.append(n)

        def correr():
            resultado.append(ejecutar(parar, 3600, False, trabajo, silencio()))
            hecho.set()

        hilo = threading.Thread(target=correr, daemon=True)
        hilo.start()
        self.assertTrue(empezo.wait(5))
        parar.set()  # llega la señal con la vuelta a medias
        self.assertFalse(hecho.wait(0.1), "no debe salir antes de que termine la vuelta en curso")
        soltar.set()
        self.assertTrue(hecho.wait(2), "no salió tras drenar (¿esperó el intervalo de una hora?)")
        self.assertEqual((resultado[0].ticks, resultado[0].errores, terminadas), (1, 0, [1]))

    def test_registro_json_estructurado_y_sin_secretos(self):
        flujo = io.StringIO()
        log = Registro(flujo, "info")
        log.debug("oculto")
        log.info("hola", n=3)
        log.warn("aviso", token_definido=True)
        lineas = flujo.getvalue().strip().split("\n")
        self.assertEqual(len(lineas), 2, "el nivel info no emite debug")
        a = json.loads(lineas[0])
        self.assertRegex(a["ts"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")
        self.assertEqual((a["nivel"], a["msg"], a["n"]), ("info", "hola", 3))
        self.assertEqual(json.loads(lineas[1])["nivel"], "warn")


if __name__ == "__main__":
    unittest.main()
