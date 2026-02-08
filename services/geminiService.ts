import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@1.39.0";

// Utility for safe environment variable access
const getEnv = (key: string): string => {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[key]) || '';
  } catch {
    return '';
  }
};

const apiKey = getEnv('API_KEY');

// Initialize AI lazily to avoid immediate failure if API key is temporarily missing
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!apiKey) {
    console.warn("Gemini Service: API_KEY missing. AI features will be disabled.");
    return null;
  }
  if (!aiInstance) aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

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

/**
 * Uses Google Maps tool to search for store details.
 */
export const searchStoreDetails = async (storeQuery: string, locationContext: string) => {
  const ai = getAI();
  if (!ai) return null;
  try {
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

/**
 * Uses Gemini with Google Search to find current market prices or details for a specific item.
 */
export const lookupMarketDetails = async (itemName: string, variety?: string) => {
  const ai = getAI();
  if (!ai) return null;
  try {
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

/**
 * Analyzes an image to extract product details in a hierarchy: Category | Item | Variety.
 */
export const identifyProductFromImage = async (base64Image: string, mode: 'barcode' | 'product' | 'tag' = 'tag'): Promise<AnalyzedPrice | null> => {
  const ai = getAI();
  if (!ai) return null;
  const prompts = {
    barcode: "This is a photo of a barcode. Extract the UPC/EAN digits. Also, identify the product hierarchy: Category (e.g., Produce), Item Name (e.g., Onion), and Variety/Sub-item (e.g., Yellow).",
    product: "This is a photo of a product. Identify the hierarchy: Category (e.g., Dairy), Item Name (e.g., Milk), and Variety/Sub-item (e.g., 2% Reduced Fat). Also find the brand.",
    tag: "This is a photo of a price tag or shelf label. Extract the hierarchy: Category (e.g., Produce), Item Name (e.g., Onion), and Variety/Sub-item (e.g., Yellow). Also extract total price, quantity, unit, and store name."
  };

  try {
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
            category: { type: Type.STRING, description: "Broad group like Produce, Dairy, Meat, Pantry" },
            itemName: { type: Type.STRING, description: "The specific product, e.g., Onion, Milk, Bread" },
            variety: { type: Type.STRING, description: "Specific type/sub-item, e.g., Yellow, 2%, Sourdough" },
            brand: { type: Type.STRING },
            barcode: { type: Type.STRING, description: "The numeric barcode string" },
            price: { type: Type.NUMBER },
            store: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            unit: { type: Type.STRING }
          },
          required: ["category", "itemName", "quantity", "unit"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AnalyzedPrice;
  } catch (error) {
    console.error("Gemini Error identifying product hierarchy:", error);
    return null;
  }
};
