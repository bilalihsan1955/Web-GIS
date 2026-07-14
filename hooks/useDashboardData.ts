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
  
  // Get global role and company selection from store
  const userRole = useDashboardStore((s) => s.userRole) || 'user';
  const setUserRole = useDashboardStore((s) => s.setUserRole);
  
  const [currentUserGroupId, setCurrentUserGroupId] = useState<string>('');
  
  const [totalNodes, setTotalNodes] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Superadmin specific states
  const [adminGroups, setAdminGroups] = useState<{user_id: string, company_name: string | null, email: string, company_logo: string | null}[]>([]);
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const setSelectedCompanyId = useDashboardStore((s) => s.setSelectedCompanyId);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Get Session first
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserRole = 'user';
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
        localUserGroupId = roleData.parent_admin_id || user.id;
        setCurrentUserGroupId(localUserGroupId);
      } else {
        localUserGroupId = user.id;
        setCurrentUserGroupId(localUserGroupId);
      }

      // If Superadmin, fetch all admin groups for the company selector
      if (currentUserRole === 'superadmin') {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id, company_name, email, company_logo')
          .eq('role', 'admin') // strictly only Admins are considered Companies
          .is('parent_admin_id', null) // Only fetch true Company Owners, not Co-Admins
          .order('company_name', { ascending: true });
        
        if (admins) {
          setAdminGroups(admins);
        }
      }
      
      setIsRoleLoaded(true);
    } else {
      setIsRoleLoaded(true);
    }

    const { data: spatialNodes } = await supabase
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
      // Filter the nodes so that regular admins/users only see nodes from their group
      const filteredByGroup = spatialNodes.filter((node: any) => {
        // If the creator has a parent_admin_id (Co-Admin or User), that is the group. Otherwise, they are the owner.
        // Supabase joins can sometimes return arrays or objects depending on the foreign key relationship cardinality detection.
        const creatorData = Array.isArray(node.creator) ? node.creator[0] : node.creator;
        const nodeCreatorGroupId = creatorData?.parent_admin_id || node.created_by;

        if (currentUserRole === 'superadmin') {
          // If superadmin has selected a specific company, filter by that company
          if (selectedCompanyId !== 'all') {
            return nodeCreatorGroupId === selectedCompanyId;
          }
          return true; // global view
        }
          
        return nodeCreatorGroupId === localUserGroupId;
      });

      setNodes(filteredByGroup);
      setTotalNodes(filteredByGroup.length);
      const uniqueLocs = new Set(filteredByGroup.map((n: any) => n.location_id));
      setTotalLocations(uniqueLocs.size);
    }
    if (locs) {
      setLocations(locs);
    }
    setLoading(false);
  }, [supabase, selectedCompanyId]);

  useEffect(() => {
    setIsMounted(true);
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
    setSelectedCompanyId
  };
}
