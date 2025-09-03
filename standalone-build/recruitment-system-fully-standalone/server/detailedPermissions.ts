// מערכת הרשאות מפורטת לכל דף ותפריט במערכת

export const PAGE_PERMISSIONS = {
  // דפים ראשיים
  DASHBOARD: 'view_dashboard',
  CANDIDATES: 'view_candidates', 
  ADD_CANDIDATE: 'create_candidates',
  CANDIDATE_DETAIL: 'view_candidate_details',
  EDIT_CANDIDATE: 'edit_candidates',
  DELETE_CANDIDATE: 'delete_candidates',
  
  // חיפוש וניתוח
  CV_SEARCH: 'view_cv_search',
  CALENDAR: 'view_calendar',
  
  // לקוחות ומשרות
  CLIENTS: 'view_clients',
  CREATE_CLIENT: 'create_clients',
  EDIT_CLIENT: 'edit_clients',
  DELETE_CLIENT: 'delete_clients',
  
  JOBS: 'view_jobs',
  CREATE_JOB: 'create_jobs',
  EDIT_JOB: 'edit_jobs',
  DELETE_JOB: 'delete_jobs',
  
  // ראיונות
  INTERVIEWS: 'view_interviews',
  SCHEDULE_INTERVIEW: 'schedule_interviews',
  MANAGE_INTERVIEW: 'manage_interviews',
  
  // מערכת מיילים
  EMAILS: 'view_emails',
  SEND_EMAIL: 'send_emails',
  EMAIL_SETTINGS: 'manage_email_settings',
  
  // הגדרות ומנהל
  SYSTEM_SETTINGS: 'manage_system_settings',
  USER_MANAGEMENT: 'manage_users',
  SETTINGS: 'access_settings',
  
  // דוחות ואנליטיקה
  REPORTS: 'view_reports',
  ANALYTICS: 'view_analytics'
} as const;

export const MENU_PERMISSIONS = {
  // תפריט ניווט ראשי
  MAIN_NAVIGATION: 'view_main_navigation',
  
  // כפתורי פעולה מהירה
  QUICK_ACTIONS: 'view_quick_actions',
  ADD_CANDIDATE_QUICK: 'quick_add_candidate',
  ADD_JOB_QUICK: 'quick_add_job',
  ADD_CLIENT_QUICK: 'quick_add_client',
  
  // פעולות בטבלאות
  VIEW_CLIENT_NAMES: 'view_client_names', // הסתרת שמות לקוחות
  EXPORT_DATA: 'export_data',
  BULK_ACTIONS: 'perform_bulk_actions',
  
  // פעולות על מועמדים
  UPLOAD_CV: 'upload_cv',
  DOWNLOAD_CV: 'download_cv',
  ADD_NOTES: 'add_candidate_notes',
  VIEW_CANDIDATE_HISTORY: 'view_candidate_history',
  SEND_CANDIDATE_EMAIL: 'send_candidate_email',
  
  // פעולות על משרות
  CLOSE_JOB: 'close_jobs',
  ASSIGN_CANDIDATE_TO_JOB: 'assign_candidates',
  VIEW_JOB_ANALYTICS: 'view_job_analytics',
  
  // פעולות מתקדמות
  OCR_PROCESSING: 'use_ocr_processing',
  ADVANCED_SEARCH: 'use_advanced_search',
  SYSTEM_BACKUP: 'perform_system_backup',
  VIEW_SYSTEM_LOGS: 'view_system_logs'
} as const;

export const COMPONENT_PERMISSIONS = {
  // רכיבי ממשק
  SIDEBAR: 'view_sidebar',
  NAVBAR: 'view_navbar',
  USER_DROPDOWN: 'view_user_dropdown',
  NOTIFICATIONS: 'view_notifications',
  
  // כפתורים ופעולות
  LOGOUT_BUTTON: 'access_logout',
  PROFILE_SETTINGS: 'access_profile',
  HELP_SECTION: 'view_help',
  
  // טבלאות ונתונים
  CANDIDATE_TABLE: 'view_candidate_table',
  JOB_TABLE: 'view_job_table',
  CLIENT_TABLE: 'view_client_table',
  STATS_DASHBOARD: 'view_statistics',
  
  // פילטרים וחיפוש
  SEARCH_FILTERS: 'use_search_filters',
  SORT_OPTIONS: 'use_sort_options',
  PAGINATION: 'use_pagination'
} as const;

