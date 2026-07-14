import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression';

interface NodeMutationsProps {
  fetchData: () => void;
  setNodes: React.Dispatch<React.SetStateAction<any[]>>;
  setLocations: React.Dispatch<React.SetStateAction<any[]>>;
  setTotalNodes: React.Dispatch<React.SetStateAction<number>>;
}

export function useNodeMutations({ fetchData, setNodes, setLocations, setTotalNodes }: NodeMutationsProps) {
  const supabase = createClient();
  
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationDescription, setEditLocationDescription] = useState('');
  const [editCaptureDate, setEditCaptureDate] = useState('');
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; image_url: string; location_id: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Authentication required');
      }
      const userId = sessionData.session.user.id;

      // Update DB Record
      const { error } = await supabase
        .from('spatial_nodes')
        .update({
          location_id: locId,
          capture_date: editCaptureDate || null,
          is_published: editIsPublished,
          image_url: finalImageUrl,
          created_by: userId
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

      const { error: nodeError } = await supabase
        .from('spatial_nodes')
        .delete()
        .eq('id', nodeToDelete.id);
        
      if (nodeError) throw nodeError;

      if (nodeToDelete.location_id) {
        const { error: locError } = await supabase
          .from('locations')
          .delete()
          .eq('id', nodeToDelete.location_id);
          
        if (locError) throw locError;
      }

      setIsDeleteModalOpen(false);
      
      setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
      setLocations(prev => prev.filter(l => l.id !== nodeToDelete.location_id));
      setTotalNodes(prev => Math.max(0, prev - 1));
      
      setNodeToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Failed to complete full deletion process.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    // Edit state & functions
    isEditModalOpen,
    setIsEditModalOpen,
    selectedNode,
    editLocationName,
    setEditLocationName,
    editLocationDescription,
    setEditLocationDescription,
    editCaptureDate,
    setEditCaptureDate,
    editIsPublished,
    setEditIsPublished,
    editImageFile,
    editImagePreview,
    modalLoading,
    modalError,
    openEditModal,
    handleEditImageSelect,
    handleEditSubmit,

    // Delete state & functions
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    nodeToDelete,
    deleteLoading,
    deleteError,
    openDeleteModal,
    confirmDeleteNode
  };
}
