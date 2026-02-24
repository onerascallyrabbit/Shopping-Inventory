import axios from 'axios';
import { getKrogerToken, KROGER_BASE_URL } from './_utils.js';

export default async function handler(req, res) {
  try {
    const { productId, locationId } = req.query;
    const token = await getKrogerToken();
    
    // Note: The coupons endpoint often requires a user-authenticated token (OAuth)
    // for specific "clipped" coupons, but we can try to find available ones.
    // If this fails due to scope, we'll return an empty array gracefully.
    const response = await axios.get(`${KROGER_BASE_URL}/coupons`, {
      params: {
        "filter.productId": productId,
        "filter.locationId": locationId,
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Kroger Coupons Error:", error.response?.data || error.message);
    // Return empty array instead of error to avoid breaking UI
    res.json({ data: [] });
  }
}
