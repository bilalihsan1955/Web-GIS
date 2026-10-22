import { useState } from 'react';
import imageCompression from 'browser-image-compression';

// ============================================================================
// hooks/useNodeMutations.ts: Spatial Node Mutation Hook (Edit & Delete)
// Connects to /api/dashboard/nodes (Docker PostgreSQL)
// Strictly < 250 lines
// ============================================================================

interface NodeMutationsProps {
  fetchData: () => void;
  setNodes: React.Dispatch<React.SetStateAction<any[]>>;
  setLocations: React.Dispatch<React.SetStateAction<any[]>>;
  setTotalNodes: React.Dispatch<React.SetStateAction<number>>;
}

export function useNodeMutations({ fetchData, setNodes, setLocations, setTotalNodes }: NodeMutationsProps) {
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [editLocationName, setEditLocationName] = useState('');
  const [editLocationDescription, setEditLocationDescription] = useState('');
  const [editLocationSectionId, setEditLocationSectionId] = useState('');
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
    setEditLocationSectionId(node.locations?.section_id || '');
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
          body: formData,
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
              body: JSON.stringify({ filePath: selectedNode.image_url }),
            });
          } catch (err) {
            console.error('Failed to delete old image locally:', err);
          }
        }
      }

      // Update Node and Location via Standalone API
      const updateRes = await fetch('/api/dashboard/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          locationName: editLocationName,
          description: editLocationDescription,
          sectionId: editLocationSectionId || null,
          captureDate: editCaptureDate || null,
          isPublished: editIsPublished,
          imageUrl: finalImageUrl,
        }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || 'Gagal memperbarui node.');
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal memperbarui titik node.');
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
      // 1. Delete physical image if exists
      if (nodeToDelete.image_url) {
        try {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: nodeToDelete.image_url }),
          });
        } catch (err) {
          console.warn('Physical file deletion warning:', err);
        }
      }

      // 2. Delete database records via Standalone API (Node & Location cascade)
      const deleteRes = await fetch(`/api/dashboard/nodes?id=${encodeURIComponent(nodeToDelete.id)}`, {
        method: 'DELETE',
      });

      if (!deleteRes.ok) {
        const deleteData = await deleteRes.json();
        throw new Error(deleteData.error || 'Gagal menghapus node.');
      }

      setIsDeleteModalOpen(false);

      setNodes((prev) => prev.filter((n) => n.id !== nodeToDelete.id));
      setLocations((prev) => prev.filter((l) => l.id !== nodeToDelete.location_id));
      setTotalNodes((prev) => Math.max(0, prev - 1));

      setNodeToDelete(null);
      fetchData();
    } catch (err: any) {
      console.error('Delete error:', err);
      setDeleteError(err.message || 'Gagal menyelesaikan proses penghapusan.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return {
    isEditModalOpen,
    setIsEditModalOpen,
    selectedNode,
    editLocationName,
    setEditLocationName,
    editLocationDescription,
    setEditLocationDescription,
    editLocationSectionId,
    setEditLocationSectionId,
    editCaptureDate,
    setEditCaptureDate,
    editIsPublished,
    setEditIsPublished,
    editImageFile,
    editImagePreview,
    handleEditImageSelect,
    handleEditSubmit,
    modalLoading,
    modalError,
    openEditModal,

    isDeleteModalOpen,
    setIsDeleteModalOpen,
    nodeToDelete,
    deleteLoading,
    deleteError,
    openDeleteModal,
    confirmDeleteNode,
  };
}
