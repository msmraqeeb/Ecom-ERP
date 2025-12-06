import React, { useState, useEffect } from 'react';
import { IconCheck, IconSettings } from './Icons';
import { getWooSettings, saveWooSettings, WooSettings } from '../services/wooService';
import { UserRole } from '../types';

interface SettingsProps {
  role: UserRole;
}

const Settings = ({ role }: SettingsProps) => {
  const [settings, setSettings] = useState<WooSettings>({
    url: '',
    consumerKey: '',
    consumerSecret: ''
  });
  const [saved, setSaved] = useState(false);
  
  const isViewer = role === 'viewer';

  useEffect(() => {
    const stored = getWooSettings();
    if (stored) setSettings(stored);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if(isViewer) return;
    
    saveWooSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-kp-black flex items-center gap-3">
        <IconSettings className="w-8 h-8 text-kp-red" />
        Connect WooCommerce
      </h2>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
        {isViewer && (
           <div className="mb-6 bg-blue-50 text-blue-600 text-sm p-3 rounded-lg border border-blue-100">
              You are in <b>Viewer Mode</b>. Settings are read-only.
           </div>
        )}
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Enter your WooCommerce store details below to synchronize Products, Orders, and Customers. 
          You can generate API Keys in your WordPress Admin at <br/>
          <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">WooCommerce &gt; Settings &gt; Advanced &gt; REST API</span>.
        </p>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Store URL</label>
            <input 
              type="url" 
              placeholder="https://kidsparadise.com.bd"
              value={settings.url}
              onChange={(e) => setSettings({...settings, url: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
              disabled={isViewer}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Consumer Key</label>
            <input 
              type="text" 
              placeholder="ck_..."
              value={settings.consumerKey}
              onChange={(e) => setSettings({...settings, consumerKey: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none transition-all font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
              disabled={isViewer}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Consumer Secret</label>
            <input 
              type="password" 
              placeholder="cs_..."
              value={settings.consumerSecret}
              onChange={(e) => setSettings({...settings, consumerSecret: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-kp-red focus:ring-1 focus:ring-kp-red outline-none transition-all font-mono text-sm disabled:bg-gray-50 disabled:text-gray-500"
              disabled={isViewer}
            />
          </div>

          <div className="pt-4 flex items-center space-x-4">
            {!isViewer && (
              <button 
                type="submit" 
                className="px-8 py-3 bg-kp-red text-white font-medium rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200 flex items-center"
              >
                {saved && <IconCheck className="w-5 h-5 mr-2" />}
                {saved ? 'Settings Saved' : 'Save Connection'}
              </button>
            )}
            {saved && <span className="text-sm text-green-600 animate-fade-in">Ready to sync!</span>}
          </div>
        </form>

        {!isViewer && (
          <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-100">
             <strong>Note:</strong> If you are testing this from a browser environment, you may need to enable CORS on your WordPress server or use a proxy. 
             If the sync fails, check the console for CORS errors.
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;