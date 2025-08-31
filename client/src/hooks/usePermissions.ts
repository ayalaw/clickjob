import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  type: 'super_admin' | 'admin' | 'user';
  description?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  role: Role & {
    rolePermissions: Array<{
      permission: Permission;
    }>;
  };
}

export interface UserWithRoles {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userRoles: UserRole[];
}

export function usePermissions() {
  const { user, isLoading: authLoading } = useAuth();

  // Get user's roles and permissions
  const { data: userWithRoles, isLoading: rolesLoading } = useQuery<UserWithRoles>({
    queryKey: ['/api/users/roles', (user as any)?.id],
    enabled: !!(user as any)?.id && !authLoading,
  });

  // Helper function to check role (needed for other queries)
  const checkRole = (roleType: string): boolean => {
    if (!userWithRoles?.userRoles) return false;
    return userWithRoles.userRoles.some((userRole: UserRole) => 
      userRole.role.type === roleType
    );
  };

  // Get all available roles (for admin interface)
  const { data: allRoles, isLoading: allRolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    enabled: !!user && (checkRole('admin') || checkRole('super_admin')),
  });

  // Get all available permissions (for admin interface)
  const { data: allPermissions, isLoading: allPermissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
    enabled: !!user && (checkRole('admin') || checkRole('super_admin')),
  });

  // Check if user has a specific role
  function hasRole(roleType: string): boolean {
    if (!userWithRoles?.userRoles) return false;
    return userWithRoles.userRoles.some((userRole: UserRole) => 
      userRole.role.type === roleType
    );
  }

  // Check if user has a specific permission
  function hasPermission(resource: string, action: string): boolean {
    if (!userWithRoles?.userRoles) return false;
    
    // Super admin has all permissions
    if (hasRole('super_admin')) return true;

    // Check if any role has the required permission
    return userWithRoles.userRoles.some((userRole: UserRole) =>
      userRole.role.rolePermissions?.some((rolePermission: any) =>
        rolePermission.permission.resource === resource &&
        rolePermission.permission.action === action
      )
    );
  }

  // Get user's permissions list
  function getUserPermissions(): Permission[] {
    if (!userWithRoles?.userRoles) return [];

    const permissions: Permission[] = [];
    userWithRoles.userRoles.forEach((userRole: UserRole) => {
      userRole.role.rolePermissions?.forEach((rolePermission: any) => {
        if (!permissions.find(p => p.id === rolePermission.permission.id)) {
          permissions.push(rolePermission.permission);
        }
      });
    });

    return permissions;
  }

  // Get user's roles list
  function getUserRoles(): Role[] {
    if (!userWithRoles?.userRoles) return [];
    return userWithRoles.userRoles.map((userRole: UserRole) => userRole.role);
  }

  // Admin helper functions
  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');
  const canManageUsers = hasPermission('users', 'read') || isAdmin;
  const canManageRoles = hasRole('super_admin');

  return {
    // Loading states
    isLoading: authLoading || rolesLoading,
    allRolesLoading,
    allPermissionsLoading,

    // User data
    userWithRoles,
    allRoles: allRoles || [],
    allPermissions: allPermissions || [],

    // Permission check functions
    hasRole,
    hasPermission,
    getUserPermissions,
    getUserRoles,

    // Convenience flags
    isAdmin,
    isSuperAdmin,
    canManageUsers,
    canManageRoles,

    // Specific permissions
    canReadCandidates: hasPermission('candidates', 'read'),
    canCreateCandidates: hasPermission('candidates', 'create'),
    canUpdateCandidates: hasPermission('candidates', 'update'),
    canDeleteCandidates: hasPermission('candidates', 'delete'),

    canReadJobs: hasPermission('jobs', 'read'),
    canCreateJobs: hasPermission('jobs', 'create'),
    canUpdateJobs: hasPermission('jobs', 'update'),
    canDeleteJobs: hasPermission('jobs', 'delete'),

    canReadClients: hasPermission('clients', 'read'),
    canCreateClients: hasPermission('clients', 'create'),
    canUpdateClients: hasPermission('clients', 'update'),
    canDeleteClients: hasPermission('clients', 'delete'),

    canReadTasks: hasPermission('tasks', 'read'),
    canCreateTasks: hasPermission('tasks', 'create'),
    canUpdateTasks: hasPermission('tasks', 'update'),
    canDeleteTasks: hasPermission('tasks', 'delete'),

    canViewDashboard: hasPermission('dashboard', 'read'),
  };
}