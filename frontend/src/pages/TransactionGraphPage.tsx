import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge } from '../components/common/RiskBadge';
import type { RiskLevel } from '../components/common/RiskBadge';
import { LoadingState, ErrorState } from '../components/common/StateFeedback';
import {
  Search,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wallet,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Copy,
  Check,
  Waypoints,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Play
} from 'lucide-react';
import type { PageRoute } from '../components/layout/Sidebar';
import { apiClient } from '../api/client';

export interface NodeIndicatorSummary {
  code: string;
  title: string;
  severity: string;
  evidence: string;
  source: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'WALLET' | 'CONTRACT';
  isContract: boolean;
  balanceEth: string;
  txCount: number;
  riskScore: number;
  riskSeverity: RiskLevel;
  hasIndicator: boolean;
  indicators: NodeIndicatorSummary[];
  metadata: {
    isCenter?: boolean;
    classification?: string;
    verifiedInRegistry?: boolean;
  };
  // Visual layout coordinates
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationshipType: 'SENT_NATIVE' | 'RECEIVED_NATIVE' | 'TOKEN_TRANSFER' | 'CONTRACT_INTERACTION';
  txHash: string;
  blockNumber: number;
  timestamp: string;
  valueEth: number;
  tokenContract?: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  functionName?: string;
  network: string;
}

export interface GraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  walletCount: number;
  contractCount: number;
  directCounterparties: number;
  inDegree: number;
  outDegree: number;
  nativeTransfersCount: number;
  tokenTransfersCount: number;
  contractInteractionsCount: number;
}

export interface PathExplorationResult {
  sourceAddress: string;
  targetAddress: string;
  pathFound: boolean;
  hops: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  explanation: string;
  disclaimer: string;
}

export interface TransactionGraphPageProps {
  initialCenterAddress?: string;
  onNavigate?: (page: PageRoute, params?: Record<string, any>) => void;
}

