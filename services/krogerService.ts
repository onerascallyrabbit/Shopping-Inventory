
export const lookupKrogerProduct = async (upc: string, locationId?: string) => {
  try {
    const params = new URLSearchParams({ upc });
    if (locationId) params.append('locationId', locationId);
    
    const response = await fetch(`/api/kroger/products?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to lookup Kroger product');
    
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error("Kroger Lookup Error:", error);
    return null;
  }
};

export const searchKrogerLocations = async (zip: string, radius: number = 10) => {
  try {
    const params = new URLSearchParams({ zip, radius: radius.toString() });
    const response = await fetch(`/api/kroger/locations?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to search Kroger locations');
    return await response.json();
  } catch (error) {
    console.error("Kroger Location Error:", error);
    return null;
  }
};

export const compareKrogerPrices = async (upc: string, zip: string, radius: number = 20) => {
  try {
    const params = new URLSearchParams({ upc, zip, radius: radius.toString() });
    const response = await fetch(`/api/kroger/compare?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to compare Kroger prices');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Kroger Compare Error:", error);
    return [];
  }
};
