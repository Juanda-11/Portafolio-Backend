import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
