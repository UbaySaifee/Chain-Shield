import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [rpcUrl, setRpcUrl] = useState('http://127.0.0.1:8545');
  const [backendUrl, setBackendUrl] = useState('http://localhost:8080/api/v1');
  const [analysisUrl, setAnalysisUrl] = useState('http://localhost:8000/api/v1');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card
        title="System Settings & Node Endpoints"
        subtitle="Manage local RPC connections, Spring Boot API parameters, and sandbox defaults."
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Local Hardhat EVM RPC URL
            </label>
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              className="w-full max-w-xl px-3 py-2 text-xs bg-shield-900 border border-shield-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-shield-cyan"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default local Hardhat node port: 8545 (Chain ID: 31337).</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Spring Boot Enterprise Backend URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full max-w-xl px-3 py-2 text-xs bg-shield-900 border border-shield-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-shield-cyan"
            />
            <p className="text-[11px] text-slate-500 mt-1">Standard backend REST gateway port: 8080.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Python Analysis Microservice URL
            </label>
            <input
              type="text"
              value={analysisUrl}
              onChange={(e) => setAnalysisUrl(e.target.value)}
              className="w-full max-w-xl px-3 py-2 text-xs bg-shield-900 border border-shield-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-shield-cyan"
            />
            <p className="text-[11px] text-slate-500 mt-1">FastAPI heuristics microservice port: 8000.</p>
          </div>

          <div className="pt-3 border-t border-shield-750 flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-shield-indigo hover:bg-shield-indigo/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
            {saved && (
              <span className="text-xs text-emerald-400 font-medium">✓ Configuration saved successfully!</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
