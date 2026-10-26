import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().email("Correo no válido").max(120),
  message: z.string().trim().min(10, "El mensaje es muy corto").max(2000),
  /** Campo trampa: los humanos lo dejan vacío. */
  website: z.string().max(200).optional(),
});

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
// Orígenes que pueden llamar a la API: el portafolio publicado, el desarrollo local
// y los que se agreguen en FRONTEND_URL (varios separados por coma).
const allowedOrigins = [
  "https://portafolio-frontend-lime.vercel.app",
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL ?? "").split(","),
]
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Los dominios de vista previa y alias de Vercel de este proyecto (portafolio-frontend-…-juan-9a09.vercel.app).
const vercelAliases = /^https:\/\/portafolio-frontend(-[a-z0-9]+)*-juan-9a09\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      // Sin cabecera Origin (curl, servidores) no hay nada que bloquear.
      if (!origin || allowedOrigins.includes(origin) || vercelAliases.test(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`CORS: origen no permitido -> ${origin}`);
      callback(null, false);
    },
    methods: ["GET", "POST"],
  }),
);
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    email: Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL),
  });
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited", message: "Demasiados mensajes. Intenta de nuevo en unos minutos." },
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Datos no válidos",
    });
    return;
  }

  const { name, email, message, website } = parsed.data;
  // Un bot llenó el campo trampa: respondemos "ok" sin enviar nada.
  if (website) {
    res.json({ ok: true });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    res.status(503).json({
      error: "email_not_configured",
      message: "El envío de correos aún no está configurado en el servidor.",
    });
    return;
  }

  try {
    const response = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "Portafolio <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `Mensaje del portafolio · ${name}`,
        text: `De: ${name} <${email}>\n\n${message}`,
      }),
    });
    if (!response.ok) throw new Error(`Resend respondió ${response.status}`);
    res.json({ ok: true });
  } catch (error) {
    console.error("No se pudo enviar el correo:", error);
    res.status(502).json({ error: "send_failed", message: "No se pudo enviar el mensaje. Intenta de nuevo." });
  }
});

// En Vercel la aplicación se exporta (el servidor lo levanta la plataforma);
// en local la ponemos a escuchar.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`);
  });
}

export default app;
