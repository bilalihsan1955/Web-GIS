import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useDashboardStore } from '@/store/useDashboardStore';

export function useDashboardData() {
  const supabase = createClient();
  const [nodes, setNodes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Get global role from store or safe post-mount cache to guarantee zero hydration mismatch
  const userRoleFromStore = useDashboardStore((s) => s.userRole);
  const setUserRole = useDashboardStore((s) => s.setUserRole);
  const [cachedRole, setCachedRole] = useState<string | null>(null);
  const userRole = userRoleFromStore || cachedRole || 'user';
  
  const [currentUserGroupId, setCurrentUserGroupId] = useState<string>('');
  
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Superadmin specific states
  const [adminGroups, setAdminGroups] = useState<{user_id: string, company_name: string | null, email: string, company_logo: string | null, company_slug: string | null}[]>([]);
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useDashboardStore((s) => s.setSelectedCompanyId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Phase 1: Session and Role Check
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserRole = cachedRole || 'user';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('webgis_user_role');
      if (stored) currentUserRole = stored;
    }
    let localUserGroupId = '';
    
    if (user) {
      setCurrentUser(user);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, parent_admin_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (roleData) {
        currentUserRole = roleData.role;
        setUserRole(roleData.role);
        if (typeof window !== 'undefined') {
          localStorage.setItem('webgis_user_role', roleData.role);
        }
        localUserGroupId = roleData.parent_admin_id || user.id;
        setCurrentUserGroupId(localUserGroupId);
      } else {
        localUserGroupId = user.id;
        setCurrentUserGroupId(localUserGroupId);
      }
      setIsRoleLoaded(true);
    } else {
      setIsRoleLoaded(true);
    }

    let targetAdminId = localUserGroupId;
    if (currentUserRole === 'superadmin' && selectedCompanyId !== 'all') {
      targetAdminId = selectedCompanyId;
    }

    // Phase 2: OPTIMIZATION - Parallel fetching of independent queries (admins group, company users, exact user count)
    const adminsPromise = currentUserRole === 'superadmin'
      ? supabase
          .from('user_roles')
          .select('user_id, company_name, email, company_logo, company_slug')
          .eq('role', 'admin') // strictly only Admins are considered Companies
          .is('parent_admin_id', null) // Only fetch true Company Owners, not Co-Admins
          .order('company_name', { ascending: true })
      : Promise.resolve({ data: null });

    const companyUsersPromise = (currentUserRole !== 'superadmin' || selectedCompanyId !== 'all')
      ? supabase
          .from('user_roles')
          .select('user_id')
          .or(`user_id.eq.${targetAdminId},parent_admin_id.eq.${targetAdminId}`)
      : Promise.resolve({ data: null });

    const usersCountPromise = supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    // OPTIMIZATION: Diubah ke Promise.all untuk paralel fetching tanpa mengubah struktur data
    const [adminsRes, companyUsersRes, usersCountRes] = await Promise.all([
      adminsPromise,
      companyUsersPromise,
      usersCountPromise,
    ]);

    if (adminsRes.data) {
      setAdminGroups(adminsRes.data);
    }

    let allowedCreatorIds: string[] | null = null;
    if (currentUserRole !== 'superadmin' || selectedCompanyId !== 'all') {
      if (companyUsersRes.data) {
        allowedCreatorIds = companyUsersRes.data.map(u => u.user_id);
      } else {
        allowedCreatorIds = [targetAdminId]; // fallback
      }
    }

    // Phase 3: OPTIMIZATION - Parallel fetching of spatial_nodes and totalUsers calculation
    // Preserve exact valid base columns of spatial_nodes along with locations & creator JOINs
    let nodesQuery = supabase
      .from('spatial_nodes')
      .select(`
        *,
        locations(name, description, section_id, company_sections(name)),
        creator:user_roles!fk_spatial_nodes_created_by_user_roles (
          email,
          role,
          parent_admin_id,
          parent:user_roles!parent_admin_id (
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (allowedCreatorIds) {
      nodesQuery = nodesQuery.in('created_by', allowedCreatorIds);
    }

    const fetchTotalUsersTask = async () => {
      const { count: usersCount } = usersCountRes;
      try {
        const res = await fetch('/api/dashboard/users');
        const apiData = await res.json();
        if (apiData.users) {
          let filteredUsers = apiData.users;
          if (currentUserRole === 'superadmin' && selectedCompanyId !== 'all') {
            filteredUsers = apiData.users.filter((u: any) => 
              u.parent_admin_id === selectedCompanyId || u.id === selectedCompanyId
            );
          }
          setTotalUsers(filteredUsers.length);
        } else if (usersCount !== null) {
          setTotalUsers(usersCount);
        }
      } catch (e) {
        if (usersCount !== null) setTotalUsers(usersCount);
      }
    };

    // OPTIMIZATION: Paralel execute nodes query & totalUsers resolution
    const [nodesRes] = await Promise.all([
      nodesQuery,
      fetchTotalUsersTask()
    ]);

    const { data: spatialNodes, error: spatialError } = nodesRes;

    if (spatialError) {
      console.error('[useDashboardData] Failed to fetch spatial nodes:', spatialError.message || spatialError);
    }

    if (spatialNodes) {
      // Data is already filtered by Supabase
      setNodes(spatialNodes);
      setTotalNodes(spatialNodes.length);
      const uniqueLocs = new Set(spatialNodes.map((n: any) => n.location_id));
      setTotalLocations(uniqueLocs.size);
    }
    setLoading(false);
  }, [supabase, selectedCompanyId]);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('webgis_user_role');
      if (stored) setCachedRole(stored);
    }
    fetchData();
  }, [fetchData]);

  const filteredNodes = nodes.filter(node => {
    if (!node) return false;
    const search = searchQuery.toLowerCase();
    const locName = (node.locations?.name || '').toLowerCase();
    const idStr = String(node.id).toLowerCase();
    const matchesSearch = search === '' || locName.includes(search) || idStr.includes(search);
    const nodeSection = node.locations?.company_sections?.name || node.locations?.description || '';
    const matchesSection = sectionFilter === '' || nodeSection === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const dynamicSections = Array.from(new Set(nodes.map(n => n.locations?.company_sections?.name || n.locations?.description).filter(Boolean)));

  const isSuperadminRole = userRole === 'superadmin' || (isMounted && typeof window !== 'undefined' && localStorage.getItem('webgis_user_role') === 'superadmin');
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
    setNodes, // expose setNodes for optimistic updates
    setLocations, // expose setLocations for optimistic updates
    setTotalNodes, // expose setTotalNodes for optimistic updates
    
    // Superadmin exports
    adminGroups,
    selectedCompanyId,
    setSelectedCompanyId,
    isSuperadminRole,
    isSuperadminGlobal
  };
}
