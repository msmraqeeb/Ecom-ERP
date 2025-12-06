
import { Product, Order, Customer, Variation } from '../types';

const SETTINGS_KEY = 'kp_woo_settings';

export interface WooSettings {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export const getWooSettings = (): WooSettings | null => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const saveWooSettings = (settings: WooSettings) => {
  // Ensure trailing slash removed from URL
  let url = settings.url.replace(/\/$/, '');
  const cleanSettings = {
    ...settings,
    url
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings));
};

// Helper to construct URL with auth params
const buildUrl = (endpoint: string, settings: WooSettings, params: Record<string, string> = {}) => {
  const url = new URL(`${settings.url}/wp-json/wc/v3/${endpoint}`);
  url.searchParams.append('consumer_key', settings.consumerKey);
  url.searchParams.append('consumer_secret', settings.consumerSecret);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  return url.toString();
};

// --- FETCHERS ---

export const fetchWooProducts = async (page = 1, per_page = 12, search = ''): Promise<{ data: Product[], total: number, totalPages: number }> => {
  const settings = getWooSettings();
  if (!settings) throw new Error("No settings configured");

  try {
    const params: Record<string, string> = { 
        per_page: per_page.toString(), 
        page: page.toString() 
    };
    if (search) {
        params.search = search;
    }

    const response = await fetch(buildUrl('products', settings, params));

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text.substring(0, 100)}`);
    }

    const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1', 10);
    const data = await response.json();
    
    if (!Array.isArray(data)) {
        throw new Error("Invalid response format from WooCommerce");
    }
    
    const mappedData: Product[] = data.map((p: any) => ({
      id: p.id.toString(),
      name: p.name,
      price: parseFloat(p.price || 0),
      regularPrice: parseFloat(p.regular_price || p.price || 0),
      salePrice: p.sale_price && p.sale_price !== '' ? parseFloat(p.sale_price) : null,
      stock: p.stock_quantity || 0,
      category: p.categories?.[0]?.name || 'Uncategorized',
      image: p.images?.[0]?.src || 'https://via.placeholder.com/100',
      description: p.short_description?.replace(/<[^>]*>?/gm, '') || p.description?.replace(/<[^>]*>?/gm, '') || 'No description',
      status: (p.status === 'publish' ? 'active' : p.status === 'draft' ? 'draft' : 'archived') as Product['status'],
      type: p.type || 'simple'
    }));

    return { data: mappedData, total, totalPages };
  } catch (error) {
    console.error("Fetch Products Error:", error);
    throw error;
  }
};

export const fetchWooProductVariations = async (productId: string): Promise<Variation[]> => {
    const settings = getWooSettings();
    if (!settings) throw new Error("No settings configured");

    try {
        const response = await fetch(buildUrl(`products/${productId}/variations`, settings, { per_page: '50' }));
        if (!response.ok) throw new Error("Failed to fetch variations");
        
        const data = await response.json();
        
        return data.map((v: any) => ({
            id: v.id.toString(),
            attributes: v.attributes,
            price: parseFloat(v.price || 0),
            regularPrice: parseFloat(v.regular_price || v.price || 0),
            salePrice: v.sale_price && v.sale_price !== '' ? parseFloat(v.sale_price) : null,
            stock: v.stock_quantity || 0
        }));
    } catch (error) {
        console.error("Fetch Variations Error:", error);
        return [];
    }
};

export const fetchWooOrders = async (page = 1, per_page = 12): Promise<{ data: Order[], total: number, totalPages: number }> => {
  const settings = getWooSettings();
  if (!settings) throw new Error("No settings configured");

  try {
    const response = await fetch(buildUrl('orders', settings, { per_page: per_page.toString(), page: page.toString() }));

    if (!response.ok) throw new Error("Failed to fetch orders");

    const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1', 10);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid response");

    const mappedData: Order[] = data.map((o: any) => ({
      id: `#ORD-${o.id}`, // Display ID
      rawId: o.id.toString(), // Real ID for API calls
      customerName: `${o.billing.first_name} ${o.billing.last_name}`.trim() || 'Guest',
      date: new Date(o.date_created).toISOString().split('T')[0],
      total: parseFloat(o.total),
      status: (o.status === 'completed' ? 'completed' : o.status === 'processing' ? 'processing' : o.status === 'cancelled' ? 'cancelled' : 'pending') as Order['status'],
      items: o.line_items.length
    }));

    return { data: mappedData, total, totalPages };
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    throw error;
  }
};

