'use client';

import React from 'react';
import { MapPin, Calendar, Camera } from 'lucide-react';
import { EmptyState } from '@/components/ui/GlobalComponents';
import { type PhotoNode } from '@/lib/data';

interface SidebarNodeListProps {
  nodes: PhotoNode[];
  activeNodeId: string | null;
  onNodeClick: (node: PhotoNode) => void;
  onOpenViewer?: (id: string) => void;
}

export const SidebarNodeList: React.FC<SidebarNodeListProps> = ({
  nodes,
  activeNodeId,
  onNodeClick,
  onOpenViewer,
}) => {
  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="w-5 h-5 text-zinc-400" />}
        title="Tidak ada titik ditemukan"
        description="Tidak ada titik foto 360° yang cocok dengan filter pencarian atau sektor."
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
      {nodes.map((node) => {
        const isActive = activeNodeId === node.id;
        const displayName = node.locationName || 'Titik Panorama';

        return (
          <div
            key={node.id}
            onClick={() => onNodeClick(node)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
              isActive
                ? 'bg-cyan-50/70 dark:bg-cyan-950/20 border-cyan-500/50 ring-1 ring-cyan-500/30'
                : 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {displayName}
                  </h4>
                </div>

                {node.section && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {node.section}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-400 font-mono">
                  <span>
                    {node.coordinates[1]?.toFixed(4)}, {node.coordinates[0]?.toFixed(4)}
                  </span>
                </div>
              </div>

              {node.captureDate && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3" />
                  <span>{node.captureDate}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
