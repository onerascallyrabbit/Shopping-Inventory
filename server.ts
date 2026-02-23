import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import handlers from /api
// @ts-ignore
import healthHandler from "./api/health.js";
// @ts-ignore
import krogerAuthHandler from "./api/kroger-auth.js";
// @ts-ignore
import krogerLocationsHandler from "./api/kroger/locations.js";
// @ts-ignore
import krogerProductsHandler from "./api/kroger/products.js";
// @ts-ignore
import krogerCouponsHandler from "./api/kroger/coupons.js";
// @ts-ignore
import generateMealsHandler from "./api/generate-meals.js";
// @ts-ignore
import identifyProductHandler from "./api/identify-product.js";
// @ts-ignore
import lookupMarketHandler from "./api/lookup-market.js";
// @ts-ignore
import searchStoreHandler from "./api/search-store.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes mapped to handlers in /api folder
app.all("/api/health", healthHandler);
app.all("/api/kroger-auth", krogerAuthHandler);
app.all("/api/kroger/locations", krogerLocationsHandler);
app.all("/api/kroger/products", krogerProductsHandler);
app.all("/api/kroger/coupons", krogerCouponsHandler);
app.all("/api/generate-meals", generateMealsHandler);
app.all("/api/identify-product", identifyProductHandler);
app.all("/api/lookup-market", lookupMarketHandler);
app.all("/api/search-store", searchStoreHandler);

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