export const TransactionGraphPage: React.FC<TransactionGraphPageProps> = ({
  initialCenterAddress,
  onNavigate
}) => {
  const [searchAddress, setSearchAddress] = useState(
    initialCenterAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  );
  const [activeAddress, setActiveAddress] = useState(
    initialCenterAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  );

  // Sync external initial props
  useEffect(() => {
    if (initialCenterAddress && initialCenterAddress !== activeAddress) {
      setSearchAddress(initialCenterAddress);
      setActiveAddress(initialCenterAddress);
      fetchGraph(initialCenterAddress, depth, nodeFilter, edgeFilter);
    }
  }, [initialCenterAddress]);

  // Filters
  const [depth, setDepth] = useState<number>(2);
  const [nodeFilter, setNodeFilter] = useState<'ALL' | 'WALLETS' | 'CONTRACTS'>('ALL');
  const [edgeFilter, setEdgeFilter] = useState<'ALL' | 'NATIVE' | 'TOKEN' | 'CONTRACT_CALL'>('ALL');

  // Graph Data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [analytics, setAnalytics] = useState<GraphAnalytics | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Path Exploration
  const [showPathExplorer, setShowPathExplorer] = useState<boolean>(false);
  const [pathSource, setPathSource] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [pathTarget, setPathTarget] = useState('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
  const [pathMaxDepth, setPathMaxDepth] = useState<number>(3);
  const [pathLoading, setPathLoading] = useState<boolean>(false);
  const [pathResult, setPathResult] = useState<PathExplorationResult | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  // Canvas Viewport Pan & Zoom
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const demoPresets = [
    { label: 'Wallet A (User)', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', type: 'WALLET' },
    { label: 'Wallet B (Counterparty)', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', type: 'WALLET' },
    { label: 'Wallet C (Tertiary)', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', type: 'WALLET' },
    { label: 'Deployer (Local)', address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', type: 'WALLET' },
    { label: 'MockERC20 (SHLD)', address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', type: 'CONTRACT' },
    { label: 'SafeVault (Escrow)', address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0', type: 'CONTRACT' },
    { label: 'Dangerous Spender', address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707', type: 'CONTRACT' }
  ];

  const fetchGraph = async (centerAddr: string, currentDepth: number, nFilter: string, eFilter: string) => {
    const trimmed = centerAddr.trim();
    if (!trimmed || !trimmed.startsWith('0x') || trimmed.length !== 42) {
      setError('Please provide a valid 42-character hexadecimal EVM address (e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getTransactionGraph(trimmed, {
        depth: currentDepth,
        nodeType: nFilter,
        edgeType: eFilter,
        chainId: 31337
      });

      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setAnalytics(data.analytics || null);
      setDisclaimer(data.disclaimer || '');
      setActiveAddress(trimmed);

      // Auto-select center node
      const center = data.nodes?.find((n: GraphNode) => n.id.toLowerCase() === trimmed.toLowerCase());
      if (center) {
        setSelectedNode(center);
        setSelectedEdge(null);
      }
    } catch (err: any) {
      console.warn('Backend /api/address/{address}/graph unavailable, using fallback topology:', err);
      setError('Could not connect to ChainShield backend. Ensure backend is running at http://localhost:8080');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph(activeAddress, depth, nodeFilter, edgeFilter);
  }, [depth, nodeFilter, edgeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGraph(searchAddress, depth, nodeFilter, edgeFilter);
  };

  const handlePresetSelect = (presetAddress: string) => {
    setSearchAddress(presetAddress);
    fetchGraph(presetAddress, depth, nodeFilter, edgeFilter);
  };

  const handleResetDemoGraph = async () => {
    try {
      await apiClient.seedDemoGraph();
      fetchGraph(activeAddress, depth, nodeFilter, edgeFilter);
    } catch (e) {
      console.error('Failed to trigger demo graph reset:', e);
    }
  };

  // Execute Path Exploration
  const handleTracePath = async (e: React.FormEvent) => {
    e.preventDefault();
    setPathLoading(true);
    setPathError(null);
    try {
      const data = await apiClient.explorePath({
        sourceAddress: pathSource.trim(),
        targetAddress: pathTarget.trim(),
        maxDepth: pathMaxDepth
      });
      setPathResult(data);
    } catch (err: any) {
      setPathError(err.message || 'Path exploration failed');
    } finally {
      setPathLoading(false);
    }
  };

  // Node Positioning (Center-out Radial Layout)
  const positionedNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];

    const width = 800;
    const height = 600;
    const cx = width / 2;
    const cy = height / 2;

    const centerLower = activeAddress.toLowerCase();
    const otherNodes = nodes.filter(n => n.id.toLowerCase() !== centerLower);
    const centerNode = nodes.find(n => n.id.toLowerCase() === centerLower) || nodes[0];

    const result: GraphNode[] = [];

    // Position center
    if (centerNode) {
      result.push({
        ...centerNode,
        x: cx,
        y: cy
      });
    }

    // Partition remaining nodes into depth 1 (directly connected to center) and depth 2
    const directNeighborIds = new Set<string>();
    edges.forEach(e => {
      if (e.from.toLowerCase() === centerLower) directNeighborIds.add(e.to.toLowerCase());
      if (e.to.toLowerCase() === centerLower) directNeighborIds.add(e.from.toLowerCase());
    });

    const ring1 = otherNodes.filter(n => directNeighborIds.has(n.id.toLowerCase()));
    const ring2 = otherNodes.filter(n => !directNeighborIds.has(n.id.toLowerCase()));

    // Place Ring 1 (Radius 180)
    const r1 = 180;
    ring1.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / (ring1.length || 1) - Math.PI / 2;
      result.push({
        ...node,
        x: cx + r1 * Math.cos(angle),
        y: cy + r1 * Math.sin(angle)
      });
    });

    // Place Ring 2 (Radius 280)
    const r2 = 280;
    ring2.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / (ring2.length || 1) - Math.PI / 2 + (Math.PI / 6);
      result.push({
        ...node,
        x: cx + r2 * Math.cos(angle),
        y: cy + r2 * Math.sin(angle)
      });
    });

    return result;
  }, [nodes, edges, activeAddress]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    positionedNodes.forEach(n => map.set(n.id.toLowerCase(), n));
    return map;
  }, [positionedNodes]);

  // Copy to clipboard helper
  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pan & Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 2.5));
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Address Search Bar */}
      <div className="p-6 rounded-2xl bg-shield-900 border border-shield-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-shield-cyan/10 text-shield-cyan border border-shield-cyan/30 font-semibold flex items-center gap-1">
                <Waypoints className="w-3 h-3" />
                FORENSIC TOPOLOGY
              </span>
              <span className="text-xs text-slate-400">Hardhat Local EVM (31337)</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Blockchain Transaction Graph & Address Intelligence
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Inspect multi-hop on-chain relationships, detect known malicious counterparts, decode token flows, and explore transaction paths with evidence-backed traceability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPathExplorer(!showPathExplorer)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                showPathExplorer
                  ? 'bg-shield-cyan/20 border-shield-cyan text-shield-cyan'
                  : 'bg-shield-800 border-shield-700 text-slate-300 hover:bg-shield-750'
              }`}
            >
              <Waypoints className="w-3.5 h-3.5" />
              <span>{showPathExplorer ? 'Close Path Explorer' : 'Explore Path'}</span>
            </button>
            <button
              onClick={handleResetDemoGraph}
              title="Reset deterministic demo dataset"
              className="p-2 rounded-lg bg-shield-800 hover:bg-shield-750 text-slate-300 border border-shield-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo Topology</span>
            </button>
          </div>
        </div>

        {/* Address Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Search EVM address (0x...) to center transaction graph..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-shield-950 border border-shield-750 text-slate-200 text-xs font-mono focus:outline-none focus:border-shield-cyan transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Center Graph</span>
          </button>
        </form>

        {/* Demo Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            Demo Nodes:
          </span>
          {demoPresets.map((p) => (
            <button
              key={p.address}
              onClick={() => handlePresetSelect(p.address)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                activeAddress.toLowerCase() === p.address.toLowerCase()
                  ? 'bg-shield-cyan/20 border-shield-cyan text-shield-cyan font-bold shadow-sm shadow-shield-cyan/20'
                  : 'bg-shield-950/80 border-shield-800 text-slate-300 hover:border-shield-700 hover:text-white'
              }`}
            >
              {p.type === 'WALLET' ? <Wallet className="w-2.5 h-2.5 text-shield-cyan" /> : <FileCode className="w-2.5 h-2.5 text-purple-400" />}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Path Exploration Drawer (Expandable) */}
      {showPathExplorer && (
        <Card
          title="On-Chain Path Explorer"
          subtitle="Discover shortest multi-hop transaction relationship between two entities in the recorded dataset."
        >
          <form onSubmit={handleTracePath} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Source Address</label>
                <input
                  type="text"
                  value={pathSource}
                  onChange={(e) => setPathSource(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-lg bg-shield-950 border border-shield-750 text-slate-200 text-xs font-mono focus:border-shield-cyan"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Address</label>
                <input
                  type="text"
                  value={pathTarget}
                  onChange={(e) => setPathTarget(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 rounded-lg bg-shield-950 border border-shield-750 text-slate-200 text-xs font-mono focus:border-shield-cyan"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Max Hops (Depth)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={pathMaxDepth}
                    onChange={(e) => setPathMaxDepth(Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-lg bg-shield-950 border border-shield-750 text-slate-200 text-xs font-semibold focus:border-shield-cyan"
                  >
                    <option value={1}>1 Hop (Direct Only)</option>
                    <option value={2}>2 Hops</option>
                    <option value={3}>3 Hops (Recommended)</option>
                    <option value={4}>4 Hops</option>
                  </select>
                  <button
                    type="submit"
                    disabled={pathLoading}
                    className="px-4 py-2 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {pathLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Waypoints className="w-3.5 h-3.5" />}
                    <span>Trace</span>
                  </button>
                </div>
              </div>
            </div>

            {pathError && <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30">{pathError}</div>}

            {pathResult && (
              <div className="p-4 rounded-xl bg-shield-950 border border-shield-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      pathResult.pathFound ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {pathResult.pathFound ? `PATH DISCOVERED (${pathResult.hops} HOPS)` : 'NO PATH DISCOVERED'}
                    </span>
                    <span className="text-xs text-slate-300">{pathResult.explanation}</span>
                  </div>
                </div>

                {pathResult.pathFound && pathResult.nodes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {pathResult.nodes.map((node, idx) => (
                      <React.Fragment key={node.id}>
                        <div
                          onClick={() => {
                            setSearchAddress(node.id);
                            fetchGraph(node.id, depth, nodeFilter, edgeFilter);
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-shield-900 border border-shield-700 hover:border-shield-cyan text-xs flex items-center gap-2 group transition-all"
                        >
                          {node.isContract ? <FileCode className="w-3 h-3 text-purple-400" /> : <Wallet className="w-3 h-3 text-shield-cyan" />}
                          <span className="font-semibold text-slate-200 group-hover:text-white">{node.label}</span>
                          <span className="text-[10px] font-mono text-slate-500">{node.id.slice(0, 6)}...</span>
                        </div>
                        {idx < pathResult.nodes.length - 1 && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <span className="text-[10px] font-mono bg-shield-850 px-1.5 py-0.5 rounded text-slate-400">
                              {pathResult.edges[idx]?.relationshipType || 'INTERACTS'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-shield-cyan" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic border-t border-shield-850 pt-2">
                  {pathResult.disclaimer}
                </p>
              </div>
            )}
          </form>
        </Card>
      )}

      {/* 3. Graph Filter Bar & Analytics Summary */}
      <div className="p-4 rounded-xl bg-shield-900/90 border border-shield-800 flex flex-wrap items-center justify-between gap-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-shield-950 px-2 py-1.5 rounded-lg border border-shield-800">
            <span className="text-[11px] font-semibold text-slate-400">Depth:</span>
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  depth === d
                    ? 'bg-shield-cyan text-shield-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-shield-950 px-2 py-1.5 rounded-lg border border-shield-800">
            <span className="text-[11px] font-semibold text-slate-400">Nodes:</span>
            {(['ALL', 'WALLETS', 'CONTRACTS'] as const).map((nf) => (
              <button
                key={nf}
                onClick={() => setNodeFilter(nf)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                  nodeFilter === nf
                    ? 'bg-shield-800 text-white border border-shield-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {nf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-shield-950 px-2 py-1.5 rounded-lg border border-shield-800">
            <span className="text-[11px] font-semibold text-slate-400">Edges:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NATIVE', label: 'Native ETH' },
              { id: 'TOKEN', label: 'Tokens' },
              { id: 'CONTRACT_CALL', label: 'Contract Calls' }
            ].map((ef) => (
              <button
                key={ef.id}
                onClick={() => setEdgeFilter(ef.id as any)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                  edgeFilter === ef.id
                    ? 'bg-shield-800 text-white border border-shield-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ef.label}
              </button>
            ))}
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale(s => Math.min(s + 0.15, 2.5))}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-shield-800 hover:bg-shield-750 text-slate-300 border border-shield-700"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(s - 0.15, 0.4))}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-shield-800 hover:bg-shield-750 text-slate-300 border border-shield-700"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Reset Pan & Zoom"
            className="p-1.5 rounded-lg bg-shield-800 hover:bg-shield-750 text-slate-300 border border-shield-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Analytics Summary Badges */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Total Nodes</span>
            <span className="text-base font-bold text-white font-mono">{analytics.totalNodes}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Total Edges</span>
            <span className="text-base font-bold text-shield-cyan font-mono">{analytics.totalEdges}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Wallets</span>
            <span className="text-base font-bold text-blue-400 font-mono">{analytics.walletCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Contracts</span>
            <span className="text-base font-bold text-purple-400 font-mono">{analytics.contractCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Direct Counterparties</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{analytics.directCounterparties}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">In / Out Degree</span>
            <span className="text-base font-bold text-slate-200 font-mono">{analytics.inDegree} / {analytics.outDegree}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Native Transfers</span>
            <span className="text-base font-bold text-cyan-400 font-mono">{analytics.nativeTransfersCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-shield-900 border border-shield-800 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">Token Transfers</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{analytics.tokenTransfersCount}</span>
          </div>
        </div>
      )}

      {/* 4. Main Topology Graph + Details Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topology SVG Canvas */}
        <div className="lg:col-span-2 relative h-[540px] rounded-2xl bg-shield-950 border border-shield-800 overflow-hidden shadow-2xl select-none">
          {/* Cyberpunk Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#151c2e_1px,transparent_1px),linear-gradient(to_bottom,#151c2e_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>

          {loading && (
            <div className="absolute inset-0 bg-shield-950/80 backdrop-blur-sm z-30 flex items-center justify-center">
              <LoadingState message="Constructing forensic transaction topology from EVM blocks..." />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-shield-950/90 z-30 flex items-center justify-center p-6">
              <ErrorState title="Graph Generation Failed" message={error} onRetry={() => fetchGraph(activeAddress, depth, nodeFilter, edgeFilter)} />
            </div>
          )}

          {/* Interactive SVG */}
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Arrow Markers */}
              <marker id="arrow-native" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
              </marker>
              <marker id="arrow-token" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
              <marker id="arrow-contract" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
              </marker>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
              {/* Render Connecting Edges */}
              {edges.map((edge) => {
                const fromNode = nodeMap.get(edge.from.toLowerCase());
                const toNode = nodeMap.get(edge.to.toLowerCase());
                if (!fromNode || !toNode || fromNode.x === undefined || fromNode.y === undefined || toNode.x === undefined || toNode.y === undefined) {
                  return null;
                }

                const isSelected = selectedEdge?.id === edge.id;
                const edgeColor =
                  edge.relationshipType === 'TOKEN_TRANSFER'
                    ? '#10b981'
                    : edge.relationshipType === 'CONTRACT_INTERACTION'
                    ? '#a855f7'
                    : '#06b6d4';

                const markerId =
                  edge.relationshipType === 'TOKEN_TRANSFER'
                    ? 'url(#arrow-token)'
                    : edge.relationshipType === 'CONTRACT_INTERACTION'
                    ? 'url(#arrow-contract)'
                    : 'url(#arrow-native)';

                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                return (
                  <g
                    key={edge.id}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(edge);
                      setSelectedNode(null);
                    }}
                  >
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={edgeColor}
                      strokeWidth={isSelected ? 3.5 : 1.8}
                      strokeDasharray={edge.relationshipType === 'CONTRACT_INTERACTION' ? '4 2' : undefined}
                      markerEnd={markerId}
                      className="transition-all hover:stroke-white"
                    />
                    {/* Edge Label Pill */}
                    <rect
                      x={midX - 28}
                      y={midY - 8}
                      width="56"
                      height="16"
                      rx="4"
                      fill="#0b1120"
                      stroke={isSelected ? '#ffffff' : edgeColor}
                      strokeWidth="1"
                      className="opacity-90"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fill={isSelected ? '#ffffff' : edgeColor}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {edge.tokenSymbol ? `${edge.tokenAmount || ''} ${edge.tokenSymbol}` : edge.functionName ? `${edge.functionName}()` : `${edge.valueEth} ETH`}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {positionedNodes.map((node) => {
                const isCenter = node.id.toLowerCase() === activeAddress.toLowerCase();
                const isSelected = selectedNode?.id.toLowerCase() === node.id.toLowerCase();

                let strokeColor = '#334155';
                if (node.hasIndicator || node.riskSeverity === 'CRITICAL') {
                  strokeColor = '#f43f5e';
                } else if (node.riskSeverity === 'HIGH') {
                  strokeColor = '#f97316';
                } else if (isCenter) {
                  strokeColor = '#06b6d4';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                  >
                    {/* Center Node Glow */}
                    {isCenter && (
                      <circle
                        r="32"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className="animate-spin"
                        style={{ animationDuration: '10s' }}
                      />
                    )}

                    {/* Threat Indicator Pulsing Ring */}
                    {node.hasIndicator && (
                      <circle
                        r="28"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    )}

                    {/* Main Node Body */}
                    {node.isContract ? (
                      <rect
                        x="-20"
                        y="-20"
                        width="40"
                        height="40"
                        rx="8"
                        fill="#0f172a"
                        stroke={isSelected ? '#38bdf8' : strokeColor}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-transform group-hover:scale-110"
                      />
                    ) : (
                      <circle
                        r="22"
                        fill="#0f172a"
                        stroke={isSelected ? '#38bdf8' : strokeColor}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-transform group-hover:scale-110"
                      />
                    )}

                    {/* Node Icon */}
                    <text
                      y="4"
                      textAnchor="middle"
                      fill={node.isContract ? '#c084fc' : '#38bdf8'}
                      fontSize="11"
                      fontWeight="bold"
                      className="pointer-events-none select-none font-mono"
                    >
                      {node.isContract ? '⚙' : '👤'}
                    </text>

                    {/* Node Label */}
                    <text
                      y="34"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                    >
                      {node.label}
                    </text>

                    {/* Truncated Address */}
                    <text
                      y="45"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontFamily="monospace"
                      className="pointer-events-none select-none"
                    >
                      {node.id.slice(0, 6)}...{node.id.slice(-4)}
                    </text>

                    {/* Indicator Warning Flag */}
                    {node.hasIndicator && (
                      <g transform="translate(14, -20)">
                        <circle r="7" fill="#f43f5e" />
                        <text y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">!</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Canvas Legend */}
          <div className="absolute bottom-3 left-3 bg-shield-900/90 backdrop-blur-md p-2 rounded-lg border border-shield-800 text-[10px] space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <span className="text-slate-300">Wallet (EOA)</span>
              <span className="w-2.5 h-2.5 rounded bg-purple-400 ml-2"></span>
              <span className="text-slate-300">Contract</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-shield-800">
              <span className="w-3 h-0.5 bg-cyan-400"></span>
              <span className="text-slate-400">Native ETH</span>
              <span className="w-3 h-0.5 bg-emerald-400 ml-2"></span>
              <span className="text-slate-400">Token</span>
              <span className="w-3 h-0.5 bg-purple-400 ml-2 border-dashed"></span>
              <span className="text-slate-400">Contract Call</span>
            </div>
          </div>
        </div>

        {/* 5. Selected Inspector Sidepanel (Node or Edge) */}
        <div className="space-y-4">
          {selectedNode ? (
            <div className="p-5 rounded-2xl bg-shield-900 border border-shield-800 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-2 border-b border-shield-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedNode.isContract ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {selectedNode.type}
                    </span>
                    {selectedNode.id.toLowerCase() === activeAddress.toLowerCase() && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-shield-cyan/10 text-shield-cyan border border-shield-cyan/30">
                        CENTER NODE
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedNode.label}</h3>
                </div>
                <RiskBadge level={selectedNode.riskSeverity} score={selectedNode.riskScore} />
              </div>

              {/* Address with Copy */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">EVM Address</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-shield-950 border border-shield-800 font-mono text-xs text-slate-200">
                  <span className="truncate mr-2">{selectedNode.id}</span>
                  <button
                    onClick={() => copyText(selectedNode.id, 'node-addr')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'node-addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Native Balance</span>
                  <span className="text-xs font-bold text-white font-mono">{selectedNode.balanceEth}</span>
                </div>
                <div className="p-3 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Transaction Count</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">{selectedNode.txCount} txs</span>
                </div>
              </div>

              {/* Evidence-Based Threat Indicators Overlay */}
              {selectedNode.hasIndicator ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Evidence Indicator Detected</span>
                  </div>
                  {selectedNode.indicators.map((ind, i) => (
                    <div key={i} className="text-[11px] text-slate-300 space-y-0.5 border-t border-rose-500/20 pt-1.5 first:border-0 first:pt-0">
                      <div className="font-semibold text-rose-300 flex items-center justify-between">
                        <span>{ind.title}</span>
                        <span className="text-[9px] font-mono text-slate-400">[{ind.code}]</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">{ind.evidence}</p>
                      <span className="text-[9px] font-mono text-slate-500 block">Source: {ind.source}</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-400 italic pt-1 border-t border-rose-500/20">
                    Note: An observed relationship alone does not imply guilt. Security indicators require concrete rule matches.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300">No active local threat registry flags on this node.</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-2 border-t border-shield-800 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setSearchAddress(selectedNode.id);
                    fetchGraph(selectedNode.id, depth, nodeFilter, edgeFilter);
                  }}
                  className="w-full py-2 rounded-xl bg-shield-800 hover:bg-shield-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-shield-700 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-shield-cyan" />
                  <span>Center Graph on This Address</span>
                </button>

                <button
                  onClick={() => onNavigate?.('investigation', { address: selectedNode.id })}
                  className="w-full py-2 rounded-xl bg-shield-cyan/15 hover:bg-shield-cyan/25 text-shield-cyan text-xs font-semibold flex items-center justify-center gap-1.5 border border-shield-cyan/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Investigation →</span>
                </button>

                {selectedNode.isContract ? (
                  <>
                    <button
                      onClick={() => onNavigate?.('contract-analyzer', { address: selectedNode.id })}
                      className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-purple-500/30 transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Inspect in Contract Analyzer →</span>
                    </button>
                    <button
                      onClick={() => onNavigate?.('transaction-analyzer', { to: selectedNode.id })}
                      className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Prepare Transaction to Contract →</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onNavigate?.('wallet-analyzer', { address: selectedNode.id })}
                    className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-blue-500/30 transition-colors"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Inspect in Wallet Analyzer →</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setPathSource(selectedNode.id);
                      setShowPathExplorer(true);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-shield-950 text-slate-400 hover:text-white border border-shield-800 text-[10px] font-semibold"
                  >
                    Set as Path Start
                  </button>
                  <button
                    onClick={() => {
                      setPathTarget(selectedNode.id);
                      setShowPathExplorer(true);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-shield-950 text-slate-400 hover:text-white border border-shield-800 text-[10px] font-semibold"
                  >
                    Set as Path Target
                  </button>
                </div>
              </div>
            </div>
          ) : selectedEdge ? (
            /* Selected Edge Inspector */
            <div className="p-5 rounded-2xl bg-shield-900 border border-shield-800 space-y-4 shadow-xl">
              <div className="border-b border-shield-800 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-shield-cyan/20 text-shield-cyan border border-shield-cyan/40">
                  {selectedEdge.relationshipType}
                </span>
                <h3 className="text-base font-bold text-white mt-1">Transaction Relationship</h3>
              </div>

              {/* Tx Hash */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Transaction Hash</label>
                <div className="flex items-center justify-between p-2 rounded-lg bg-shield-950 border border-shield-800 font-mono text-xs text-slate-200">
                  <span className="truncate mr-2">{selectedEdge.txHash}</span>
                  <button
                    onClick={() => copyText(selectedEdge.txHash, 'edge-tx')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'edge-tx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* From & To with Investigation buttons */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800 flex items-center justify-between">
                  <div className="min-w-0 mr-2">
                    <span className="text-[10px] text-slate-400 block font-medium">From Address</span>
                    <span className="text-xs font-mono text-slate-200 truncate block">{selectedEdge.from}</span>
                  </div>
                  <button
                    onClick={() => onNavigate?.('investigation', { address: selectedEdge.from })}
                    className="p-1 px-2 text-[10px] font-semibold rounded bg-shield-800 hover:bg-shield-750 text-shield-cyan border border-shield-700/60 shrink-0"
                  >
                    Investigate
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800 flex items-center justify-between">
                  <div className="min-w-0 mr-2">
                    <span className="text-[10px] text-slate-400 block font-medium">To Address</span>
                    <span className="text-xs font-mono text-slate-200 truncate block">{selectedEdge.to}</span>
                  </div>
                  <button
                    onClick={() => onNavigate?.('investigation', { address: selectedEdge.to })}
                    className="p-1 px-2 text-[10px] font-semibold rounded bg-shield-800 hover:bg-shield-750 text-shield-cyan border border-shield-700/60 shrink-0"
                  >
                    Investigate
                  </button>
                </div>
              </div>

              {/* Value / Token / Function Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Value / Amount</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {selectedEdge.tokenSymbol
                      ? `${selectedEdge.tokenAmount || ''} ${selectedEdge.tokenSymbol}`
                      : `${selectedEdge.valueEth} ETH`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Decoded Function</span>
                  <span className="text-xs font-bold text-purple-400 font-mono truncate block">
                    {selectedEdge.functionName || 'transfer()'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Block Number</span>
                  <span className="text-xs font-mono text-slate-300">#{selectedEdge.blockNumber || 1}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-shield-950 border border-shield-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Network</span>
                  <span className="text-xs font-mono text-slate-300 truncate block">{selectedEdge.network}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-shield-900 border border-shield-800 text-center space-y-2">
              <Waypoints className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">Select a Node or Edge</h4>
              <p className="text-xs text-slate-500">
                Click any node in the topology canvas to inspect balance, classification, and risk indicators, or click an edge to inspect decoded transactions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Standard Prototype Forensic Disclaimer */}
      <div className="p-4 rounded-xl bg-shield-900/60 border border-shield-800 text-slate-400 text-xs flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">Academic Prototype Notice: </span>
          {disclaimer ||
            'Observed edges represent historical on-chain transactions or events. A relationship between addresses does not imply fraud, shared ownership, or conspiracy. Risk evaluations are individual, evidence-grounded assessments on local testbed data.'}
        </div>
      </div>
    </div>
  );
};
