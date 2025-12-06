import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Orders from './components/Orders';
import Customers from './components/Customers';
import Settings from './components/Settings';
import Login from './components/Login';
import { IconDashboard, IconBox, IconUsers, IconShoppingBag, IconSettings } from './components/Icons';
import { User, UserRole } from './types';

type View = 'dashboard' | 'products' | 'orders' | 'customers' | 'settings';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (role: UserRole, username: string) => {
    setUser({
      username,
      role,
      name: role === 'admin' ? 'Admin User' : 'Viewer User'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
    { id: 'orders', label: 'Orders', icon: IconShoppingBag },
    { id: 'products', label: 'Products', icon: IconBox },
    { id: 'customers', label: 'Customers', icon: IconUsers },
  ];

  return (
    <div className="min-h-screen flex bg-[#F3F4F6] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-10 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-kp-black">Kids</span><span className="text-kp-red">Paradise</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Admin Portal</p>
        </div>
        
        <nav className="mt-6 px-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-kp-red text-white shadow-lg shadow-red-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-kp-black'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-kp-black'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-3 border-t border-gray-100">
           <button
                onClick={() => setCurrentView('settings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${currentView === 'settings' 
                    ? 'bg-gray-100 text-kp-black' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-kp-black'
                  }`}
              >
            <IconSettings className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
            <span className="font-medium text-sm">Settings</span>
          </button>
        </div>

        <div className="p-6">
           <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                  {user.role === 'admin' ? 'AD' : 'VW'}
              </div>
              <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate capitalize">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">
                Logout
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto h-screen">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm">
           <span className="font-bold text-kp-red">KidsParadise</span>
           <div className="flex space-x-2">
             {navItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={`p-2 rounded-lg ${currentView === item.id ? 'bg-kp-red text-white' : 'bg-gray-100'}`}
                >
                  <item.icon className="w-5 h-5" />
                </button>
             ))}
             <button 
               onClick={() => setCurrentView('settings')}
               className={`p-2 rounded-lg ${currentView === 'settings' ? 'bg-kp-red text-white' : 'bg-gray-100'}`}
             >
               <IconSettings className="w-5 h-5" />
             </button>
             <button onClick={handleLogout} className="p-2 rounded-lg bg-gray-100 text-red-500 text-xs font-bold">
               Logout
             </button>
           </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'products' && <Products role={user.role} />}
          {currentView === 'orders' && <Orders role={user.role} />}
          {currentView === 'customers' && <Customers />}
          {currentView === 'settings' && <Settings role={user.role} />}
        </div>
      </main>
    </div>
  );
};

export default App;