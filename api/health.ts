export default function handler(req: any, res: any) {
  const CLIENT_ID = process.env.CLIENT_ID_KROGER;
  const CLIENT_SECRET = process.env.CLIENT_SECRET_KROGER;

  console.log("Health check requested", {
    has_kroger_id: !!CLIENT_ID,
    has_kroger_secret: !!CLIENT_SECRET,
    has_gemini_key: !!process.env.API_KEY
  });

  res.json({
    database: "ok",
    gemini: process.env.API_KEY ? "ok" : "missing",
    kroger: CLIENT_ID && CLIENT_SECRET ? "ok" : "missing",
    env_keys: Object.keys(process.env).filter(k => k.includes('KROGER') || k.includes('API_KEY')),
    details: {
      has_kroger_id: !!CLIENT_ID,
      has_kroger_secret: !!CLIENT_SECRET,
      has_gemini_key: !!process.env.API_KEY
    }
  });
}
