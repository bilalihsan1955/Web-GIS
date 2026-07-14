'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/utils/supabase/client';
import { MapPin, Image as ImageIcon, HardDrive, Edit, Trash2, X, Loader2, CheckCircle2, UploadCloud, Users, Search, ChevronDown } from 'lucide-react';
import SmartUploader from '@/components/admin/SmartUploader';
import imageCompression from 'browser-image-compression';

export default function DashboardPage() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [isSectionFilterOpen, setIsSectionFilterOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationDescription, setEditLocationDescription] = useState('');
  const [isEditSectionDropdownOpen, setIsEditSectionDropdownOpen] = useState(false);
  const [editCaptureDate, setEditCaptureDate] = useState('');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; image_url: string; location_id: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    fetchData();

    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (roleData) {
          setUserRole(roleData.role);
        }
      }
    }
    getSession();
  }, []);

  async function fetchData() {
    const { data: spatialNodes } = await supabase
      .from('spatial_nodes')
      .select(`
        *,
        locations(name, description),
        creator:user_roles!fk_spatial_nodes_created_by_user_roles (
          email,
          role,
          parent:user_roles!parent_admin_id (
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    const { data: locs } = await supabase.from('locations').select('id, name').order('name');
    
    // Default fallback to user_roles
    const { count: usersCount } = await supabase.from('user_roles').select('*', { count: 'exact', head: true });
    
    // Try to get real count from API (includes users without explicit role entries)
    try {
      const res = await fetch('/api/dashboard/users');
      const apiData = await res.json();
      if (apiData.users) {
        setTotalUsers(apiData.users.length);
      } else if (usersCount !== null) {
        setTotalUsers(usersCount);
      }
    } catch (e) {
      if (usersCount !== null) setTotalUsers(usersCount);
    }

    if (spatialNodes) {
      setNodes(spatialNodes);
      setTotalNodes(spatialNodes.length);
      const uniqueLocs = new Set(spatialNodes.map(n => n.location_id));
      setTotalLocations(uniqueLocs.size);
    }
    if (locs) {
      setLocations(locs);
    }
    setLoading(false);
  }

  // Handle Edit Actions
  const openEditModal = (node: any) => {
    setSelectedNode(node);
    setEditLocationName(node.locations?.name || '');
    setEditLocationDescription(node.locations?.description || '');
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
        // Check 360 format (aspect ratio ~2:1)
        const is360 = await new Promise<boolean>((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            resolve(ratio >= 1.9 && ratio <= 2.1);
          };
          img.onerror = () => resolve(false);
          img.src = URL.createObjectURL(editImageFile);
        });

        if (!is360) {
          throw new Error('Update ditolak: Gambar baru harus berformat panorama 360° (Rasio 2:1).');
        }

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

      // Handle Location mapping atomically
      let locId = '';
      const slug = editLocationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { data: existingLoc, error: queryErr } = await supabase
        .from('locations')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (queryErr) throw queryErr;

      if (existingLoc) {
        locId = existingLoc.id;
        // Update the section (description) of the existing location if changed
        await supabase.from('locations').update({ description: editLocationDescription }).eq('id', locId);
      } else {
        const { data: newLoc, error: insertErr } = await supabase
          .from('locations')
          .insert({ name: editLocationName, slug, description: editLocationDescription })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        locId = newLoc.id;
      }

      // Update DB Record
      const { error } = await supabase
        .from('spatial_nodes')
        .update({
          location_id: locId,
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
  const openDeleteModal = (nodeId: string, imageUrl: string, locationId: string) => {
    setNodeToDelete({ id: nodeId, image_url: imageUrl, location_id: locationId });
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteNode = async () => {
    if (!nodeToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      // Step 1 & 2: Delete from Local Storage via API
      if (nodeToDelete.image_url) {
        const res = await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: nodeToDelete.image_url })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete physical image file');
        }
      }

      // Step 3: Delete the node from spatial_nodes
      const { error: nodeError } = await supabase
        .from('spatial_nodes')
        .delete()
        .eq('id', nodeToDelete.id);
        
      if (nodeError) throw nodeError;

      // Step 4: Delete the location from locations table
      if (nodeToDelete.location_id) {
        const { error: locError } = await supabase
          .from('locations')
          .delete()
          .eq('id', nodeToDelete.location_id);
          
        if (locError) throw locError;
      }

      // Success: Close modal and optimistically update state
      setIsDeleteModalOpen(false);
      
      setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
      setLocations(prev => prev.filter(l => l.id !== nodeToDelete.location_id));
      setTotalNodes(prev => Math.max(0, prev - 1));
      
      setNodeToDelete(null);
      fetchData(); // Background refresh to ensure perfect sync
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to complete full deletion process.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const editModalContent = isEditModalOpen && selectedNode && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-2xl shadow-sm dark:shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">Edit Spatial Node</h3>
          <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors relative z-[110] cursor-pointer">
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">360° Image</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 relative shadow-none dark:shadow-inner">
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
                <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  <UploadCloud className="w-4 h-4" /> Replace Image
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">New image will be compressed automatically.</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1.5">Location Name</label>
            <input 
              type="text" 
              required
              value={editLocationName} 
              onChange={e => setEditLocationName(e.target.value)} 
              className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-none dark:shadow-inner backdrop-blur-sm"
            />
          </div>
            
            <div className="relative">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1.5">Map Section (Optional)</label>
                <div className="relative">
                  <div 
                    onClick={() => setIsEditSectionDropdownOpen(!isEditSectionDropdownOpen)}
                    className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-3 cursor-pointer flex justify-between items-center shadow-none dark:shadow-inner hover:bg-white/80 dark:hover:bg-black/60 transition-colors backdrop-blur-sm"
                  >
                    <span>{editLocationDescription || 'Pilih Section...'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isEditSectionDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isEditSectionDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                      {['Section 1', 'Section 2', 'Section 3', 'Section 4'].map((sec) => (
                        <div 
                          key={sec}
                          className="px-4 py-3 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors text-sm text-slate-700 dark:text-slate-200"
                          onClick={() => {
                            setEditLocationDescription(sec);
                            setIsEditSectionDropdownOpen(false);
                          }}
                        >
                          {sec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1.5">Capture Date</label>
            <input 
              type="date" 
              value={editCaptureDate} 
              onChange={e => setEditCaptureDate(e.target.value)} 
              className="w-full bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/30 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all shadow-none dark:shadow-inner backdrop-blur-sm" 
            />
          </div>

          <div>
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/5">
              <input 
                type="checkbox"
                checked={editIsPublished}
                onChange={(e) => setEditIsPublished(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-cyan-500 dark:text-cyan-400 focus:ring-cyan-500/50 focus:ring-offset-0 focus:ring-offset-transparent"
              />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-300">Published (Visible on Map)</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={modalLoading} className="px-5 py-2.5 bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-bold rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-500/30 transition-colors flex items-center disabled:opacity-50 shadow-none dark:shadow-lg dark:shadow-cyan-500/10">
              {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const deleteModalContent = isDeleteModalOpen && nodeToDelete && (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-2xl shadow-sm dark:shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30 mb-2">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-md">Confirm Deletion</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 drop-shadow-sm leading-relaxed">
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
              className="flex-1 px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeleteNode}
              disabled={deleteLoading}
              className="flex-1 px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50 shadow-none dark:shadow-lg dark:shadow-red-500/10"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.locations?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter ? node.locations?.description === sectionFilter : true;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* ── ANALYTICS STAT CARDS ── */}
      <div className={`grid grid-cols-1 ${userRole === 'user' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 shadow-none dark:shadow-inner">
                <MapPin className="h-7 w-7 text-cyan-700 dark:text-cyan-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Nodes</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalNodes}</p>
              </div>
            </>
          )}
        </div>
        
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
          {loading ? (
            <>
              <div className="h-[58px] w-[58px] rounded-xl bg-slate-100 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
              <div className="ml-5 space-y-2 w-full">
                <div className="h-4 w-24 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
                <div className="h-8 w-16 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="bg-purple-500/10 dark:bg-purple-500/20 p-4 rounded-xl border border-purple-500/20 shadow-none dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <MapPin className="h-6 w-6 text-purple-700 dark:text-purple-400" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Locations</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalLocations}</p>
              </div>
            </>
          )}
        </div>

        {(userRole === 'admin' || userRole === 'superadmin') && (
          <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-gray-800 rounded-2xl p-6 shadow-none dark:shadow-xl flex items-center hover:bg-white/90 dark:hover:bg-white/5 transition-colors">
            {loading ? (
              <>
                <div className="h-[58px] w-[58px] rounded-xl bg-slate-100 dark:bg-white/10 animate-pulse border border-slate-200 dark:border-white/5 shrink-0" />
                <div className="ml-5 space-y-2 w-full">
                  <div className="h-4 w-24 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-slate-100 dark:bg-white/10 animate-pulse rounded" />
                </div>
              </>
            ) : (
              <>
                <div className="bg-amber-500/10 dark:bg-amber-500/20 p-4 rounded-xl border border-amber-500/20 shadow-none dark:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Users className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Users</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">{totalUsers}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── SMART BATCH UPLOADER ── */}
      {(userRole === 'user' || userRole === 'admin' || userRole === 'superadmin') && (
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 drop-shadow-sm dark:drop-shadow-md px-2">Upload Pipeline</h2>
          <SmartUploader onUploadComplete={fetchData} />
        </section>
      )}

      {/* ── LIVE DATA GRID / TABLE ── */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 drop-shadow-sm dark:drop-shadow-md px-2">Spatial Nodes Directory</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4 relative z-[60] items-center">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by location name or node ID..."
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
              <span className="font-medium text-sm">{sectionFilter || 'All Sections'}</span>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${isSectionFilterOpen ? 'text-cyan-600 dark:text-cyan-400 rotate-180' : 'text-slate-400'}`} />
            </button>
            
            {isSectionFilterOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsSectionFilterOpen(false)} />
                <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-2 w-full sm:w-48 z-[101] bg-white dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm dark:shadow-2xl animate-fade-in origin-top">
                  {['', 'Section 1', 'Section 2', 'Section 3', 'Section 4'].map((section) => (
                    <button
                      key={section || 'all'}
                      onClick={() => { setSectionFilter(section); setIsSectionFilterOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/10
                        ${sectionFilter === section 
                          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 font-semibold' 
                          : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {section || 'All Sections'}
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
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold bg-slate-100/50 dark:bg-black/20">
                  <th className="px-6 py-5">Preview</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Uploaded By</th>
                  <th className="px-6 py-5">Coordinates</th>
                  <th className="px-6 py-5">Capture Date</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
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
                      {searchQuery ? 'No nodes found matching your search.' : 'No 360 images found. Upload using the pipeline above.'}
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
                            {node.locations?.name || 'Unnamed'}
                          </span>
                          {node.locations?.description && (
                            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 w-fit">
                              {node.locations.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">{node.creator?.email || 'System'}</span>
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
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border border-slate-300 dark:border-slate-500/30">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2 transition-opacity">
                          {(userRole === 'superadmin' || (userRole === 'admin' && node.created_by === currentUser?.id)) && (
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
                          )}
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
