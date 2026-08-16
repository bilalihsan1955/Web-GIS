import { useState, useEffect } from 'react';
import { Search, ChevronDown, Edit, Trash2, ChevronLeft, ChevronRight, Copy, CheckSquare, Square, MinusSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import DuplicateNodesModal from './DuplicateNodesModal';
import Modal from '@/components/ui/Modal';

interface NodesTableProps {
  userRole: string;
  currentUser: any;
  currentUserGroupId: string;
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sectionFilter: string;
  setSectionFilter: (section: string) => void;
  dynamicSections: string[];
  filteredNodes: any[];
  allNodes: any[];
  fetchData: () => void;
  openEditModal: (node: any) => void;
  openDeleteModal: (nodeId: string, imageUrl: string, locationId: string) => void;
}

export default function NodesTable({
  userRole,
  currentUser,
  currentUserGroupId,
  loading,
  searchQuery,
  setSearchQuery,
  sectionFilter,
  setSectionFilter,
  dynamicSections,
  filteredNodes,
  allNodes,
  fetchData,
  openEditModal,
  openDeleteModal
}: NodesTableProps) {
  const { t } = useLanguage();
  const [isSectionFilterOpen, setIsSectionFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // ── Selection & Bulk Action States ──
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sectionFilter, itemsPerPage]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedNodeIds(new Set());
  }, [searchQuery, sectionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / itemsPerPage));
  const paginatedNodes = filteredNodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Permission Check for Node Selection ──
  const isNodeSelectable = (node: any) => {
    const creatorData = Array.isArray(node.creator) ? node.creator[0] : node.creator;
    const nodeCreatorGroupId = creatorData?.parent_admin_id || node.created_by;
    const isSameGroup = nodeCreatorGroupId === currentUserGroupId;
    return userRole === 'superadmin' || isSameGroup;
  };

  const selectableFilteredNodes = filteredNodes.filter(isNodeSelectable);
  const selectablePaginatedNodes = paginatedNodes.filter(isNodeSelectable);

  const isAllFilteredSelected = selectableFilteredNodes.length > 0 && selectableFilteredNodes.every(n => selectedNodeIds.has(n.id));
  const isSomeFilteredSelected = selectableFilteredNodes.some(n => selectedNodeIds.has(n.id)) && !isAllFilteredSelected;

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedNodeIds(new Set());
    } else {
      setSelectedNodeIds(new Set(selectableFilteredNodes.map(n => n.id)));
    }
  };

  const toggleSelectPage = () => {
    const next = new Set(selectedNodeIds);
    const isAllPageSelected = selectablePaginatedNodes.every(n => next.has(n.id));
    if (isAllPageSelected) {
      selectablePaginatedNodes.forEach(n => next.delete(n.id));
    } else {
      selectablePaginatedNodes.forEach(n => next.add(n.id));
    }
    setSelectedNodeIds(next);
  };

  const toggleSelectNode = (id: string) => {
    const next = new Set(selectedNodeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedNodeIds(next);
  };

  // ── Bulk Delete Handler ──
  const handleBulkDelete = async () => {
    if (selectedNodeIds.size === 0) return;
    setBulkDeleteLoading(true);
    setBulkDeleteError('');
    
    const nodesToDelete = filteredNodes.filter(n => selectedNodeIds.has(n.id));
    setBulkDeleteProgress({ current: 0, total: nodesToDelete.length });

    try {
      const supabase = createClient();
      for (let i = 0; i < nodesToDelete.length; i++) {
        const node = nodesToDelete[i];
        setBulkDeleteProgress({ current: i + 1, total: nodesToDelete.length });

        // 1. Delete image from storage
        if (node.image_url) {
          try {
            await fetch('/api/upload/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: node.image_url })
            });
          } catch {
            // Continue even if file delete fails
          }
        }

        // 2. Delete node from DB
        await supabase.from('spatial_nodes').delete().eq('id', node.id);

        // 3. Delete orphan location if no other nodes reference it
        if (node.location_id) {
          const { count } = await supabase
            .from('spatial_nodes')
            .select('id', { count: 'exact', head: true })
            .eq('location_id', node.location_id);

          if (count === 0) {
            await supabase.from('locations').delete().eq('id', node.location_id);
          }
        }
      }

      setSelectedNodeIds(new Set());
      setIsBulkDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      setBulkDeleteError(err.message || 'Gagal menghapus beberapa data.');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 px-2">{t('spatialNodesDirectory')}</h2>
      
      <div className="flex flex-col lg:flex-row gap-4 mb-4 relative z-[60] items-stretch lg:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <input 
            type="text" 
            placeholder={t('searchStation')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] w-full outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>

        {/* Custom Section Filter Dropdown */}
        <div className="relative z-[70] w-full sm:w-auto">
          <button
            onClick={() => setIsSectionFilterOpen(!isSectionFilterOpen)}
            className={`flex items-center justify-between w-full sm:w-auto min-w-[170px] min-h-[44px] px-4 py-2.5 rounded-xl border transition-all outline-none
              ${isSectionFilterOpen 
                ? 'bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white' 
                : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50'}`}
          >
            <span className="font-medium text-sm">{sectionFilter || t('allSectors')}</span>
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isSectionFilterOpen ? 'text-cyan-600 dark:text-cyan-400 rotate-180' : 'text-zinc-400'}`} />
          </button>
          
          {isSectionFilterOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setIsSectionFilterOpen(false)} />
              <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-48 z-[101] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg animate-fade-in origin-top">
                {['', ...dynamicSections].map((section) => (
                  <button
                    key={section || 'all'}
                    onClick={() => { setSectionFilter(section); setIsSectionFilterOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800
                      ${sectionFilter === section 
                        ? 'bg-zinc-50 text-zinc-900 dark:bg-zinc-800 dark:text-white font-semibold' 
                        : 'text-zinc-700 dark:text-zinc-300'}`}
                  >
                    {section || t('allSectors')}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Check Duplicates Button */}
        <button
          onClick={() => setIsDuplicateModalOpen(true)}
          className="flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 transition-all font-bold text-sm whitespace-nowrap cursor-pointer border border-amber-500/20"
        >
          <Copy className="w-4 h-4" />
          {t('checkDuplicates') || 'Check Duplicates'}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden flex flex-col shadow-sm">
        
        {/* ── Bulk Action Bar ── */}
        {selectedNodeIds.size > 0 && (
          <div className="bg-cyan-50 dark:bg-cyan-950/40 border-b border-cyan-200 dark:border-cyan-800/60 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-cyan-600 text-white font-bold text-xs">
                {selectedNodeIds.size}
              </span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Data Dipilih
              </span>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  {isAllFilteredSelected ? 'Batal Pilih Semua' : `Pilih Semua (${selectableFilteredNodes.length})`}
                </button>
                <span className="text-zinc-400">•</span>
                <button
                  type="button"
                  onClick={toggleSelectPage}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Pilih Halaman Ini ({selectablePaginatedNodes.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedNodeIds(new Set())}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal Pilih
              </button>

              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Terpilih ({selectedNodeIds.size})
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 font-semibold bg-zinc-100/50 dark:bg-black/20">
                <th className="pl-6 pr-2 py-5 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    title={isAllFilteredSelected ? "Batal pilih semua" : "Pilih semua data"}
                    className="flex items-center justify-center text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    ) : isSomeFilteredSelected ? (
                      <MinusSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-5">{t('image')}</th>
                <th className="px-6 py-5">{t('name')}</th>
                <th className="px-6 py-5">{t('uploaded')}</th>
                <th className="px-6 py-5">{t('coordinates')}</th>
                <th className="px-6 py-5">{t('captureDate')}</th>
                <th className="px-6 py-5">{t('status')}</th>
                <th className="px-6 py-5 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-zinc-100 dark:border-white/5 last:border-0">
                    <td className="pl-6 pr-2 py-5"><div className="h-5 w-5 bg-zinc-200 dark:bg-white/10 rounded"></div></td>
                    <td className="px-4 py-5"><div className="h-12 w-12 bg-zinc-200 dark:bg-white/10 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-28"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-zinc-200 dark:bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-zinc-200 dark:bg-white/10 rounded-full w-16"></div></td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="h-9 w-9 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                        <div className="h-9 w-9 bg-zinc-200 dark:bg-white/10 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                    {searchQuery ? t('noNodes') : t('noNodes')}
                  </td>
                </tr>
              ) : (
                paginatedNodes.map((node) => {
                  const isSelected = selectedNodeIds.has(node.id);
                  const canSelect = isNodeSelectable(node);

                  return (
                    <tr 
                      key={node.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-cyan-500/10 dark:bg-cyan-500/15 border-l-4 border-l-cyan-500' 
                          : 'hover:bg-zinc-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <td className="pl-6 pr-2 py-5">
                        {canSelect && (
                          <button
                            type="button"
                            onClick={() => toggleSelectNode(node.id)}
                            className="flex items-center justify-center text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Square className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-5">
                        <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-black/40 overflow-hidden relative border border-zinc-200 dark:border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={node.image_url} 
                            alt="Thumbnail" 
                            className="object-cover w-full h-full opacity-90"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NDkzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIvPjxjaXJjbGUgY3g9IjkiIGN5PSI5IiByPSIyIi8+PHBhdGggZD0ibTIxIDE1LTMuMDgtMy4wOGMtLjU0LS41NC0xLjQ2LS41NC0yLjA4LjA4bS0xIDEgNyA3Ii8+PC9zdmc+';
                              (e.target as HTMLImageElement).className = 'object-none w-full h-full text-white/20';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {node.locations?.name || t('unnamed')}
                          </span>
                          {(node.locations?.company_sections?.name || node.locations?.description) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 w-fit">
                              {node.locations.company_sections?.name || node.locations.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">{node.creator?.email || ''}</span>
                          {node.creator?.parent?.email && (
                            <span className="text-[10px] text-zinc-500 mt-1 block">
                              Admin: {node.creator.parent.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 font-mono">
                          {node.latitude?.toFixed(5) || '-'}, {node.longitude?.toFixed(5) || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-zinc-600 dark:text-zinc-300">
                        {node.capture_date || '-'}
                      </td>
                      <td className="px-6 py-5">
                        {node.is_published ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            {t('published')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-500/30">
                            {t('draft')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2 transition-opacity">
                          {(() => {
                            const creatorData = Array.isArray(node.creator) ? node.creator[0] : node.creator;
                            const nodeCreatorGroupId = creatorData?.parent_admin_id || node.created_by;
                            const isSameGroup = nodeCreatorGroupId === currentUserGroupId;
                            
                            return (userRole === 'superadmin' || isSameGroup) && (
                              <>
                                <button 
                                  onClick={() => openEditModal(node)}
                                  className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => openDeleteModal(node.id, node.image_url, node.location_id)}
                                  className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredNodes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/20">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredNodes.length)} dari {filteredNodes.length} data
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none font-semibold cursor-pointer"
              >
                <option value={5}>5 / hal</option>
                <option value={10}>10 / hal</option>
                <option value={20}>20 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Nodes Check Modal */}
      <DuplicateNodesModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        nodes={allNodes}
        fetchData={fetchData}
      />

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => !bulkDeleteLoading && setIsBulkDeleteModalOpen(false)}
        title={`Konfirmasi Hapus ${selectedNodeIds.size} Data`}
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4 mt-2">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-[20px] flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed text-center">
            Apakah Anda yakin ingin menghapus <strong>{selectedNodeIds.size} node spasial</strong> yang dipilih secara permanen?
            Tindakan ini akan menghapus berkas foto dari penyimpanan dan tidak dapat dibatalkan.
          </p>

          {bulkDeleteLoading && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400">
                <span>Menghapus data...</span>
                <span>{bulkDeleteProgress.current} / {bulkDeleteProgress.total}</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-300" 
                  style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {bulkDeleteError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 text-left">
              {bulkDeleteError}
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setIsBulkDeleteModalOpen(false)} 
              disabled={bulkDeleteLoading}
              className="flex-1 px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button 
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg cursor-pointer"
            >
              {bulkDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Ya, Hapus {selectedNodeIds.size} Data
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
