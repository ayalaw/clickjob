import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

// הגדרת סוגי ההרשאות
export type PagePermission = 
  | 'view_dashboard'
  | 'view_candidates' 
  | 'create_candidates'
  | 'view_candidate_details'
  | 'edit_candidates'
  | 'delete_candidates'
  | 'view_cv_search'
  | 'view_calendar'
  | 'view_clients'
  | 'create_clients'
  | 'edit_clients'
  | 'delete_clients'
  | 'view_jobs'
  | 'create_jobs'
  | 'edit_jobs'
  | 'delete_jobs'
  | 'view_interviews'
  | 'schedule_interviews'
  | 'manage_interviews'
  | 'view_emails'
  | 'send_emails'
  | 'manage_email_settings'
  | 'manage_system_settings'
  | 'manage_users'
  | 'access_settings'
  | 'view_reports'
  | 'view_analytics';

export type MenuPermission = 
  | 'view_main_navigation'
  | 'view_quick_actions'
  | 'quick_add_candidate'
  | 'quick_add_job'
  | 'quick_add_client'
  | 'view_client_names'
  | 'export_data'
  | 'perform_bulk_actions'
  | 'upload_cv'
  | 'download_cv'
  | 'add_candidate_notes'
  | 'view_candidate_history'
  | 'send_candidate_email'
  | 'close_jobs'
  | 'assign_candidates'
  | 'view_job_analytics'
  | 'use_ocr_processing'
  | 'use_advanced_search'
  | 'perform_system_backup'
  | 'view_system_logs';

export type ComponentPermission = 
  | 'view_sidebar'
  | 'view_navbar'
  | 'view_user_dropdown'
  | 'view_notifications'
  | 'access_logout'
  | 'access_profile'
  | 'view_help'
  | 'view_candidate_table'
  | 'view_job_table'
  | 'view_client_table'
  | 'view_statistics'
  | 'use_search_filters'
  | 'use_sort_options'
  | 'use_pagination';

export type Permission = PagePermission | MenuPermission | ComponentPermission;

interface UserPermissions {
  pages: PagePermission[];
  menus: MenuPermission[];
  components: ComponentPermission[];
  roleTypes: string[];
  canViewClientNames: boolean;
  allowedJobIds: string[];
}

