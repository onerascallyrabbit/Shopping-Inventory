import axios from 'axios';

const KROGER_BASE_URL = "https://api.kroger.com/v1";
let krogerToken = null;
let tokenExpiry = 0;

export async function getKrogerToken() {
  if (krogerToken && Date.now() < tokenExpiry) {
    return krogerToken;
  }

  const CLIENT_ID = process.env.CLIENT_ID_KROGER || process.env.KROGER_CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET_KROGER || process.env.KROGER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Kroger Auth Error: Missing CLIENT_ID or CLIENT_SECRET", { 
      hasId: !!CLIENT_ID, 
      hasSecret: !!CLIENT_SECRET 
    });
    throw new Error("Kroger credentials missing. Please set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in environment variables.");
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
  } catch (error) {
    console.error("Kroger Auth Error:", error.response?.data || error.message);
    throw error;
  }
}

export { KROGER_BASE_URL };
