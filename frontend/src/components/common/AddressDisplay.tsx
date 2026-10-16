import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface AddressDisplayProps {
  address: string;
  classification?: 'EOA' | 'CONTRACT' | 'UNKNOWN';
  label?: string;
  truncate?: boolean;
  onNavigateInvestigation?: (address: string) => void;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  classification,
  label,
  truncate = true,
  onNavigateInvestigation,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedAddress = truncate && address.length >= 10
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : address;

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      {classification && (
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-semibold uppercase ${
            classification === 'CONTRACT'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : classification === 'EOA'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {classification}
        </span>
      )}

      {label && <span className="text-slate-400 font-sans">{label}:</span>}

      <span
        className="text-slate-200 select-all font-mono"
        title={address}
      >
        {formattedAddress}
      </span>

      <button
        onClick={handleCopy}
        className="p-1 text-slate-400 hover:text-shield-cyan rounded transition-colors"
        title="Copy full address"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>

      {onNavigateInvestigation && (
        <button
          onClick={() => onNavigateInvestigation(address)}
          className="p-1 text-slate-400 hover:text-shield-cyan rounded transition-colors"
          title="Open Unified Investigation"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
