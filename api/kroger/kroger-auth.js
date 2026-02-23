import { getKrogerToken } from './_kroger.js';

export default async function handler(req, res) {
  try {
    const token = await getKrogerToken();
    res.json({ access_token: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
