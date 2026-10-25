# Multietapa: la primera etapa compila y corre las pruebas (si fallan, no hay imagen); la final solo lleva el JRE y el jar y corre
# sin privilegios. Java 21 (LTS); para Java 25 cambia las dos imágenes y java.version en pom.xml.
FROM maven:3.9-eclipse-temurin-21 AS construir
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -B -q verify

FROM eclipse-temurin:21-jre-alpine
ENV HOST=0.0.0.0 PORT=8080
WORKDIR /app
RUN addgroup -S servicio && adduser -S -G servicio servicio
COPY --from=construir /app/target/servicio-esqueleto.jar ./servicio.jar
USER servicio
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/salud" || exit 1
# APP_ENTORNO es obligatoria y no se fija aquí: se pasa al ejecutar (docker run -e APP_ENTORNO=...).
ENTRYPOINT ["java", "-jar", "/app/servicio.jar"]