export function useDetailedPermissions() {
  const { user, isAuthenticated } = useAuth();

  // קבל הרשאות מפורטות מהשרת
  const { data: permissions, isLoading } = useQuery<UserPermissions>({
    queryKey: ['/api/permissions/detailed', user?.id],
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 דקות
  });

  // בדוק הרשאת דף
  const canAccessPage = (page: PagePermission): boolean => {
    if (!permissions) return false;
    return permissions.pages.includes(page);
  };

  // בדוק הרשאת תפריט/כפתור
  const canUseMenu = (menu: MenuPermission): boolean => {
    if (!permissions) return false;
    return permissions.menus.includes(menu);
  };

  // בדוק הרשאת רכיב
  const canViewComponent = (component: ComponentPermission): boolean => {
    if (!permissions) return true; // ברירת מחדל מותר
    return permissions.components.includes(component);
  };

  // בדוק אם יכול לראות שמות לקוחות
  const canViewClientNames = (): boolean => {
    if (!permissions) return false;
    return permissions.canViewClientNames;
  };

  // בדוק אם יכול לראות משרה מסוימת
  const canViewJob = (jobId: string): boolean => {
    if (!permissions) return false;
    
    // אם יש הרשאה לראות את כל המשרות
    if (canAccessPage('view_jobs') && permissions.allowedJobIds.length === 0) {
      return true;
    }
    
    // אם מוגבל למשרות מסוימות
    return permissions.allowedJobIds.includes(jobId);
  };

  // קבל רשימת דפי ניווט מותרים
  const getAllowedNavigation = () => {
    if (!permissions) return [];

    const navigation = [
      { 
        permission: 'view_dashboard' as PagePermission, 
        name: "לוח בקרה", 
        href: "/", 
        icon: "LayoutDashboard" 
      },
      { 
        permission: 'view_candidates' as PagePermission, 
        name: "מאגר מועמדים", 
        href: "/candidates", 
        icon: "Users" 
      },
      { 
        permission: 'view_cv_search' as PagePermission, 
        name: "חיפוש בקורות חיים", 
        href: "/cv-search", 
        icon: "Search" 
      },
      { 
        permission: 'view_calendar' as PagePermission, 
        name: "יומן", 
        href: "/calendar", 
        icon: "Calendar" 
      },
      { 
        permission: 'view_clients' as PagePermission, 
        name: "מאגר לקוחות", 
        href: "/clients", 
        icon: "Building2" 
      },
      { 
        permission: 'view_jobs' as PagePermission, 
        name: "מאגר משרות", 
        href: "/jobs", 
        icon: "Briefcase" 
      },
      { 
        permission: 'view_interviews' as PagePermission, 
        name: "ראיונות", 
        href: "/interviews", 
        icon: "UserCheck" 
      },
      { 
        permission: 'view_emails' as PagePermission, 
        name: "מערכת מיילים", 
        href: "/emails", 
        icon: "Mail" 
      },
      { 
        permission: 'manage_email_settings' as PagePermission, 
        name: "הגדרות מייל", 
        href: "/email-settings", 
        icon: "Settings" 
      },
      { 
        permission: 'view_reports' as PagePermission, 
        name: "דוחות ואנליטיקה", 
        href: "/reports", 
        icon: "BarChart3" 
      },
      { 
        permission: 'access_settings' as PagePermission, 
        name: "הגדרות מערכת", 
        href: "/settings", 
        icon: "Settings" 
      },
      { 
        permission: 'manage_users' as PagePermission, 
        name: "ניהול משתמשים", 
        href: "/user-management", 
        icon: "Shield" 
      }
    ];

    return navigation.filter(item => canAccessPage(item.permission));
  };

  // בדוק אם משתמש הוא אדמין ראשי
  const isSuperAdmin = (): boolean => {
    if (!permissions) return false;
    return permissions.roleTypes.includes('super_admin');
  };

  // בדוק אם משתמש הוא אדמין (כל סוג)
  const isAdmin = (): boolean => {
    if (!permissions) return false;
    return permissions.roleTypes.some(role => 
      ['super_admin', 'admin', 'restricted_admin'].includes(role)
    );
  };

  // בדוק אם משתמש הוא צופה משרות בלבד
  const isJobViewer = (): boolean => {
    if (!permissions) return false;
    return permissions.roleTypes.includes('job_viewer');
  };

  return {
    permissions,
    isLoading,
    
    // פונקציות בדיקת הרשאות
    canAccessPage,
    canUseMenu,
    canViewComponent,
    canViewClientNames,
    canViewJob,
    
    // פונקציות עזר
    getAllowedNavigation,
    isSuperAdmin,
    isAdmin,
    isJobViewer,
    
    // נתונים גולמיים
    userRoleTypes: permissions?.roleTypes || [],
    allowedJobIds: permissions?.allowedJobIds || []
  };
}

// Hook מקוצר לבדיקות מהירות
export function usePermissionCheck() {
  const { canAccessPage, canUseMenu, canViewComponent } = useDetailedPermissions();
  
  return {
    // בדיקות דפים נפוצות
    canManageCandidates: canAccessPage('create_candidates') && canAccessPage('edit_candidates'),
    canManageJobs: canAccessPage('create_jobs') && canAccessPage('edit_jobs'),
    canManageClients: canAccessPage('create_clients') && canAccessPage('edit_clients'),
    canManageUsers: canAccessPage('manage_users'),
    canManageSettings: canAccessPage('manage_system_settings'),
    
    // בדיקות תפריטים נפוצות
    canQuickAdd: canUseMenu('view_quick_actions'),
    canViewClientNames: canUseMenu('view_client_names'),
    canExportData: canUseMenu('export_data'),
    canUseAdvancedSearch: canUseMenu('use_advanced_search'),
    
    // בדיקות רכיבים נפוצות
    canViewSidebar: canViewComponent('view_sidebar'),
    canViewNavbar: canViewComponent('view_navbar'),
    canViewStats: canViewComponent('view_statistics')
  };
}