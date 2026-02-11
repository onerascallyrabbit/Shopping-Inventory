
import { StorageLocation } from '../types';

export const DEFAULT_CATEGORIES = [
  "Produce", "Dairy", "Meat", "Seafood", "Deli", "Bakery", 
  "Frozen", "Pantry", "Beverages", "Household", "Personal Care", 
  "Baby", "Pets", "Other"
];

export const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

export const DEFAULT_STORAGE: StorageLocation[] = [
  { id: '1', name: 'Pantry - Main' },
  { id: '2', name: 'Refrigerator #1' },
  { id: '3', name: 'Freezer #1' }
];

export const NATIONAL_STORES = [
  "Walmart", "Target", "Costco", "Whole Foods", 
  "Trader Joe's", "Aldi", "Kroger", "Safeway", "Publix"
];
