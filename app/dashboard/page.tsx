'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { MapPin, Image as ImageIcon, HardDrive, Edit, Trash2, X, Loader2, CheckCircle2, UploadCloud, Users } from 'lucide-react';
import SmartUploader from '@/components/admin/SmartUploader';
import imageCompression from 'browser-image-compression';

export default function DashboardPage() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [editLocationId, setEditLocationId] = useState('');
  const [editCaptureDate, setEditCaptureDate] = useState('');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; image_url: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  async function fetchData() {
    const { data: spatialNodes } = await supabase
      .from('spatial_nodes')
      .select('*, locations(name)')
      .order('created_at', { ascending: false });

    const { data: locs } = await supabase.from('locations').select('id, name').order('name');
    const { count: usersCount } = await supabase.from('user_roles').select('*', { count: 'exact', head: true });

    if (spatialNodes) {
      setNodes(spatialNodes);
      setTotalNodes(spatialNodes.length);
      const uniqueLocs = new Set(spatialNodes.map(n => n.location_id));
      setTotalLocations(uniqueLocs.size);
    }
    if (locs) {
      setLocations(locs);
    }
    if (usersCount !== null) {
      setTotalUsers(usersCount);
    }
    setLoading(false);
  }

  // Handle Edit Actions
  const openEditModal = (node: any) => {
    setSelectedNode(node);
    setEditLocationId(node.location_id || '');
    setEditCaptureDate(node.capture_date || '');
    setEditIsPublished(node.is_published);
    setEditImageFile(null);
    setEditImagePreview(node.image_url || '');
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    setModalLoading(true);
    setModalError('');

    try {
      let finalImageUrl = selectedNode.image_url;

      if (editImageFile) {
        // Compress Image
        const options = { maxSizeMB: 5, maxWidthOrHeight: 4096, useWebWorker: true };
        const compressedFile = await imageCompression(editImageFile, options);

        // Upload New Image
        const formData = new FormData();
        formData.append('file', compressedFile, editImageFile.name);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload new image');
        
        finalImageUrl = data.url;

        // Delete Old Image Locally
        if (selectedNode.image_url) {
          try {
            await fetch('/api/upload/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: selectedNode.image_url })
            });
          } catch (err) {
            console.error("Failed to delete old image locally:", err);
          }
        }
      }

      // Update DB Record
      const { error } = await supabase
        .from('spatial_nodes')
        .update({
          location_id: editLocationId,
          capture_date: editCaptureDate || null,
          is_published: editIsPublished,
          image_url: finalImageUrl
        })
        .eq('id', selectedNode.id);

      if (error) throw error;
      
      setIsEditModalOpen(false);
      fetchData(); // Refresh the table
    } catch (err: any) {
      setModalError(err.message || 'Failed to update node');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Delete Actions
  const openDeleteModal = (nodeId: string, imageUrl: string) => {
    setNodeToDelete({ id: nodeId, image_url: imageUrl });
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteNode = async () => {
    if (!nodeToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      // 1. Delete from Local Storage via API
      if (nodeToDelete.image_url) {
        try {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: nodeToDelete.image_url })
          });
        } catch (err) {
          console.error("Local storage delete error:", err);
        }
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase
        .from('spatial_nodes')
        .delete()
        .eq('id', nodeToDelete.id);
        
      if (dbError) throw dbError;

      setIsDeleteModalOpen(false);
      setNodeToDelete(null);
      fetchData(); // Refresh the table
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Failed to delete the node.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const editModalContent = isEditModalOpen && selectedNode && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/20">
          <h3 className="text-lg font-bold text-white drop-shadow-md">Edit Spatial Node</h3>
          <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors relative z-[110] cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
          {modalError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
              {modalError}
            </div>
          )}
          
          {/* Image Replacement */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">360° Image</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 relative">
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-cyan-400 font-semibold hover:bg-slate-800 transition-colors">
                  <UploadCloud className="w-4 h-4" /> Replace Image
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">New image will be compressed automatically.</p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Location Group</label>
            <select 
              value={editLocationId} 
              onChange={e => setEditLocationId(e.target.value)} 
              className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none shadow-inner"
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">Select an existing location...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">{loc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Capture Date</label>
            <input 
              type="date" 
              value={editCaptureDate} 
              onChange={e => setEditCaptureDate(e.target.value)} 
              className="w-full bg-black/40 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-inner" 
            />
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-black/20 rounded-xl border border-white/5">
              <input 
                type="checkbox"
                checked={editIsPublished}
                onChange={(e) => setEditIsPublished(e.target.checked)}
                className="w-5 h-5 rounded border-white/10 bg-black/40 text-cyan-400 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-transparent"
              />
              <span className="text-sm font-semibold text-slate-300">Published (Visible on Map)</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={modalLoading} className="px-5 py-2.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-500/30 transition-colors flex items-center disabled:opacity-50 shadow-lg shadow-cyan-500/10">
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const deleteModalContent = isDeleteModalOpen && nodeToDelete && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-500/30 mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-md">Confirm Deletion</h3>
          <p className="text-sm text-slate-400 drop-shadow-sm leading-relaxed">
            Are you sure you want to permanently delete this panorama? This action will remove the file from storage and the database and cannot be undone.
          </p>

          {deleteError && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 text-left">
              {deleteError}
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => setIsDeleteModalOpen(false)} 
              disabled={deleteLoading}
              className="flex-1 px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteNode}
              disabled={deleteLoading}
              className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-500/10"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ── ANALYTICS STAT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-white/10 animate-pulse border border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-cyan-500/20 p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <ImageIcon className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider drop-shadow-sm">Total Nodes</p>
                <p className="text-3xl font-bold text-white mt-1 drop-shadow-md">{totalNodes}</p>
              </div>
            </>
          )}
        </div>
        
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-white/10 animate-pulse border border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <MapPin className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider drop-shadow-sm">Active Locations</p>
                <p className="text-3xl font-bold text-white mt-1 drop-shadow-md">{totalLocations}</p>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-white/10 animate-pulse border border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-amber-500/20 p-4 rounded-xl border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Users className="h-6 w-6 text-amber-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-slate-300 uppercase tracking-wider drop-shadow-sm">Total Pengguna</p>
                <p className="text-3xl font-bold text-white mt-1 drop-shadow-md">{totalUsers}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── SMART BATCH UPLOADER ── */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-md px-2">Upload Pipeline</h2>
        <SmartUploader onUploadComplete={fetchData} />
      </section>

      {/* ── LIVE DATA GRID / TABLE ── */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4 drop-shadow-md px-2">Spatial Nodes Directory</h2>
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-300 font-semibold bg-black/20">
                  <th className="px-6 py-5">Preview</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Coordinates</th>
                  <th className="px-6 py-5">Capture Date</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse bg-white/5 border-b border-white/5 last:border-0">
                      <td className="px-6 py-5"><div className="h-12 w-12 bg-white/10 rounded-lg"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-32"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-32"></div></td>
                      <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-24"></div></td>
                      <td className="px-6 py-5"><div className="h-6 bg-white/10 rounded-full w-16"></div></td>
                      <td className="px-6 py-5 text-right"><div className="h-6 bg-white/10 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : nodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No 360 images found. Upload using the pipeline above.
                    </td>
                  </tr>
                ) : (
                  nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 relative shadow-inner">
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
                        <span className="text-sm font-semibold text-white drop-shadow-sm">
                          {node.locations?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-slate-300 font-mono text-[13px] bg-black/20 px-2 py-1 rounded w-fit border border-white/5 drop-shadow-sm">
                          {node.latitude?.toFixed(5) || '-'}, {node.longitude?.toFixed(5) || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-300 drop-shadow-sm">
                        {node.capture_date || '-'}
                      </td>
                      <td className="px-6 py-5">
                        {node.is_published ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => openEditModal(node)}
                            className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-all" 
                            title="Edit Node"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(node.id, node.image_url)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" 
                            title="Delete Node"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Render Modals securely outside the layout stack */}
      {isMounted && document.body && createPortal(editModalContent, document.body)}
      {isMounted && document.body && createPortal(deleteModalContent, document.body)}

    </div>
  );
}
