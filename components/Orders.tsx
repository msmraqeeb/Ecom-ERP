import React, { useEffect, useState, useRef } from 'react';
import { Order, UserRole } from '../types';
import { fetchWooOrders, updateWooOrderStatus, getWooSettings } from '../services/wooService';
import { IconRefresh, IconChevronLeft, IconChevronRight } from './Icons';

const mockOrders: Order[] = [
  { id: '#ORD-7721', customerName: 'Fahim Ahmed', date: '2023-10-25', total: 4500, status: 'completed', items: 3 },
  { id: '#ORD-7722', customerName: 'Sarah Khan', date: '2023-10-25', total: 1200, status: 'processing', items: 1 },
  { id: '#ORD-7723', customerName: 'Tanvir Hasan', date: '2023-10-24', total: 8500, status: 'pending', items: 5 },
  { id: '#ORD-7724', customerName: 'Nusrat Jahan', date: '2023-10-24', total: 2300, status: 'cancelled', items: 2 },
  { id: '#ORD-7725', customerName: 'Rahim Uddin', date: '2023-10-23', total: 6700, status: 'completed', items: 4 },
];

interface OrdersProps {
  role: UserRole;
}

const Orders = ({ role }: OrdersProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isViewer = role === 'viewer';

  const loadOrders = async (showLoading = true) => {
    const settings = getWooSettings();
    if (!settings) {
      setOrders(mockOrders);
      setTotalPages(1);
      return;
    }

    if(showLoading) setLoading(true);
    try {
      const { data, totalPages } = await fetchWooOrders(page, 12);
      setOrders(data);
      setTotalPages(totalPages);
      setIsSynced(true);
    } catch (err) {
      console.error(err);
      if (showLoading) {
        setOrders(mockOrders);
        setIsSynced(false);
        setTotalPages(1);
      }
    } finally {
      if(showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(true);

    // Poll for order changes every 15s
    pollingRef.current = setInterval(() => {
        loadOrders(false);
    }, 15000);

    return () => {
        if(pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [page]);

  const handleStatusChange = async (orderId: string, rawId: string | undefined, newStatus: string) => {
      // Use rawId if available (real woo ID), else parse orderId
      const realId = rawId || orderId.replace('#ORD-', '');
      setUpdatingId(orderId);
      
      const settings = getWooSettings();
      if(!settings) {
          // Mock update
          setOrders(orders.map(o => o.id === orderId ? {...o, status: newStatus as any} : o));
          setUpdatingId(null);
          return;
      }

      try {
          await updateWooOrderStatus(realId, newStatus);
          // Optimistic Update
          setOrders(orders.map(o => o.id === orderId ? {...o, status: newStatus as any} : o));
          // Refresh in background
          loadOrders(false);
      } catch(e) {
          alert("Failed to update status on WooCommerce");
      } finally {
          setUpdatingId(null);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
         <div>
             <h2 className="text-2xl font-bold text-kp-black">Recent Orders</h2>
             <p className="text-xs text-gray-500 mt-1">
                 {loading ? 'Syncing...' : isSynced ? <><span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span> Live Sync Active</> : 'Displaying Local/Mock Data'}
             </p>
         </div>
         <button onClick={() => loadOrders(true)} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
         </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && orders.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading orders...</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-kp-black">{order.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.customerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.items} items</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">৳ {order.total.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block text-left">
                        {updatingId === order.id ? (
                            <span className="text-xs text-gray-500 animate-pulse">Updating...</span>
                        ) : isViewer ? (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {order.status}
                           </span>
                        ) : (
                            <select 
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, (order as any).rawId, e.target.value)}
                                className={`appearance-none cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border-0 focus:ring-0
                                ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                            >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        )}
                    </div>
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
    </div>
  );
};

export default Orders;