// הגדרת הרשאות לפי תפקיד
export const ROLE_PERMISSIONS = {
  super_admin: [
    // גישה מלאה לכל ההרשאות
    ...Object.values(PAGE_PERMISSIONS),
    ...Object.values(MENU_PERMISSIONS),
    ...Object.values(COMPONENT_PERMISSIONS)
  ],
  
  admin: [
    // כמעט הכל חוץ מניהול משתמשים מתקדם
    PAGE_PERMISSIONS.DASHBOARD,
    PAGE_PERMISSIONS.CANDIDATES,
    PAGE_PERMISSIONS.ADD_CANDIDATE,
    PAGE_PERMISSIONS.CANDIDATE_DETAIL,
    PAGE_PERMISSIONS.EDIT_CANDIDATE,
    PAGE_PERMISSIONS.CV_SEARCH,
    PAGE_PERMISSIONS.CALENDAR,
    PAGE_PERMISSIONS.CLIENTS,
    PAGE_PERMISSIONS.CREATE_CLIENT,
    PAGE_PERMISSIONS.EDIT_CLIENT,
    PAGE_PERMISSIONS.JOBS,
    PAGE_PERMISSIONS.CREATE_JOB,
    PAGE_PERMISSIONS.EDIT_JOB,
    PAGE_PERMISSIONS.INTERVIEWS,
    PAGE_PERMISSIONS.SCHEDULE_INTERVIEW,
    PAGE_PERMISSIONS.MANAGE_INTERVIEW,
    PAGE_PERMISSIONS.EMAILS,
    PAGE_PERMISSIONS.SEND_EMAIL,
    PAGE_PERMISSIONS.EMAIL_SETTINGS,
    PAGE_PERMISSIONS.REPORTS,
    PAGE_PERMISSIONS.ANALYTICS,
    
    // תפריטים ורכיבים
    ...Object.values(MENU_PERMISSIONS),
    ...Object.values(COMPONENT_PERMISSIONS)
  ],
  
  restricted_admin: [
    // אדמין מוגבל - אין גישה להגדרות מערכת וניהול משתמשים
    PAGE_PERMISSIONS.DASHBOARD,
    PAGE_PERMISSIONS.CANDIDATES,
    PAGE_PERMISSIONS.ADD_CANDIDATE,
    PAGE_PERMISSIONS.CANDIDATE_DETAIL,
    PAGE_PERMISSIONS.EDIT_CANDIDATE,
    PAGE_PERMISSIONS.CV_SEARCH,
    PAGE_PERMISSIONS.CALENDAR,
    PAGE_PERMISSIONS.CLIENTS,
    PAGE_PERMISSIONS.CREATE_CLIENT,
    PAGE_PERMISSIONS.EDIT_CLIENT,
    PAGE_PERMISSIONS.JOBS,
    PAGE_PERMISSIONS.CREATE_JOB,
    PAGE_PERMISSIONS.EDIT_JOB,
    PAGE_PERMISSIONS.INTERVIEWS,
    PAGE_PERMISSIONS.SCHEDULE_INTERVIEW,
    PAGE_PERMISSIONS.MANAGE_INTERVIEW,
    PAGE_PERMISSIONS.EMAILS,
    PAGE_PERMISSIONS.SEND_EMAIL,
    PAGE_PERMISSIONS.REPORTS,
    PAGE_PERMISSIONS.ANALYTICS,
    
    // רכיבי ממשק בסיסיים
    COMPONENT_PERMISSIONS.SIDEBAR,
    COMPONENT_PERMISSIONS.NAVBAR,
    COMPONENT_PERMISSIONS.USER_DROPDOWN,
    COMPONENT_PERMISSIONS.NOTIFICATIONS,
    COMPONENT_PERMISSIONS.LOGOUT_BUTTON,
    COMPONENT_PERMISSIONS.CANDIDATE_TABLE,
    COMPONENT_PERMISSIONS.JOB_TABLE,
    COMPONENT_PERMISSIONS.CLIENT_TABLE,
    COMPONENT_PERMISSIONS.STATS_DASHBOARD,
    COMPONENT_PERMISSIONS.SEARCH_FILTERS,
    COMPONENT_PERMISSIONS.SORT_OPTIONS,
    COMPONENT_PERMISSIONS.PAGINATION,
    
    // פעולות בסיסיות
    MENU_PERMISSIONS.MAIN_NAVIGATION,
    MENU_PERMISSIONS.QUICK_ACTIONS,
    MENU_PERMISSIONS.ADD_CANDIDATE_QUICK,
    MENU_PERMISSIONS.ADD_JOB_QUICK,
    MENU_PERMISSIONS.ADD_CLIENT_QUICK,
    MENU_PERMISSIONS.VIEW_CLIENT_NAMES,
    MENU_PERMISSIONS.UPLOAD_CV,
    MENU_PERMISSIONS.DOWNLOAD_CV,
    MENU_PERMISSIONS.ADD_NOTES,
    MENU_PERMISSIONS.VIEW_CANDIDATE_HISTORY,
    MENU_PERMISSIONS.SEND_CANDIDATE_EMAIL,
    MENU_PERMISSIONS.ASSIGN_CANDIDATE_TO_JOB,
    MENU_PERMISSIONS.OCR_PROCESSING,
    MENU_PERMISSIONS.ADVANCED_SEARCH
  ],
  
  job_viewer: [
    // צופה משרות - גישה מוגבלת למשרות בלבד, ללא פרטי לקוחות
    PAGE_PERMISSIONS.DASHBOARD,
    PAGE_PERMISSIONS.CANDIDATES,
    PAGE_PERMISSIONS.CANDIDATE_DETAIL, // רק למועמדים של המשרות המותרות
    PAGE_PERMISSIONS.JOBS, // רק למשרות המותרות
    PAGE_PERMISSIONS.INTERVIEWS, // רק לראיונות של המשרות המותרות
    PAGE_PERMISSIONS.CV_SEARCH,
    
    // רכיבי ממשק בסיסיים
    COMPONENT_PERMISSIONS.SIDEBAR,
    COMPONENT_PERMISSIONS.NAVBAR,
    COMPONENT_PERMISSIONS.USER_DROPDOWN,
    COMPONENT_PERMISSIONS.LOGOUT_BUTTON,
    COMPONENT_PERMISSIONS.CANDIDATE_TABLE,
    COMPONENT_PERMISSIONS.JOB_TABLE,
    COMPONENT_PERMISSIONS.SEARCH_FILTERS,
    COMPONENT_PERMISSIONS.SORT_OPTIONS,
    COMPONENT_PERMISSIONS.PAGINATION,
    
    // פעולות מוגבלות
    MENU_PERMISSIONS.MAIN_NAVIGATION,
    MENU_PERMISSIONS.UPLOAD_CV,
    MENU_PERMISSIONS.DOWNLOAD_CV,
    MENU_PERMISSIONS.ADD_NOTES,
    MENU_PERMISSIONS.VIEW_CANDIDATE_HISTORY,
    MENU_PERMISSIONS.OCR_PROCESSING,
    
    // בלי גישה לשמות לקוחות!
    // MENU_PERMISSIONS.VIEW_CLIENT_NAMES - לא כלול!
  ],
  
  user: [
    // משתמש רגיל - גישה בסיסית
    PAGE_PERMISSIONS.DASHBOARD,
    PAGE_PERMISSIONS.CANDIDATES,
    PAGE_PERMISSIONS.CANDIDATE_DETAIL,
    PAGE_PERMISSIONS.CV_SEARCH,
    PAGE_PERMISSIONS.CALENDAR,
    PAGE_PERMISSIONS.JOBS,
    PAGE_PERMISSIONS.INTERVIEWS,
    
    // רכיבי ממשק בסיסיים
    COMPONENT_PERMISSIONS.SIDEBAR,
    COMPONENT_PERMISSIONS.NAVBAR,
    COMPONENT_PERMISSIONS.USER_DROPDOWN,
    COMPONENT_PERMISSIONS.LOGOUT_BUTTON,
    COMPONENT_PERMISSIONS.CANDIDATE_TABLE,
    COMPONENT_PERMISSIONS.JOB_TABLE,
    COMPONENT_PERMISSIONS.SEARCH_FILTERS,
    COMPONENT_PERMISSIONS.SORT_OPTIONS,
    COMPONENT_PERMISSIONS.PAGINATION,
    
    // פעולות קריאה בלבד
    MENU_PERMISSIONS.MAIN_NAVIGATION,
    MENU_PERMISSIONS.VIEW_CLIENT_NAMES,
    MENU_PERMISSIONS.DOWNLOAD_CV,
    MENU_PERMISSIONS.VIEW_CANDIDATE_HISTORY
  ]
} as const;

