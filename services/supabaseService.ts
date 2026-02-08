import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { InventoryItem, SubLocation } from '../types';

// Robust environment variable access including standard and Next.js prefixes
const getEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || '';
    }
  } catch (e) {
    console.warn(`Environment access error for ${key}:`, e);
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase Sync: Disabled. Check SUPABASE_URL and SUPABASE_ANON_KEY.");
} else {
  console.log("Supabase Sync: Online.");
}

export const syncInventoryItem = async (item: InventoryItem) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('inventory')
      .upsert({
        id: item.id,
        product_id: item.productId,
        item_name: item.itemName,
        category: item.category,
        variety: item.variety,
        sub_location: item.subLocation,
        quantity: item.quantity,
        unit: item.unit,
        location_id: item.locationId,
        updated_at: item.updatedAt
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sync Error:', err);
  }
};

export const syncSubLocation = async (sub: SubLocation) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('sub_locations')
      .upsert({
        id: sub.id,
        location_id: sub.locationId,
        name: sub.name
      });
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Sync Error:', err);
  }
};

export const deleteSubLocation = async (id: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('sub_locations').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Sub-location Delete Error:', err);
  }
};

export const bulkSyncInventory = async (items: InventoryItem[]) => {
  if (!supabase) return;
  try {
    const payload = items.map(item => ({
      id: item.id,
      product_id: item.productId,
      item_name: item.itemName,
      category: item.category,
      variety: item.variety,
      sub_location: item.subLocation,
      quantity: item.quantity,
      unit: item.unit,
      location_id: item.locationId,
      updated_at: item.updatedAt
    }));
    const { error } = await supabase.from('inventory').upsert(payload);
    if (error) throw error;
  } catch (err) {
    console.error('Supabase Bulk Sync Error:', err);
  }
};