export const fetchWooCustomers = async (page = 1, per_page = 12): Promise<{ data: Customer[], total: number, totalPages: number }> => {
  const settings = getWooSettings();
  if (!settings) throw new Error("No settings configured");

  try {
    const response = await fetch(buildUrl('customers', settings, { per_page: per_page.toString(), page: page.toString(), role: 'all' }));

    if (!response.ok) throw new Error("Failed to fetch customers");

    const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1', 10);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid response");

    const mappedData: Customer[] = data.map((c: any) => ({
      id: c.id.toString(),
      name: `${c.first_name} ${c.last_name}`.trim() || c.username,
      email: c.email,
      totalOrders: c.orders_count || 0,
      totalSpent: parseFloat(c.total_spent || 0),
      lastActive: c.date_modified ? new Date(c.date_modified).toLocaleDateString() : 'Unknown'
    }));

    return { data: mappedData, total, totalPages };
  } catch (error) {
    console.error("Fetch Customers Error:", error);
    throw error;
  }
};

// --- UPDATERS ---

export const updateWooProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  const settings = getWooSettings();
  if (!settings) throw new Error("No settings configured");

  // Map internal types to WooCommerce API fields
  const wooData: any = {};
  if (data.name) wooData.name = data.name;
  
  if (data.regularPrice !== undefined) wooData.regular_price = data.regularPrice.toString();
  if (data.salePrice !== undefined) wooData.sale_price = data.salePrice !== null ? data.salePrice.toString() : '';

  // Only update simple product stock here. Variable product stock is handled via variations.
  if (data.type === 'simple' && data.stock !== undefined) {
      wooData.manage_stock = true;
      wooData.stock_quantity = data.stock;
  }
  if (data.description) {
      wooData.description = data.description;
      wooData.short_description = data.description; // Update both for consistency
  }
  if (data.status) {
      wooData.status = data.status === 'active' ? 'publish' : data.status === 'draft' ? 'draft' : 'private';
  }

  try {
      const response = await fetch(buildUrl(`products/${id}`, settings), {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(wooData)
      });

      if (!response.ok) {
          const text = await response.text();
          throw new Error(`Update Failed: ${text}`);
      }
  } catch (error) {
      console.error("Update Product Error:", error);
      throw error;
  }
};

export const batchUpdateWooVariations = async (productId: string, variations: Variation[]): Promise<void> => {
    const settings = getWooSettings();
    if (!settings) throw new Error("No settings configured");

    const updates = variations.map(v => ({
        id: parseInt(v.id),
        stock_quantity: v.stock,
        regular_price: v.regularPrice.toString(),
        sale_price: v.salePrice !== null ? v.salePrice.toString() : '',
        manage_stock: true
    }));

    try {
        const response = await fetch(buildUrl(`products/${productId}/variations/batch`, settings), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ update: updates })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Batch Update Failed: ${text}`);
        }
    } catch (error) {
        console.error("Batch Update Variation Error:", error);
        throw error;
    }
};

export const updateWooOrderStatus = async (id: string, status: string): Promise<void> => {
    const settings = getWooSettings();
    if (!settings) throw new Error("No settings configured");

    // Remove #ORD- prefix if present to get real ID
    const cleanId = id.replace('#ORD-', '');

    try {
        const response = await fetch(buildUrl(`orders/${cleanId}`, settings), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error(`Update Order Failed`);
        }
    } catch (error) {
        console.error("Update Order Error:", error);
        throw error;
    }
}
