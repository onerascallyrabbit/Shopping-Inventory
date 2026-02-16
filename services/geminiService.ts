
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, MealIdea } from "../types";

export interface AnalyzedPrice {
  category: string;
  itemName: string;
  variety?: string;
  brand?: string;
  barcode?: string;
  price?: number;
  store?: string;
  quantity: number;
  unit: string;
}

const getAIClient = () => {
  const apiKey = (typeof process !== 'undefined' ? process.env.API_KEY : '');
  if (!apiKey) {
    throw new Error("Gemini API Key missing. Please ensure 'API_KEY' is set in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const searchStoreDetails = async (storeQuery: string, locationContext: string) => {
  try {
    const ai = getAIClient();
    const prompt = `Find the most relevant store matching "${storeQuery}" near "${locationContext}". 
    Extract and return the following as a structured list: 
    - Full Name
    - Address
    - Latitude/Longitude (as decimals)
    - Phone Number
    - Hours of Operation`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    return {
      text: response.text,
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Store Search Error:", error);
    return null;
  }
};

export const lookupMarketDetails = async (itemName: string, variety?: string) => {
  try {
    const ai = getAIClient();
    const query = `Current average grocery price and standard units for ${itemName} ${variety || ''} in the US.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Market Lookup Error:", error);
    return null;
  }
};

export const identifyProductFromImage = async (base64Image: string, mode: 'barcode' | 'product' | 'tag' = 'tag'): Promise<AnalyzedPrice | null> => {
  try {
    const ai = getAIClient();
    const prompts = {
      barcode: "This is a photo of a barcode. Extract the UPC/EAN digits. Also, identify the product hierarchy: Category, Item Name, and Variety.",
      product: "This is a photo of a product. Identify the hierarchy: Category, Item Name, and Variety. Also find the brand.",
      tag: "This is a photo of a price tag. Extract hierarchy: Category, Item Name, and Variety. Also extract total price, quantity, unit, and store name."
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: prompts[mode] + " Return the result in a structured JSON format."
          }
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
          },
          required: ["category", "itemName", "quantity", "unit"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
};

export const generateMealIdeas = async (inventory: InventoryItem[]): Promise<MealIdea[]> => {
  const ai = getAIClient();
  const inventoryText = inventory.map(i => `${i.quantity} ${i.unit} of ${i.itemName}${i.variety ? ` (${i.variety})` : ''}`).join(', ');
  
  const prompt = `Based on the following pantry/fridge inventory: [${inventoryText}].
  Suggest exactly 6 meal ideas.
  - Some should be 100% matches (using ONLY available ingredients).
  - Some should be close (missing 1-3 common items).
  - Provide varied cuisines.
  Return the response in a structured JSON format.`;

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
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
            cookTime: { type: Type.NUMBER, description: 'Time in minutes' },
            matchPercentage: { type: Type.NUMBER, description: 'Percentage of ingredients currently in stock' },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  isMissing: { type: Type.BOOLEAN, description: 'True if not in inventory' }
                },
                required: ["name", "quantity", "unit", "isMissing"]
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "difficulty", "cookTime", "ingredients", "instructions", "matchPercentage"]
        }
      }
    }
  });

  const parsed = JSON.parse(response.text || '[]');
  const now = new Date().toISOString();
  return parsed.map((m: any) => ({
    ...m,
    id: crypto.randomUUID(),
    generatedAt: now,
    cookCount: 0
  }));
};
