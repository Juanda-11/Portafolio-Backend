# Portafolio · Backend

API (Express + TypeScript) del portafolio de Diseño de Interfaces.

| Endpoint | Descripción |
| --- | --- |
| `GET /api/health` | Estado del servicio y si el envío de correos está configurado |
| `POST /api/contact` | Recibe `{ name, email, message }` del formulario de contacto, lo valida (zod), limita a 5 envíos cada 10 min por IP, ignora bots con un campo trampa y lo envía por correo con [Resend](https://resend.com) |

```bash
npm install
cp .env.example .env   # y completa las variables
npm run dev            # http://localhost:4000/api/health
```

Si `RESEND_API_KEY` y `CONTACT_TO_EMAIL` no están definidos, `/api/contact` responde `503 email_not_configured` (no finge que envió el mensaje) y el frontend ofrece escribir por correo directamente.

## Desplegar en Vercel
Importa este repositorio como proyecto nuevo. `vercel.json` y `api/index.ts` ya están listos. En *Settings → Environment Variables* agrega `FRONTEND_URL` (la URL del portafolio), `RESEND_API_KEY` y `CONTACT_TO_EMAIL`.
