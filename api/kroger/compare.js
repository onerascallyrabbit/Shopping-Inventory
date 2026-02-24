import axios from 'axios';
import { getKrogerToken, KROGER_BASE_URL } from './_utils.js';

export default async function handler(req, res) {
  try {
    const { upc, zip, radius = 20, limit = 10 } = req.query;
    
    if (!upc || !zip) {
      return res.status(400).json({ error: "UPC and Zip code are required" });
    }

    const token = await getKrogerToken();
    
    // 1. Find nearby stores
    const locationsResponse = await axios.get(`${KROGER_BASE_URL}/locations`, {
      params: {
        "filter.zipCode.near": zip,
        "filter.radiusInMiles": radius,
        "filter.limit": limit,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const stores = locationsResponse.data.data || [];
    
    if (stores.length === 0) {
      return res.json({ data: [] });
    }

    // 2. For each store, fetch product price
    // We'll do this in parallel to be faster
    const pricePromises = stores.map(async (store) => {
      try {
        const productResponse = await axios.get(`${KROGER_BASE_URL}/products`, {
          params: {
            "filter.locationId": store.locationId,
            "filter.upc": upc,
            "filter.fulfillment": "ais",
          },
          headers: { Authorization: `Bearer ${token}` },
        });

        const product = productResponse.data.data?.[0];
        if (!product) return null;

        return {
          storeId: store.locationId,
          storeName: store.name,
          address: store.address.addressLine1,
          city: store.address.city,
          distance: store.distance,
          price: product.items?.[0]?.price?.promo || product.items?.[0]?.price?.regular || 0,
          regularPrice: product.items?.[0]?.price?.regular || 0,
          onSale: !!product.items?.[0]?.price?.promo,
          inStock: product.items?.[0]?.inventory?.stockLevel !== 'TEMPORARILY_OUT_OF_STOCK',
          productDescription: product.description,
          imageUrl: product.images?.find(img => img.perspective === 'front')?.sizes?.find(s => s.size === 'medium')?.url
        };
      } catch (err) {
        console.error(`Error fetching price for store ${store.locationId}:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(pricePromises);
    const validResults = results.filter(r => r !== null);

    res.json({ data: validResults });
  } catch (error) {
    console.error("Kroger Compare Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
}
