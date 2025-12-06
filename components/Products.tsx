
import React, { useState, useEffect, useRef } from 'react';
import { Product, Variation, UserRole } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { fetchWooProducts, updateWooProduct, fetchWooProductVariations, batchUpdateWooVariations, getWooSettings } from '../services/wooService';
import { IconEdit, IconSparkles, IconSearch, IconX, IconRefresh, IconChevronLeft, IconChevronRight } from './Icons';

const mockProducts: Product[] = [
  { id: '1', name: 'Kids Paradise Racer', price: 12500, regularPrice: 15000, salePrice: 12500, stock: 12, category: 'Toys', status: 'active', image: 'https://picsum.photos/100/100?random=1', description: 'Fast electric car for kids.', type: 'simple' },
  { id: '2', name: 'Cotton Summer Dress', price: 1500, regularPrice: 1500, salePrice: null, stock: 45, category: 'Clothing', status: 'active', image: 'https://picsum.photos/100/100?random=2', description: 'Lightweight cotton dress.', type: 'simple' },
  { id: '3', name: 'Learning Blocks Set', price: 850, regularPrice: 1000, salePrice: 850, stock: 8, category: 'Education', status: 'draft', image: 'https://picsum.photos/100/100?random=3', description: 'Educational building blocks.', type: 'simple' },
  { id: '4', name: 'Baby Stroller Pro', price: 25000, regularPrice: 25000, salePrice: null, stock: 3, category: 'Gear', status: 'active', image: 'https://picsum.photos/100/100?random=4', description: 'Advanced suspension stroller.', type: 'simple' },
  { id: '5', name: 'Plush Teddy Bear', price: 1200, regularPrice: 1200, salePrice: null, stock: 100, category: 'Toys', status: 'active', image: 'https://picsum.photos/100/100?random=5', description: 'Soft cuddly bear.', type: 'simple' },
  { id: '6', name: 'Kids T-Shirt', price: 500, regularPrice: 600, salePrice: 500, stock: 100, category: 'Clothing', status: 'active', image: 'https://picsum.photos/100/100?random=6', description: 'Cotton T-Shirt', type: 'variable' }
];

const mockVariations: Variation[] = [
    { id: '101', attributes: [{name: 'Size', option: 'S'}, {name: 'Color', option: 'Red'}], price: 500, regularPrice: 600, salePrice: 500, stock: 10 },
    { id: '102', attributes: [{name: 'Size', option: 'M'}, {name: 'Color', option: 'Red'}], price: 500, regularPrice: 600, salePrice: 500, stock: 15 },
    { id: '103', attributes: [{name: 'Size', option: 'L'}, {name: 'Color', option: 'Red'}], price: 550, regularPrice: 650, salePrice: 550, stock: 5 },
];

interface ProductsProps {
  role: UserRole;
}

