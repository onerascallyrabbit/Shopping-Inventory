import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, availableLocations, availableSubLocations } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const prompt = `Parse this voice command for adding one or more items to inventory:

Command: "${transcript}"

Available storage locations: ${availableLocations.map(l => `${l.name} (ID: ${l.id})`).join(', ')}
Available sub-locations: ${availableSubLocations.map(s => `${s.parent}/${s.name}`).join(', ')}

Extract and return valid JSON as an ARRAY of objects.

Rules:
- If multiple items are mentioned (e.g., "3 eggs and 2 milk"), return one object for each.
- If a location is mentioned once for multiple items (e.g., "add eggs and milk to the fridge"), apply that location to all relevant items.
- Match the mentioned location to the closest available location and return its ID in the locationId field.
- For "pantry 2" or "freezer 1", match to location names containing those terms.
- For "shelf 3" or "top shelf", put in subLocation field.
- Infer category from product (ketchup=Pantry, beef=Meat, milk=Dairy).
- If brand not mentioned, leave empty.
- Convert spoken numbers to digits (three = 3, two = 2).
- Handle quantity vs unit count ambiguity: If someone says "three eighteen count eggs", the quantity is 3 and the unitMeasure is "18-count". Do NOT combine them into "318".
- Handle various phrasings: "put in", "add to", "store in".
- For unitMeasure, extract strings like "18-count", "12-ounce", "2-pound", etc.
- For container, extract strings like "carton", "can", "bottle", "package", "bag", etc.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              itemName: { type: Type.STRING, description: "product name without brand" },
              brand: { type: Type.STRING, description: "brand name if mentioned" },
              variety: { type: Type.STRING, description: "type/flavor if mentioned" },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING, description: "bottles|lbs|oz|each|packages|etc" },
              unitSize: { type: Type.NUMBER, description: "if size mentioned like '12oz', this is 12" },
              unitMeasure: { type: Type.STRING, description: "the full measure string like '12-ounce' or '18-count'" },
              container: { type: Type.STRING, description: "carton|can|bottle|package|etc" },
              category: { type: Type.STRING, description: "best matching category" },
              locationId: { type: Type.STRING, description: "The ID of the matched location" },
              subLocation: { type: Type.STRING, description: "shelf/drawer name if mentioned" }
            },
            required: ["itemName", "quantity", "unit", "category", "locationId"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    res.status(200).json(parsed);
  } catch (error) {
    console.error('Voice parse error:', error);
    res.status(500).json({ error: error.message });
  }
}
