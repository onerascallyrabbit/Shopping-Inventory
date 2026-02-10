import { GoogleGenAI, Type } from "@google/genai";

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

// Guideline: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// Guideline: Create a new GoogleGenAI instance right before making an API call.

export const searchStoreDetails = async (storeQuery: string, locationContext: string) => {
  // Use process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const lookupMarketDetails = async (itemName: string, variety?: string) => {
  // Use process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const identifyProductFromImage = async (base64Image: string, mode: 'barcode' | 'product' | 'tag' = 'tag'): Promise<AnalyzedPrice | null> => {
  // Use process.env.API_KEY directly as per SDK requirements
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompts = {
    barcode: "This is a photo of a barcode. Extract the UPC/EAN digits. Also, identify the product hierarchy: Category, Item Name, and Variety.",
    product: "This is a photo of a product. Identify the hierarchy: Category, Item Name, and Variety. Also find the brand.",
    tag: "This is a photo of a price tag. Extract hierarchy: Category, Item Name, and Variety. Also extract total price, quantity, unit, and store name."
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
