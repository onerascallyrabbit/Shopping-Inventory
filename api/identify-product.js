
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64Image, mode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompts = {
      barcode: "This is a photo of a barcode. Extract the UPC/EAN digits. Also, identify the product hierarchy: Category, Item Name, and Variety.",
      product: "This is a photo of a product. Identify the hierarchy: Category, Item Name, and Variety. Also find the brand.",
      tag: "This is a photo of a price tag. Extract hierarchy: Category, Item Name, and Variety. Also extract total price, quantity, unit, and store name."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompts[mode || 'tag'] + " Return in structured JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            itemName: { type: Type.STRING },
            variety: { type: Type.STRING },
            brand: { type: Type.STRING },
            barcode: { type: Type.STRING },
            price: { type: Type.NUMBER },
            store: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING }
          }
        }
      }
    });

    res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
