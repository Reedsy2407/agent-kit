import pytest
from fastapi.testclient import TestClient

from app.config import Config, ConfigInvalida, cargar_config
from app.main import crear_app


@pytest.fixture
def cliente():
    return TestClient(crear_app(Config(entorno="desarrollo", puerto=8080, host="127.0.0.1")))


def test_salud_responde_ok(cliente):
    r = cliente.get("/salud")
    assert r.status_code == 200
    assert r.json()["estado"] == "ok"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_saludo_usa_el_nombre(cliente):
    r = cliente.get("/api/saludo", params={"nombre": "Ana"})
    assert r.status_code == 200
    assert r.json() == {"mensaje": "Hola, Ana"}


def test_los_errores_usan_un_solo_formato(cliente):
    for r, estado in ((cliente.get("/api/saludo", params={"nombre": "x" * 51}), 400), (cliente.get("/no-existe"), 404), (cliente.post("/salud"), 405)):
        assert r.status_code == estado
        assert r.headers["content-type"].startswith("application/problem+json")
        assert sorted(r.json()) == ["detail", "status", "title", "type"]
        assert r.json()["status"] == estado
    assert cliente.post("/salud").headers["allow"] == "GET, HEAD"


def test_sin_app_entorno_la_configuracion_falla():
    with pytest.raises(ConfigInvalida, match="APP_ENTORNO"):
        cargar_config({})
    with pytest.raises(ConfigInvalida):
        cargar_config({"APP_ENTORNO": "otro"})
    with pytest.raises(ConfigInvalida):
        cargar_config({"APP_ENTORNO": "desarrollo", "PORT": "abc"})
    assert cargar_config({"APP_ENTORNO": "produccion"}) == Config("produccion", 8080, "127.0.0.1")
