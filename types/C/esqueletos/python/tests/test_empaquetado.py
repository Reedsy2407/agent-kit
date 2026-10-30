import importlib
import tomllib
import unittest
from pathlib import Path

import herramienta

RAIZ = Path(__file__).resolve().parent.parent


class Empaquetado(unittest.TestCase):
    """Comprueba lo declarado en pyproject.toml sin instalar nada (instalar necesita red)."""

    @classmethod
    def setUpClass(cls):
        cls.proyecto = tomllib.loads((RAIZ / "pyproject.toml").read_text(encoding="utf-8"))["project"]

    def test_cero_dependencias_de_produccion(self):
        self.assertEqual(self.proyecto["dependencies"], [])

    def test_version_minima_declarada(self):
        self.assertRegex(self.proyecto["requires-python"], r"^>=3\.\d+$")

    def test_la_version_coincide_con_el_paquete(self):
        self.assertEqual(self.proyecto["version"], herramienta.__version__)

    def test_el_punto_de_entrada_existe_y_se_puede_llamar(self):
        destino = self.proyecto["scripts"]["herramienta"]
        modulo, _, funcion = destino.partition(":")
        self.assertTrue(callable(getattr(importlib.import_module(modulo), funcion)))


if __name__ == "__main__":
    unittest.main()
