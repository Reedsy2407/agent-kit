# Multietapa: la primera etapa instala dependencias y corre las pruebas (si fallan, no hay imagen); la final solo lleva lo
# necesario para ejecutar y corre sin privilegios.
ARG PYTHON_VERSION=3.14

FROM python:${PYTHON_VERSION}-slim AS pruebas
WORKDIR /app
COPY requirements.txt requirements-dev.txt pyproject.toml ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY app ./app
COPY tests ./tests
RUN python -m pytest -q

FROM python:${PYTHON_VERSION}-slim AS dependencias
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/instalado -r requirements.txt

FROM python:${PYTHON_VERSION}-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY --from=dependencias /instalado /usr/local
COPY app ./app
RUN useradd --system --no-create-home servicio
USER servicio
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ['PORT']+'/salud',timeout=2)"
# APP_ENTORNO es obligatoria y no se fija aquí: se pasa al ejecutar (docker run -e APP_ENTORNO=...).
CMD ["python", "-m", "app"]
