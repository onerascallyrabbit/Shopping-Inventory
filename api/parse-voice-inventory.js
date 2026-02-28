import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, availableLocations, availableSubLocations } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const prompt = `Parse this voice command for adding an item to inventory:

Command: "${transcript}"

Available storage locations: ${availableLocations.map(l => `${l.name} (ID: ${l.id})`).join(', ')}
Available sub-locations: ${availableSubLocations.map(s => `${s.parent}/${s.name}`).join(', ')}

Extract and return valid JSON.

Rules:
- Match the mentioned location to the closest available location and return its ID in the locationId field.
- For "pantry 2" or "freezer 1", match to location names containing those terms.
- For "shelf 3" or "top shelf", put in subLocation field.
- Infer category from product (ketchup=Pantry, beef=Meat, milk=Dairy).
- If brand not mentioned, leave empty.
- Convert spoken numbers to digits (three = 3, two = 2).
- Handle various phrasings: "put in", "add to", "store in".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING, description: "product name without brand" },
            brand: { type: Type.STRING, description: "brand name if mentioned" },
            variety: { type: Type.STRING, description: "type/flavor if mentioned" },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING, description: "bottles|lbs|oz|each|packages|etc" },
            unitSize: { type: Type.NUMBER, description: "if size mentioned like '12oz'" },
            unitMeasure: { type: Type.STRING, description: "oz|ml|lb|g (if size mentioned)" },
            category: { type: Type.STRING, description: "best matching category" },
            locationId: { type: Type.STRING, description: "The ID of the matched location" },
            subLocation: { type: Type.STRING, description: "shelf/drawer name if mentioned" }
          },
          required: ["itemName", "quantity", "unit", "category", "locationId"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    
    // Attempt to match locationId to an actual ID if possible, 
    // but the prompt asks to match to closest available location name.
    // We'll handle the ID mapping on the frontend or here if we had the IDs.
    // The request says "match to closest available location name".
    
    res.status(200).json(parsed);
  } catch (error) {
    console.error('Voice parse error:', error);
    res.status(500).json({ error: error.message });
  }
}
