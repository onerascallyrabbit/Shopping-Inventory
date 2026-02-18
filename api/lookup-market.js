
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { itemName, variety } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current average grocery price and standard units for ${itemName} ${variety || ''} in the US.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    res.status(200).json({
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
