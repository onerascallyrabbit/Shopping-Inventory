
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

/**
 * Client-side call to /api/search-store
 */
export const searchStoreDetails = async (storeQuery: string, locationContext: string) => {
  try {
    const response = await fetch('/api/search-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeQuery, locationContext })
    });
    if (!response.ok) throw new Error('Failed to search store');
    return await response.json();
  } catch (error) {
    console.error("Store Search Error:", error);
    return null;
  }
};

/**
 * Client-side call to /api/lookup-market
 */
export const lookupMarketDetails = async (itemName: string, variety?: string) => {
  try {
    const response = await fetch('/api/lookup-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, variety })
    });
    if (!response.ok) throw new Error('Failed to lookup market');
    return await response.json();
  } catch (error) {
    console.error("Market Lookup Error:", error);
    return null;
  }
};

/**
 * Client-side call to /api/identify-product
 */
export const identifyProductFromImage = async (base64Image: string, mode: 'barcode' | 'product' | 'tag' = 'tag'): Promise<AnalyzedPrice | null> => {
  try {
    // Extract base64 part only if it's a data URL
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    
    const response = await fetch('/api/identify-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image: cleanBase64, mode })
    });
    if (!response.ok) throw new Error('Failed to identify product');
    return await response.json();
  } catch (error) {
    console.error("Product Analysis Error:", error);
    return null;
  }
};

/**
 * Client-side call to /api/generate-meals
 */
export const generateMealIdeas = async (inventory: InventoryItem[]): Promise<MealIdea[]> => {
  try {
    const response = await fetch('/api/generate-meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory })
    });
    if (!response.ok) throw new Error('Failed to generate meals');
    
    const meals = await response.json();
    const now = new Date().toISOString();
    
    return meals.map((m: any) => ({
      ...m,
      id: crypto.randomUUID(),
      generatedAt: now,
      cookCount: 0
    }));
  } catch (error) {
    console.error("Meal Generation Error:", error);
    return [];
  }
};
