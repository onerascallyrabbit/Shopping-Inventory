import axios from 'axios';
import { getKrogerToken, KROGER_BASE_URL } from './_utils.js';

export default async function handler(req, res) {
  try {
    const { term, locationId, limit = 10 } = req.query;
    const token = await getKrogerToken();
    
    const response = await axios.get(`${KROGER_BASE_URL}/products`, {
      params: {
        "filter.term": term,
        "filter.locationId": locationId,
        "filter.limit": limit,
        "filter.fulfillment": "ais",
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Kroger Products Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
}
