
export interface PriceRecord {
  id: string;
  store: string;
  price: number;
  quantity: number;
  unit: string; // e.g., 'oz', 'lb', 'count', 'ml'
  date: string;
  image?: string; // base64
  isPublic?: boolean;
}

export interface Product {
  id: string;
  category: string; 
  subCategory?: string;
  itemName: string; 
  variety?: string; 
  brand?: string;
  barcode?: string;
  history: PriceRecord[];
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  productId: string; // 'manual' or a valid product UUID
  name: string;
  neededQuantity: number;
  unit: string;
  isCompleted: boolean;
  manualStore?: string;
  category?: string;
  userId?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  hours?: string;
  phone?: string;
  zip?: string;
  userId?: string;
}

export interface SubLocation {
  id: string;
  locationId: string;
  name: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  sortOrder: number;
}

export interface InventoryItem {
  // Core identification (always filled)
  id: string;
  productId: string; // 'manual' or a valid product UUID
  itemName: string;        // "Cheddar", "Chicken Breast", "Tomatoes"
  category: string;        // "Dairy", "Meat", "Produce"
  
  // Flexible descriptors (fill what's relevant)
  variety?: string;        // "Sharp", "Bone-in", "Roma"
  brand?: string;          // "Tillamook", "Organic Valley", "Driscoll's"
  grade?: string;          // "Extra Sharp", "USDA Prime", "Grade A"
  style?: string;          // "Aged", "Smoked", "Fresh"
  origin?: string;         // "Wisconsin", "Local", "Imported"
  subCategory?: string;    // Keeping legacy subCategory support
  
  // Quantity & units
  quantity: number;        // 2, 1.5, 8
  unit: string;           // "blocks", "lbs", "oz", "each", "packages"
  
  // Location (keeping existing feature)
  locationId: string;
  subLocation?: string; 
  
  // Tracking
  purchaseDate?: string;
  expirationDate?: string;
  openedDate?: string;     // For tracking after opening
  
  // Optional enrichment
  notes?: string;          // Free-form for anything else
  barcode?: string;
  imageUrl?: string;
  
  // Metadata
  userId?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  mpg: number;
  userId?: string;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

export interface Profile {
  id: string;
  locationLabel: string;
  zip: string;
  gasPrice: number;
  categoryOrder: string[];
  activeVehicleId?: string;
  sharePrices: boolean;
  familyId?: string;
  defaultTab?: AppTab;
}

export interface FamilyMember {
  id: string;
  email: string;
  avatar_url?: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  familyId: string;
}

export interface CustomSubCategory {
  id: string;
  categoryId: string; // name of the parent category
  name: string;
  familyId: string;
}

export interface MealIngredient {
  name: string;
  quantity: number;
  unit: string;
  isMissing: boolean;
}

export interface MealIdea {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cookTime: number;
  ingredients: MealIngredient[];
  instructions: string[];
  matchPercentage: number;
  rating?: number;
  cookCount: number;
  lastCooked?: string;
  generatedAt: string;
}

export interface CellarItem {
  id: string;
  producer?: string; // Winery, Brewery, Distillery
  name: string;
  category: 'Wine' | 'Beer' | 'Spirits';
  subCategory?: string; // Red, White, Rosé, etc.
  type: string; // Pinot Noir, IPA, Whiskey, etc.
  quantity: number;
  unit: string; // bottles, cans, etc.
  lowStockThreshold: number;
  isOpened: boolean;
  notes?: string;
  rating?: number;
  vintage?: string;
  abv?: string;
  price?: number;
  location?: string;
  userId: string;
  familyId?: string;
  updatedAt: string;
}

export interface ConsumptionLog {
  id: string;
  itemId: string;
  quantity: number;
  date: string;
  occasion?: string;
  notes?: string;
}

export type AppTab = 'dashboard' | 'items' | 'inventory' | 'cellar' | 'list' | 'shop' | 'meals' | 'settings';
