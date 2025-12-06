
export interface Variation {
  id: string;
  attributes: { name: string; option: string }[];
  price: number;
  regularPrice: number;
  salePrice: number | null;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Effective current price
  regularPrice: number;
  salePrice: number | null;
  stock: number;
  category: string;
  image: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  type: 'simple' | 'variable' | 'grouped' | 'external';
}

export interface Order {
  id: string;
  customerName: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  items: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastActive: string;
}

export interface DashboardStats {
  totalRevenue: number;
  activeOrders: number;
  totalCustomers: number;
  monthlyGrowth: number;
}

export type UserRole = 'admin' | 'viewer';

export interface User {
  username: string;
  role: UserRole;
  name: string;
}
