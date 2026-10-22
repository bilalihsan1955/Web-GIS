import { useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';

// ============================================================================
// hooks/useDashboardData.ts: Standalone Dashboard Data Fetching Hook
// Connects to /api/auth/me and /api/dashboard/nodes (Docker PostgreSQL)
// Eliminates client-side Supabase network calls (Zero "Failed to fetch" errors)
// Strictly < 250 lines
// ============================================================================

export function useDashboardData() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const userRoleFromStore = useDashboardStore((s) => s.userRole);
  const setUserRole = useDashboardStore((s) => s.setUserRole);
  const setCurrentUserGroupIdStore = useDashboardStore((s) => s.setCurrentUserGroupId);

  const [cachedRole, setCachedRole] = useState<string | null>(null);
  const userRole = userRoleFromStore || cachedRole || 'user';

  const [currentUserGroupId, setCurrentUserGroupId] = useState<string>('');
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const [adminGroups, setAdminGroups] = useState<
    { user_id: string; company_name: string | null; email: string; company_logo: string | null; company_slug: string | null }[]
  >([]);
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useDashboardStore((s) => s.setSelectedCompanyId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch current authenticated session from Standalone Auth
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setCurrentUser(meData.user);
          const role = meData.user.role || 'user';
          setUserRole(role);
          if (typeof window !== 'undefined') {
            localStorage.setItem('webgis_user_role', role);
          }
          const groupId = meData.user.parentAdminId || meData.user.id;
          setCurrentUserGroupId(groupId);
          setCurrentUserGroupIdStore(groupId);
        }
      }
      setIsRoleLoaded(true);

      // 2. Fetch spatial nodes from Standalone PostgreSQL API
      const nodesUrl =
        selectedCompanyId && selectedCompanyId !== 'all'
          ? `/api/dashboard/nodes?companyId=${encodeURIComponent(selectedCompanyId)}`
          : '/api/dashboard/nodes';

      const nodesRes = await fetch(nodesUrl);
      if (nodesRes.ok) {
        const nodesData = await nodesRes.json();
        const spatialNodes = nodesData.nodes || [];
        setNodes(spatialNodes);
        setTotalNodes(spatialNodes.length);
        const publishedCount = spatialNodes.filter((n: any) => n.is_published).length;
        setTotalLocations(publishedCount);

        if (nodesData.adminGroups) {
          setAdminGroups(nodesData.adminGroups);
        }
        if (nodesData.totalUsers !== undefined) {
          setTotalUsers(nodesData.totalUsers);
        }
      }
    } catch (err) {
      console.warn('[useDashboardData] Error in fetchData:', err);
      setIsRoleLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, setUserRole, setCurrentUserGroupIdStore]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('webgis_user_role');
      if (stored) setCachedRole(stored);
    }
    fetchData();
  }, [fetchData]);

  const filteredNodes = nodes.filter((node) => {
    if (!node) return false;
    const search = searchQuery.toLowerCase();
    const locName = (node.locations?.name || '').toLowerCase();
    const idStr = String(node.id).toLowerCase();
    const matchesSearch = search === '' || locName.includes(search) || idStr.includes(search);
    const nodeSection = node.locations?.company_sections?.name || node.locations?.description || '';
    const matchesSection = sectionFilter === '' || nodeSection === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const dynamicSections = Array.from(
    new Set(nodes.map((n) => n.locations?.company_sections?.name || n.locations?.description).filter(Boolean))
  );

  const isSuperadminRole =
    userRole === 'superadmin' ||
    (isMounted && typeof window !== 'undefined' && localStorage.getItem('webgis_user_role') === 'superadmin');
  const isSuperadminGlobal = isSuperadminRole && selectedCompanyId === 'all';

  return {
    nodes,
    locations,
    loading,
    isRoleLoaded,
    isMounted,
    currentUser,
    userRole,
    currentUserGroupId,
    totalNodes,
    totalLocations,
    totalUsers,
    searchQuery,
    setSearchQuery,
    sectionFilter,
    setSectionFilter,
    dynamicSections,
    fetchData,
    filteredNodes,
    setNodes,
    setLocations,
    setTotalNodes,
    adminGroups,
    selectedCompanyId,
    setSelectedCompanyId,
    isSuperadminRole,
    isSuperadminGlobal,
  };
}
