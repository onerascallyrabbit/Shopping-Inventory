
export interface PriceRecord {
  id: string;
  store: string;
  price: number;
  quantity: number;
  unit: string; // e.g., 'oz', 'lb', 'count', 'ml'
  date: string;
  image?: string; // base64
}

export interface Product {
  id: string;
  category: string; 
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
}

export interface SubLocation {
  id: string;
  locationId: string;
  name: string;
}

export interface StorageLocation {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  itemName: string;
  category: string;
  variety?: string;
  subLocation?: string; 
  quantity: number;
  unit: string;
  locationId: string;
  updatedAt: string;
  userId?: string; // Track who owns/created this record
}

export interface Vehicle {
  id: string;
  name: string;
  mpg: number;
}

export interface UserSettings {
  locationLabel: string;
  zip?: string;
  activeVehicleId?: string;
  gasPrice?: number;
}

export type AppTab = 'dashboard' | 'items' | 'inventory' | 'list' | 'shop' | 'settings';
