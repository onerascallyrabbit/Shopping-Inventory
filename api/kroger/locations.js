import axios from 'axios';
import { getKrogerToken, KROGER_BASE_URL } from './_utils.js';

console.log("Kroger locations handler module loaded");

export default async function handler(req, res) {
  console.log("Kroger locations handler called", req.query);
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
  } catch (error) {
    console.error("Kroger Locations Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
}
