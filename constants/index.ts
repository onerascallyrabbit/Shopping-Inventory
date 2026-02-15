
import { StorageLocation } from '../types';

export const DEFAULT_CATEGORIES = [
  "Produce", "Dairy", "Meat", "Seafood", "Deli", "Bakery", 
  "Frozen", "Pantry", "Beverages", "Household", "Personal Care", 
  "Baby", "Pets", "Other"
];

export const SUB_CATEGORIES: Record<string, string[]> = {
  "Produce": ["Fruits", "Vegetables", "Herbs", "Organic"],
  "Dairy": ["Milk", "Cheese", "Yogurt", "Butter", "Eggs", "Alternatives"],
  "Meat": ["Beef", "Poultry", "Pork", "Lamb", "Sausage", "Deli Meat"],
  "Seafood": ["Fish", "Shellfish", "Frozen Fish"],
  "Bakery": ["Bread", "Pastries", "Tortillas", "Cakes"],
  "Frozen": ["Meals", "Vegetables", "Ice Cream", "Pizza"],
  "Pantry": ["Grains", "Canned Goods", "Baking", "Spices", "Snacks", "Pasta"],
  "Beverages": ["Water", "Soda", "Juice", "Coffee", "Tea", "Alcohol"],
  "Household": ["Cleaning", "Paper Products", "Laundry", "Kitchen"],
  "Personal Care": ["Hygiene", "Skincare", "First Aid", "Vitamins"],
  "Other": ["General"]
};

export const UNITS = ['pc', 'oz', 'lb', 'ml', 'lt', 'gal', 'count', 'pack', 'kg', 'g'];

export const DEFAULT_STORAGE: StorageLocation[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Pantry - Main' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Refrigerator #1' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Freezer #1' }
];

export const NATIONAL_STORES = [
  "Walmart", "Target", "Costco", "Whole Foods", 
  "Trader Joe's", "Aldi", "Kroger", "Safeway", "Publix"
];
