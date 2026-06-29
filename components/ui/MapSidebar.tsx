'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Radio } from 'lucide-react';
import { useMapStore } from '@/store/useMapStore';
import { useDashboardStore } from '@/store/useDashboardStore';

export default function MapSidebar() {
  const nodes = useMapStore((s) => s.nodes);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const activeSection = useMapStore((s) => s.activeSection);
  const setActiveSection = useMapStore((s) => s.setActiveSection);
  const openViewer = useMapStore((s) => s.openViewer);
  const isLoading = useMapStore((s) => s.isLoading);
  const mapInstance = useDashboardStore((s) => s.mapInstance);

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Extract unique locations from nodes to display in the log.
  const uniqueLocations = useMemo(() => {
    const locMap = new Map();
    nodes.forEach(node => {
      if (!locMap.has(node.locationName)) {
        locMap.set(node.locationName, node);
      }
    });
    return Array.from(locMap.values());
  }, [nodes]);

  const filteredLocations = useMemo(() => {
    return uniqueLocations.filter(loc => {
      const matchesSearch = loc.locationName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesSection = true;
      if (activeSection !== 'ALL') {
        matchesSection = loc.section === activeSection;
      }
      
      return matchesSearch && matchesSection;
    });
  }, [uniqueLocations, searchQuery, activeSection]);

  const handleLocationClick = (loc: any) => {
    const mapAny = mapInstance as any;
    mapAny._isFlying = true;
    mapInstance.flyTo({
      center: [loc.coordinates[0], loc.coordinates[1]],
      zoom: 21, // Deep zoom (seperti yang diminta)
      pitch: 60,
      padding: { left: window.innerWidth < 768 ? 0 : 360, top: 0, bottom: 0, right: 0 },
      duration: 2000,
      essential: true
    });
    
    mapInstance.once('moveend', () => {
      mapAny._isFlying = false;
    });

    // Langsung buka 360 Viewer seketika (animasi flyTo berjalan di background)
    openViewer(loc.id);

    // On mobile, collapse after selecting to see the map
    if (window.innerWidth < 768) {
      setIsMobileExpanded(false);
    }
  };

  const sections = ['ALL', 'Section 1', 'Section 2', 'Section 3'];
  const getSectionLabel = (sec: string) => sec === 'ALL' ? 'ALL' : sec.replace('Section ', 'SEC ');

  return (
    <div className={`pointer-events-auto absolute z-20 flex flex-col shadow-2xl transition-all duration-300 overflow-hidden bg-black/60 backdrop-blur-xl border-white/10
      md:left-0 md:top-0 md:bottom-0 md:w-[340px] md:border-r md:rounded-none md:h-auto
      left-0 bottom-0 w-full border-t rounded-t-2xl
      ${isMobileExpanded ? 'h-[75vh]' : 'h-[70px] md:h-full'}
    `}>
      
      {/* Mobile Drag Handle / Header */}
      <div 
        className="md:hidden flex items-center justify-between px-6 py-4 cursor-pointer border-b border-white/5 active:bg-white/5"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15">
            <Radio className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">GeoSpatial Dashboard</h1>
            <p className="text-[11px] text-slate-400">Real-time Node Monitoring</p>
          </div>
        </div>
        {isMobileExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
      </div>

      {/* Main Content (Hidden on mobile when collapsed) */}
      <div className={`flex flex-col flex-1 overflow-hidden ${!isMobileExpanded ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header Section (Desktop only for the title, Mobile already has it in the handle) */}
        <div className="p-6 pb-4">
          <div className="hidden md:flex items-center gap-3 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/15">
              <Radio className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">GeoSpatial Dashboard</h1>
              <p className="text-[11px] text-slate-400">Real-time Node Monitoring</p>
            </div>
          </div>

          <div className="flex gap-16 items-start mb-6">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Total Nodes</p>
              {isLoading ? (
                <div className="h-9 w-16 bg-white/10 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-3xl font-bold text-cyan-400 drop-shadow-md">{nodes.length}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">Project Scale</p>
              {isLoading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-cyan-400 drop-shadow-md">Large</p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <input 
              type="text" 
              placeholder="Search Station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 text-sm text-white placeholder-slate-400 rounded-lg pl-4 pr-10 py-2.5 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {sections.map(sec => {
              const isActive = activeSection === sec;
              return (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider transition-all duration-300
                    ${isActive 
                      ? 'bg-cyan-400 text-slate-900 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                      : 'bg-transparent border border-white/20 text-slate-400 hover:border-white/40 hover:text-white'}`}
                >
                  {getSectionLabel(sec)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Locations Log */}
        <div className="px-6 pt-2 pb-2">
          <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">LOCATIONS LOG</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar">
          {isLoading ? (
            // Skeleton Loader
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-white/10 rounded w-1/2 mb-3"></div>
                <div className="h-2 bg-white/5 rounded w-1/3"></div>
              </div>
            ))
          ) : (
            filteredLocations.map((loc, idx) => (
              <div 
                key={`${loc.id}-${idx}`}
                onClick={() => handleLocationClick(loc)}
                className="bg-white/5 border border-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
              >
                <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                  {loc.locationName}
                </h3>
                <p className="text-[11px] font-mono text-cyan-400 mb-1">
                  {loc.coordinates[1].toFixed(6)}, {loc.coordinates[0].toFixed(6)}
                </p>
                {loc.captureDate && (
                  <p className="text-[10px] text-slate-500">
                    {new Date(loc.captureDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}

          {!isLoading && filteredLocations.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-8">
              No locations found.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
