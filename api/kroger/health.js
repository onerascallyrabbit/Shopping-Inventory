export default function handler(req, res) {
  const CLIENT_ID = process.env.CLIENT_ID_KROGER || process.env.KROGER_CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET_KROGER || process.env.KROGER_CLIENT_SECRET;

  res.json({
    database: "ok",
    gemini: process.env.API_KEY ? "ok" : "missing",
    kroger: CLIENT_ID && CLIENT_SECRET ? "ok" : "missing"
  });
}
