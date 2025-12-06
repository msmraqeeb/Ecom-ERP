import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IconShoppingBag, IconUsers, IconBox, IconRefresh } from './Icons';
import { fetchWooOrders, fetchWooCustomers, getWooSettings } from '../services/wooService';
import { Order } from '../types';

const mockChartData = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 5000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-kp-black mt-1">{value}</h3>
      <p className={`text-xs mt-2 ${subtext.startsWith('+') ? 'text-green-500' : 'text-gray-400'}`}>
        {subtext}
      </p>
    </div>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0 });
  const [chartData, setChartData] = useState(mockChartData);
  const [loading, setLoading] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to process orders into daily sales for the last 7 days
  const processChartData = (orders: Order[]) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i)); // Go back from today
          return d.toISOString().split('T')[0]; // YYYY-MM-DD
      });

      const salesMap = new Map<string, number>();
      last7Days.forEach(date => salesMap.set(date, 0));

      orders.forEach(order => {
          // Filter out cancelled orders from revenue
          if (order.status !== 'cancelled' && salesMap.has(order.date)) {
              salesMap.set(order.date, (salesMap.get(order.date) || 0) + order.total);
          }
      });

      return last7Days.map(dateStr => {
          const date = new Date(dateStr);
          return {
              name: days[date.getDay()],
              sales: salesMap.get(dateStr) || 0,
              date: dateStr
          };
      });
  };

  const loadData = async (showLoading = true) => {
      const settings = getWooSettings();
      if(!settings) {
          // Use defaults/mock if no settings
          setStats({ revenue: 42500, orders: 156, customers: 48 });
          setChartData(mockChartData);
          return;
      }

      if (showLoading) setLoading(true);
      
      try {
          // Fetch larger batch (100) to ensure we cover the last week of activity
          const [ordersRes, customersRes] = await Promise.all([
             fetchWooOrders(1, 100),
             fetchWooCustomers(1, 100)
          ]);

          const orders = ordersRes.data;
          const customers = customersRes.data;

          // Calculate Stats
          const validOrders = orders.filter(o => o.status !== 'cancelled');
          const totalRevenue = validOrders.reduce((acc, curr) => acc + curr.total, 0);
          const activeOrders = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
          
          setStats({
              revenue: totalRevenue,
              orders: activeOrders,
              customers: customers.length
          });

          // Calculate Chart Data
          const realTimeChartData = processChartData(orders);
          setChartData(realTimeChartData);

          setIsSynced(true);
      } catch (e) {
          console.error("Dashboard sync failed", e);
          if (!isSynced) {
              setStats({ revenue: 0, orders: 0, customers: 0 });
          }
      } finally {
          if (showLoading) setLoading(false);
      }
  };

  useEffect(() => {
    loadData(true);

    // Poll for updates every 15 seconds
    pollingRef.current = setInterval(() => {
        loadData(false);
    }, 15000);

    return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-kp-black">Dashboard Overview</h2>
            {isSynced && <p className="text-xs text-green-600 mt-1 flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span> Live Sync Active</p>}
        </div>
        
        <div className="flex space-x-2">
            <button onClick={() => loadData(true)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors">
                 <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <span className="bg-white px-4 py-2 rounded-full text-sm font-medium text-gray-600 shadow-sm border border-gray-100 flex items-center">
                Last 7 Days
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Revenue (Recent)" 
          value={`৳ ${stats.revenue.toLocaleString()}`} 
          subtext="Based on last 100 orders" 
          icon={IconShoppingBag} 
          color="bg-kp-red" 
        />
        <StatCard 
          title="Active Orders" 
          value={stats.orders} 
          subtext="Pending & Processing" 
          icon={IconBox} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Total Customers" 
          value={stats.customers} 
          subtext="Registered Users" 
          icon={IconUsers} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-kp-black mb-4">Revenue Analytics (Last 7 Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F0284D" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F0284D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip 
                  formatter={(value: number) => [`৳ ${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#F0284D" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;