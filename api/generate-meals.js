
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { inventory } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const inventoryText = inventory.map(i => `${i.quantity} ${i.unit} of ${i.itemName}${i.variety ? ` (${i.variety})` : ''}`).join(', ');
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on the following pantry/fridge inventory: [${inventoryText}]. Suggest exactly 6 meal ideas. Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
              cookTime: { type: Type.NUMBER },
              matchPercentage: { type: Type.NUMBER },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    isMissing: { type: Type.BOOLEAN }
                  },
                  required: ["name", "quantity", "unit", "isMissing"]
                }
              },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "difficulty", "cookTime", "ingredients", "instructions", "matchPercentage"]
          }
        }
      }
    });

    res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