// בדוק האם למשתמש יש הרשאה ספציפית
export function hasPermission(userRoleTypes: string[], permission: string): boolean {
  for (const roleType of userRoleTypes) {
    const rolePermissions = ROLE_PERMISSIONS[roleType as keyof typeof ROLE_PERMISSIONS];
    if (rolePermissions && rolePermissions.includes(permission as any)) {
      return true;
    }
  }
  return false;
}

// קבל רשימת הרשאות למשתמש
export function getUserPermissions(userRoleTypes: string[]): string[] {
  const permissions = new Set<string>();
  
  for (const roleType of userRoleTypes) {
    const rolePermissions = ROLE_PERMISSIONS[roleType as keyof typeof ROLE_PERMISSIONS];
    if (rolePermissions) {
      rolePermissions.forEach(permission => permissions.add(permission));
    }
  }
  
  return Array.from(permissions);
}

// בדוק אם יכול לגשת לדף
export function canAccessPage(userRoleTypes: string[], pageName: string): boolean {
  const pagePermission = PAGE_PERMISSIONS[pageName as keyof typeof PAGE_PERMISSIONS];
  if (!pagePermission) {
    return false; // דף לא מוכר - אין גישה
  }
  
  return hasPermission(userRoleTypes, pagePermission);
}

// בדוק אם יכול להשתמש בתפריט/כפתור
export function canUseMenu(userRoleTypes: string[], menuName: string): boolean {
  const menuPermission = MENU_PERMISSIONS[menuName as keyof typeof MENU_PERMISSIONS];
  if (!menuPermission) {
    return false; // תפריט לא מוכר - אין גישה
  }
  
  return hasPermission(userRoleTypes, menuPermission);
}

// בדוק אם יכול לראות רכיב
export function canViewComponent(userRoleTypes: string[], componentName: string): boolean {
  const componentPermission = COMPONENT_PERMISSIONS[componentName as keyof typeof COMPONENT_PERMISSIONS];
  if (!componentPermission) {
    return true; // רכיב לא מוגדר - ברירת מחדל מותר
  }
  
  return hasPermission(userRoleTypes, componentPermission);
}