
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { storeQuery, locationContext } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-latest',
      contents: `Find the most relevant store matching "${storeQuery}" near "${locationContext}". Return address, hours, and contact.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    res.status(200).json({
      text: response.text,
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
