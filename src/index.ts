import { createApp } from "./create-app.js";

const app = createApp();

// En Vercel la aplicación se exporta (el servidor lo levanta la plataforma);
// en local la ponemos a escuchar.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`);
  });
}

export default app;
