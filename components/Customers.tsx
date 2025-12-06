import React, { useEffect, useState, useRef } from 'react';
import { Customer } from '../types';
import { fetchWooCustomers, getWooSettings } from '../services/wooService';
import { IconRefresh, IconChevronLeft, IconChevronRight } from './Icons';

const mockCustomers: Customer[] = [
    { id: '1', name: 'Fahim Ahmed', email: 'fahim@example.com', totalOrders: 12, totalSpent: 45000, lastActive: '2 mins ago' },
    { id: '2', name: 'Sarah Khan', email: 'sarah.k@example.com', totalOrders: 5, totalSpent: 12500, lastActive: '1 day ago' },
    { id: '3', name: 'Tanvir Hasan', email: 'tanvir@example.com', totalOrders: 22, totalSpent: 89000, lastActive: '3 hours ago' },
];

const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadCustomers = async (showLoading = true) => {
        const settings = getWooSettings();
        if (!settings) {
            setCustomers(mockCustomers);
            setTotalPages(1);
            return;
        }

        if(showLoading) setLoading(true);
        try {
            const { data, totalPages } = await fetchWooCustomers(page, 12);
            setCustomers(data);
            setTotalPages(totalPages);
            setIsSynced(true);
        } catch (err) {
            console.error(err);
            if(showLoading) {
                setCustomers(mockCustomers);
                setIsSynced(false);
                setTotalPages(1);
            }
        } finally {
            if(showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers(true);
        
        // Poll every 15s
        pollingRef.current = setInterval(() => {
            loadCustomers(false);
        }, 15000);

        return () => {
            if(pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [page]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-kp-black">Customer Database</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {loading ? 'Syncing...' : isSynced ? <><span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span> Live Sync Active</> : 'Displaying Local/Mock Data'}
                    </p>
                </div>
                <button onClick={() => loadCustomers(true)} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
                    <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            {loading && customers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Loading customers...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customers.map(customer => (
                        <div key={customer.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-kp-red to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                    {customer.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-gray-900 truncate">{customer.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-500 text-xs">Total Spent</p>
                                    <p className="font-semibold text-gray-900">৳ {customer.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-gray-500 text-xs">Total Orders</p>
                                    <p className="font-semibold text-gray-900">{customer.totalOrders}</p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                <span>Last active: {customer.lastActive}</span>
                                <button className="text-kp-red hover:underline">View Profile</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Pagination Controls */}
            {customers.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-gray-100">
                    <button 
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="flex items-center px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                        className="flex items-center px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Next
                        <IconChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default Customers;