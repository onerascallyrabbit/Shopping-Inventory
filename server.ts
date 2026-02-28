import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import handlers from /api
// @ts-ignore
import healthHandler from "./api/health.js";
// @ts-ignore
import krogerAuthHandler from "./api/kroger/auth.js";
// @ts-ignore
import krogerLocationsHandler from "./api/kroger/locations.js";
// @ts-ignore
import krogerProductsHandler from "./api/kroger/products.js";
// @ts-ignore
import krogerCouponsHandler from "./api/kroger/coupons.js";
// @ts-ignore
import krogerCompareHandler from "./api/kroger/compare.js";
// @ts-ignore
import generateMealsHandler from "./api/generate-meals.js";
// @ts-ignore
import identifyProductHandler from "./api/identify-product.js";
// @ts-ignore
import lookupMarketHandler from "./api/lookup-market.js";
// @ts-ignore
import searchStoreHandler from "./api/search-store.js";
// @ts-ignore
import parseVoiceInventoryHandler from "./api/parse-voice-inventory.js";

dotenv.config();

console.log("Starting server with environment:", {
  NODE_ENV: process.env.NODE_ENV,
  has_kroger_id: !!process.env.CLIENT_ID_KROGER,
  has_kroger_secret: !!process.env.CLIENT_SECRET_KROGER
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Logging middleware
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes mapped to handlers in /api folder
app.all("/api/health", healthHandler);
app.all("/api/kroger/auth", krogerAuthHandler);
app.all("/api/kroger/locations", krogerLocationsHandler);
app.all("/api/kroger/products", krogerProductsHandler);
app.all("/api/kroger/coupons", krogerCouponsHandler);
app.all("/api/kroger/compare", krogerCompareHandler);
app.all("/api/generate-meals", generateMealsHandler);
app.all("/api/identify-product", identifyProductHandler);
app.all("/api/lookup-market", lookupMarketHandler);
app.all("/api/search-store", searchStoreHandler);
app.all("/api/parse-voice-inventory", parseVoiceInventoryHandler);

// 404 for API routes to prevent SPA fallback
app.all("/api/*", (req, res) => {
  console.warn(`[API] 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "API route not found" });
});

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static("dist"));
      app.get("*", (_req, res) => {
        res.sendFile("dist/index.html", { root: "." });
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
