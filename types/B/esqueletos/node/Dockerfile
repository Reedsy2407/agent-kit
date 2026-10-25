# Multietapa: la primera etapa corre las pruebas (si fallan, no hay imagen); la final solo lleva el código y corre sin privilegios.
FROM node:24-alpine AS pruebas
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY pruebas ./pruebas
RUN npm test

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY --from=pruebas /app/package.json ./
COPY --from=pruebas /app/src ./src
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# APP_ENTORNO es obligatoria y no se fija aquí: se pasa al ejecutar (docker run -e APP_ENTORNO=...).
CMD ["node", "src/server.mjs"]
