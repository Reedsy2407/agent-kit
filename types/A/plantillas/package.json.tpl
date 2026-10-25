{
  "name": "sitio-estatico",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "publicar": "node scripts/publish.mjs",
    "test": "node --test",
    "front": "node tests/front/run.mjs",
    "capturas": "node tests/front/herramientas/capturas.mjs",
    "deploy": "npm run publicar && wrangler deploy"
  },
  "devDependencies": {
    "playwright-core": "1.63.0",
    "wrangler": "^4.151.3"
  }
}
