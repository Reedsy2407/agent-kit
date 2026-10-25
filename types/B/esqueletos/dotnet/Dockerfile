# Multietapa: la primera etapa restaura, corre las pruebas y publica (si fallan, no hay imagen); la final solo lleva el runtime
# de ASP.NET y la publicación, y corre sin privilegios.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS construir
WORKDIR /src
COPY Servicio.sln ./
COPY src/Servicio/Servicio.csproj src/Servicio/
COPY tests/Servicio.Pruebas/Servicio.Pruebas.csproj tests/Servicio.Pruebas/
RUN dotnet restore
COPY src ./src
COPY tests ./tests
RUN dotnet test --nologo --no-restore
RUN dotnet publish src/Servicio/Servicio.csproj -c Release -o /publicado --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
ENV HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY --from=construir /publicado ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/salud" || exit 1
# APP_ENTORNO es obligatoria y no se fija aquí: se pasa al ejecutar (docker run -e APP_ENTORNO=...).
ENTRYPOINT ["dotnet", "Servicio.dll"]
