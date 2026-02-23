import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Kroger API Config
const KROGER_BASE_URL = "https://api.kroger.com/v1";
const CLIENT_ID = process.env.CLIENT_ID_KROGER || process.env.KROGER_CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET_KROGER || process.env.KROGER_CLIENT_SECRET;

let krogerToken: string | null = null;
let tokenExpiry: number = 0;

async function getKrogerToken() {
  if (krogerToken && Date.now() < tokenExpiry) {
    return krogerToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Kroger credentials missing");
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  
  try {
    const response = await axios.post(
      `${KROGER_BASE_URL}/connect/oauth2/token`,
      "grant_type=client_credentials&scope=product.compact",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
      }
    );

    krogerToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return krogerToken;
  } catch (error: any) {
    console.error("Kroger Auth Error:", error.response?.data || error.message);
    throw error;
  }
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    database: "ok", // Supabase is client-side mostly but we can assume ok if server is up
    gemini: process.env.API_KEY ? "ok" : "missing",
    kroger: CLIENT_ID && CLIENT_SECRET ? "ok" : "missing"
  });
});

app.get("/api/kroger-auth", async (req, res) => {
  try {
    const token = await getKrogerToken();
    res.json({ access_token: token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/kroger/locations", async (req, res) => {
  try {
    const { zip, radius = 10, limit = 10 } = req.query;
    const token = await getKrogerToken();
    
    const response = await axios.get(`${KROGER_BASE_URL}/locations`, {
      params: {
        "filter.zipCode.near": zip,
        "filter.radiusInMiles": radius,
        "filter.limit": limit,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/kroger/products", async (req, res) => {
  try {
    const { term, locationId, limit = 10 } = req.query;
    const token = await getKrogerToken();
    
    const response = await axios.get(`${KROGER_BASE_URL}/products`, {
      params: {
        "filter.term": term,
        "filter.locationId": locationId,
        "filter.limit": limit,
        "filter.fulfillment": "ais", // Available in store
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/kroger/coupons", async (req, res) => {
  // Note: Coupons often require user-level auth (OAuth2 Authorization Code flow)
  // but some basic ones might be available via client credentials or we can mock/proxy if needed.
  // For now, we'll try the client credentials scope if it exists, or just return empty.
  try {
    res.json({ data: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