const Products = ({ role }: ProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSynced, setIsSynced] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVariations, setEditingVariations] = useState<Variation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTermRef = useRef(''); // Ref to keep track of latest search for polling

  const isViewer = role === 'viewer';

  // Sync ref with state
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  const loadData = async (showLoading = true) => {
    const settings = getWooSettings();
    if (!settings) {
      setProducts(mockProducts);
      setIsSynced(false);
      setTotalPages(1);
      return;
    }

    if(showLoading) setLoading(true);
    // Don't clear error here on background polls to avoid flashing UI
    if(showLoading) setError('');
    
    try {
      // Fetch products with pagination (12 items per page) and search term
      const search = searchTermRef.current;
      const { data, totalPages } = await fetchWooProducts(page, 12, search);
      setProducts(data);
      setTotalPages(totalPages);
      setIsSynced(true);
    } catch (err: any) {
      console.error(err);
      if(showLoading) {
          setError(`Sync Failed: ${err.message || 'Unknown error'}. Displaying local data.`);
          setProducts(mockProducts);
          setIsSynced(false);
          setTotalPages(1);
      }
    } finally {
      if(showLoading) setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (page === 1) {
        // If already on page 1, reload manually
        loadData(true);
      } else {
        // If not on page 1, resetting page will trigger the [page] effect which loads data
        setPage(1);
      }
    }, 600);
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Handle page changes and polling
  useEffect(() => {
    // Initial load when page changes
    loadData(true);
    
    // Poll for changes every 15 seconds (Real-time simulation)
    pollingRef.current = setInterval(() => {
        // Only poll if we are not currently editing to avoid overwriting user input
        setEditingProduct(current => {
            if (!current) {
                loadData(false);
            }
            return current;
        });
    }, 15000);

    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [page]); 

  // Load variations when editing a variable product
  useEffect(() => {
      const loadVariations = async () => {
          if (editingProduct && editingProduct.type === 'variable') {
              setLoadingVariations(true);
              const settings = getWooSettings();
              if (settings) {
                  const vars = await fetchWooProductVariations(editingProduct.id);
                  setEditingVariations(vars);
              } else {
                  setEditingVariations(mockVariations);
              }
              setLoadingVariations(false);
          } else {
              setEditingVariations([]);
          }
      };

      loadVariations();
  }, [editingProduct?.id, editingProduct?.type]);

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
  };

  const handleSave = async () => {
    if (!editingProduct || isViewer) return;
    
    const settings = getWooSettings();
    
    if (settings) {
        setSaving(true);
        try {
            // 1. Update main product details
            await updateWooProduct(editingProduct.id, editingProduct);

            // 2. Update variations if it's a variable product
            if (editingProduct.type === 'variable' && editingVariations.length > 0) {
                await batchUpdateWooVariations(editingProduct.id, editingVariations);
            }

            // Optimistic update locally
            setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
            setEditingProduct(null);
            // Reload to ensure sync
            loadData(false); 
        } catch (err: any) {
            alert(`Failed to save to WooCommerce: ${err.message}`);
        } finally {
            setSaving(false);
        }
    } else {
        // Local mock update
        setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
        setEditingProduct(null);
    }
  };

  const handleGenerateDescription = async () => {
    if (!editingProduct || isViewer) return;
    setIsGenerating(true);
    const desc = await generateProductDescription(editingProduct.name, editingProduct.category, editingProduct.description || "Kids product, high quality");
    setEditingProduct({ ...editingProduct, description: desc });
    setIsGenerating(false);
  };

  const updateVariation = (id: string, field: keyof Variation, value: number | null) => {
      if(isViewer) return;
      setEditingVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  // If synced, backend handles filtering. If using mock data, we filter locally.
  const displayProducts = isSynced 
    ? products 
    : products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-kp-black">Product Inventory</h2>
           <p className="text-xs text-gray-500 mt-1 flex items-center">
             {loading ? 'Syncing...' : isSynced ? <><span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span> Live Sync Active</> : 'Displaying Local/Mock Data'}
             {!loading && !isSynced && <button onClick={() => loadData(true)} className="ml-2 text-kp-red underline">Retry Sync</button>}
           </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
             <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search products..." 
               className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-kp-red/20 focus:border-kp-red transition-all"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => loadData(true)} 
            disabled={loading}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh Products"
          >
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex justify-between items-center">
          <span>{error}</span>
          <span className="text-xs text-red-500">Check Settings > Credentials</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && products.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading products...</td>
                </tr>
              ) : displayProducts.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No products found.</td>
                </tr>
              ) : displayProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-gray-400 truncate w-32" dangerouslySetInnerHTML={{__html: product.description.substring(0, 50)}}></p>
                        {product.type === 'variable' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Variable</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-medium text-kp-black">
                      {product.salePrice ? (
                          <div className="flex flex-col">
                              <span className="text-red-500">৳ {product.salePrice.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 line-through">৳ {product.regularPrice.toLocaleString()}</span>
                          </div>
                      ) : (
                          <span>৳ {product.regularPrice.toLocaleString()}</span>
                      )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${product.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${product.status === 'active' ? 'bg-green-100 text-green-800' : 
                        product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="text-gray-400 hover:text-kp-red transition-colors p-1"
                      title={isViewer ? "View Details" : "Edit Product"}
                    >
                      <IconEdit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
           <button 
             disabled={page === 1 || loading}
             onClick={() => setPage(p => Math.max(1, p - 1))}
             className="flex items-center px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
             <IconChevronLeft className="w-4 h-4 mr-1" />
             Previous
           </button>
           <span className="text-xs font-medium text-gray-500">
             Page {page} of {totalPages}
           </span>
           <button 
             disabled={page >= totalPages || loading}
             onClick={() => setPage(p => p + 1)}
             className="flex items-center px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
           >
             Next
             <IconChevronRight className="w-4 h-4 ml-1" />
           </button>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-kp-black">
                  {isViewer ? 'Product Details' : (editingProduct.type === 'variable' ? 'Edit Variable Product' : 'Edit Product')}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <IconX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {isViewer && (
                <div className="bg-blue-50 text-blue-600 text-xs p-3 rounded-lg border border-blue-100">
                  You are in <b>Viewer Mode</b>. Editing is disabled.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input 
                    type="text" 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={isViewer}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price (৳)</label>
                  <input 
                    type="number" 
                    value={editingProduct.regularPrice}
                    onChange={(e) => setEditingProduct({...editingProduct, regularPrice: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={isViewer}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (৳)</label>
                  <input 
                    type="number" 
                    value={editingProduct.salePrice || ''}
                    placeholder="Optional"
                    onChange={(e) => setEditingProduct({...editingProduct, salePrice: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    disabled={isViewer}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                    disabled 
                    title="Category updates require category ID mapping, disabled for safety in this demo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Stock</label>
                  <input 
                    type="number" 
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={editingProduct.type === 'variable' || isViewer}
                    title={editingProduct.type === 'variable' ? "Managed by variations below" : ""}
                  />
                </div>
              </div>

              {/* Description Section */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  {!isViewer && (
                    <button 
                      onClick={handleGenerateDescription}
                      disabled={isGenerating}
                      className="flex items-center space-x-1 text-xs font-medium text-kp-red hover:text-red-700 disabled:opacity-50"
                    >
                      <IconSparkles className="w-3 h-3" />
                      <span>{isGenerating ? 'Generating...' : 'Auto-Generate with AI'}</span>
                    </button>
                  )}
                </div>
                <textarea 
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Enter product details..."
                  disabled={isViewer}
                />
              </div>

              {/* Variations Section */}
              {editingProduct.type === 'variable' && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex justify-between">
                          Variations Management
                          {loadingVariations && <span className="text-xs font-normal text-gray-500 flex items-center"><IconRefresh className="w-3 h-3 animate-spin mr-1"/>Loading...</span>}
                      </h4>
                      
                      {!loadingVariations && editingVariations.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-4">No variations found.</p>
                      ) : (
                          <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                              {editingVariations.map(variation => (
                                  <div key={variation.id} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col gap-2 shadow-sm">
                                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                          <div className="flex flex-wrap gap-1">
                                              {variation.attributes.map(attr => (
                                                  <span key={attr.name} className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded border border-blue-100">
                                                      {attr.name}: <b>{attr.option}</b>
                                                  </span>
                                              ))}
                                          </div>
                                          <div className="text-xs font-medium text-gray-500">ID: {variation.id}</div>
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-3">
                                          <div className="flex flex-col">
                                              <label className="text-[10px] text-gray-400 mb-1">Regular Price (৳)</label>
                                              <input 
                                                type="number"
                                                value={variation.regularPrice}
                                                onChange={(e) => updateVariation(variation.id, 'regularPrice', Number(e.target.value))}
                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                                disabled={isViewer}
                                              />
                                          </div>
                                          <div className="flex flex-col">
                                              <label className="text-[10px] text-gray-400 mb-1">Sale Price (৳)</label>
                                              <input 
                                                type="number"
                                                value={variation.salePrice || ''}
                                                placeholder="None"
                                                onChange={(e) => updateVariation(variation.id, 'salePrice', e.target.value ? Number(e.target.value) : null)}
                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                                disabled={isViewer}
                                              />
                                          </div>
                                          <div className="flex flex-col">
                                              <label className="text-[10px] text-gray-400 mb-1">Stock</label>
                                              <input 
                                                type="number"
                                                value={variation.stock}
                                                onChange={(e) => updateVariation(variation.id, 'stock', Number(e.target.value))}
                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-kp-red outline-none disabled:bg-gray-50 disabled:text-gray-500"
                                                disabled={isViewer}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

              {/* Status Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex space-x-4">
                  {['active', 'draft', 'archived'].map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={editingProduct.status === status}
                        onChange={() => setEditingProduct({...editingProduct, status: status as any})}
                        className="text-kp-red focus:ring-kp-red disabled:text-gray-400"
                        disabled={isViewer}
                      />
                      <span className={`capitalize text-sm ${isViewer ? 'text-gray-400' : 'text-gray-600'}`}>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button 
                onClick={() => setEditingProduct(null)}
                disabled={saving}
                className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isViewer ? 'Close' : 'Cancel'}
              </button>
              {!isViewer && (
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-medium bg-kp-red text-white hover:bg-red-600 shadow-md shadow-red-200 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                      <>
                          <IconRefresh className="w-4 h-4 animate-spin mr-2" />
                          Saving...
                      </>
                  ) : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
