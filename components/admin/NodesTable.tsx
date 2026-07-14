import { useState } from 'react';
import { Search, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

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
  openEditModal,
  openDeleteModal
}: NodesTableProps) {
  const { t } = useLanguage();
  const [isSectionFilterOpen, setIsSectionFilterOpen] = useState(false);

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 drop-shadow-sm dark:drop-shadow-md px-2">{t('spatialNodesDirectory')}</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4 relative z-[60] items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder={t('searchStation')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 w-full outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-none dark:shadow-inner"
          />
        </div>

        {/* Custom Section Filter Dropdown */}
        <div className="relative z-[70]">
          <button
            onClick={() => setIsSectionFilterOpen(!isSectionFilterOpen)}
            className={`flex items-center justify-between min-w-[170px] h-full px-4 py-2.5 rounded-xl border transition-all backdrop-blur-md shadow-none dark:shadow-inner outline-none
              ${isSectionFilterOpen 
                ? 'bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-500/10 dark:border-cyan-500/50 dark:text-cyan-400' 
                : 'bg-white/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white/90 dark:bg-slate-900/50 dark:border-white/20 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-white/5'}`}
          >
            <span className="font-medium text-sm">{sectionFilter || t('allSectors')}</span>
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isSectionFilterOpen ? 'text-cyan-600 dark:text-cyan-400 rotate-180' : 'text-slate-400'}`} />
          </button>
          
          {isSectionFilterOpen && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setIsSectionFilterOpen(false)} />
              <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-48 z-[101] bg-white dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm dark:shadow-2xl animate-fade-in origin-top">
                {['', ...dynamicSections].map((section) => (
                  <button
                    key={section || 'all'}
                    onClick={() => { setSectionFilter(section); setIsSectionFilterOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/10
                      ${sectionFilter === section 
                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 font-semibold' 
                        : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {section || t('allSectors')}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-none dark:shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-semibold bg-slate-100/50 dark:bg-black/20">
                <th className="px-6 py-5">{t('image')}</th>
                <th className="px-6 py-5">{t('name')}</th>
                <th className="px-6 py-5">{t('uploaded')}</th>
                <th className="px-6 py-5">{t('coordinates')}</th>
                <th className="px-6 py-5">{t('captureDate')}</th>
                <th className="px-6 py-5">{t('status')}</th>
                <th className="px-6 py-5 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-white/5 last:border-0">
                    <td className="px-6 py-5"><div className="h-12 w-12 bg-slate-200 dark:bg-white/10 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-28"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-slate-200 dark:bg-white/10 rounded-full w-16"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-6 bg-slate-200 dark:bg-white/10 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    {searchQuery ? t('noNodes') : t('noNodes')}
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-5">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-black/40 overflow-hidden relative border border-slate-200 dark:border-white/10 shadow-none dark:shadow-sm">
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
                        <span className="text-sm font-semibold text-slate-900 dark:text-white drop-shadow-sm">
                          {node.locations?.name || t('unnamed')}
                        </span>
                        {node.locations?.description && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 w-fit">
                            {node.locations.company_sections?.name || node.locations.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">{node.creator?.email || ''}</span>
                        {node.creator?.parent?.email && (
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Admin: {node.creator.parent.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 font-mono">
                        {node.latitude?.toFixed(5) || '-'}, {node.longitude?.toFixed(5) || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300 drop-shadow-sm">
                      {node.capture_date || '-'}
                    </td>
                    <td className="px-6 py-5">
                      {node.is_published ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {t('published')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-300 dark:border-slate-500/30">
                          {t('draft')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2 transition-opacity">
                        {(() => {
                          const nodeCreatorGroupId = node.creator?.role === 'admin' 
                            ? node.created_by 
                            : (node.creator?.parent_admin_id || node.created_by);
                          const isSameGroup = nodeCreatorGroupId === currentUserGroupId;
                          
                          return (userRole === 'superadmin' || isSameGroup) && (
                            <>
                              <button 
                                onClick={() => openEditModal(node)}
                              className="p-2 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors border border-slate-200 dark:border-white/5 hover:border-cyan-200 dark:hover:border-cyan-500/30 backdrop-blur-sm"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(node.id, node.image_url, node.location_id)}
                              className="p-2 rounded-lg bg-white/50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 transition-colors border border-slate-200 dark:border-white/5 hover:border-red-200 dark:hover:border-red-500/30 backdrop-blur-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
