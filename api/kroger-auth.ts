import axios from 'axios';

const KROGER_BASE_URL = "https://api.kroger.com/v1";
let krogerToken = null;
let tokenExpiry = 0;

async function getKrogerToken() {
  if (krogerToken && Date.now() < tokenExpiry) {
    return krogerToken;
  }

  const CLIENT_ID = process.env.KROGER_CLIENT_ID;
  const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Kroger credentials missing");
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  
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
}

export default async function handler(req, res) {
  try {
    const token = await getKrogerToken();
    res.status(200).json({ access_token: token });
  } catch (error) {
    console.error('Kroger auth error:', error);
    res.status(500).json({ error: error.message });
  }
}
