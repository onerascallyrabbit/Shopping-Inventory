import { getKrogerToken } from './_kroger';

export default async function handler(req: any, res: any) {
  try {
    const token = await getKrogerToken();
    res.json({ access_token: token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
