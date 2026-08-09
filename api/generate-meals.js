import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inventory, focus } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

    const prompt = `You are a meal-planning assistant. Based on the user's current pantry inventory, propose ${5} meal ideas.

Inventory:
${JSON.stringify((inventory || []).slice(0, 200).map(i => ({
  itemName: i.itemName,
  category: i.category,
  variety: i.variety,
  quantity: i.quantity,
  unit: i.unit
})))}

${focus ? `The user specifically wants meals focused on: ${focus}. Prioritize recipes built around that focus where possible.` : 'Prioritize recipes that use the most items already in stock.'}

Return valid JSON as an ARRAY of exactly 5 meal objects, each with:
- title: short appetizing name
- description: 1-2 sentence overview
- difficulty: "Easy" | "Medium" | "Hard"
- cookTime: total minutes as a number
- matchPercentage: number 0-100 estimating what fraction of ingredients are already in stock
- ingredients: array of { name, quantity (number), unit, isMissing (boolean) } — isMissing=true when the ingredient is not in inventory. Keep each meal to 4-8 ingredients.
- instructions: array of step-by-step strings (5-8 steps)

Rules:
- Use seasonal, practical ingredients. If a pantry item can be swapped in, prefer it.
- Be honest about matchPercentage; only count an ingredient as matched if it (or a clear equivalent) is in the inventory list.`;

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
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
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
            required: ["title", "description", "difficulty", "cookTime", "matchPercentage", "ingredients", "instructions"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "[]");
    res.status(200).json(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.error('Meal generation error:', error);
    res.status(500).json({ error: error.message });
  }
}
