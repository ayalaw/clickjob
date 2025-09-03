import { ReactNode } from "react";
import { useDetailedPermissions, type Permission } from "@/hooks/useDetailedPermissions";

interface PermissionWrapperProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

// רכיב עטיפה לבקרת הרשאות
export function PermissionWrapper({ 
  permission, 
  children, 
  fallback = null,
  className 
}: PermissionWrapperProps) {
  const { canAccessPage, canUseMenu, canViewComponent } = useDetailedPermissions();
  
  let hasPermission = false;
  
  // בדוק סוג ההרשאה וקרא לפונקציה המתאימה
  if (permission.startsWith('view_') || permission.startsWith('create_') || 
      permission.startsWith('edit_') || permission.startsWith('delete_') ||
      permission.startsWith('manage_') || permission.startsWith('access_')) {
    hasPermission = canAccessPage(permission as any);
  } else if (permission.startsWith('quick_') || permission.includes('_')) {
    hasPermission = canUseMenu(permission as any);
  } else {
    hasPermission = canViewComponent(permission as any);
  }
  
  if (!hasPermission) {
    return <div className={className}>{fallback}</div>;
  }
  
  return <div className={className}>{children}</div>;
}

// רכיב לבדיקת הרשאות מרובות
interface MultiPermissionWrapperProps {
  permissions: Permission[];
  requireAll?: boolean; // true = צריך כל ההרשאות, false = צריך לפחות אחת
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function MultiPermissionWrapper({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  className
}: MultiPermissionWrapperProps) {
  const { canAccessPage, canUseMenu, canViewComponent } = useDetailedPermissions();
  
  const checkPermission = (permission: Permission): boolean => {
    if (permission.startsWith('view_') || permission.startsWith('create_') || 
        permission.startsWith('edit_') || permission.startsWith('delete_') ||
        permission.startsWith('manage_') || permission.startsWith('access_')) {
      return canAccessPage(permission as any);
    } else if (permission.startsWith('quick_') || permission.includes('_')) {
      return canUseMenu(permission as any);
    } else {
      return canViewComponent(permission as any);
    }
  };
  
  const hasAccess = requireAll 
    ? permissions.every(permission => checkPermission(permission))
    : permissions.some(permission => checkPermission(permission));
  
  if (!hasAccess) {
    return <div className={className}>{fallback}</div>;
  }
  
  return <div className={className}>{children}</div>;
}

// Hook להסתרת מידע רגיש
export function useDataFiltering() {
  const { canViewClientNames, canViewJob, allowedJobIds, isJobViewer } = useDetailedPermissions();
  
  // סנן שמות לקוחות
  const filterClientName = (clientName: string | null | undefined): string => {
    if (!canViewClientNames && clientName) {
      return "*** מידע מוגבל ***";
    }
    return clientName || "";
  };
  
  // סנן פרטי לקוח מלאים
  const filterClientData = (client: any) => {
    if (!canViewClientNames && client) {
      return {
        ...client,
        name: "*** מידע מוגבל ***",
        contactName: "*** מידע מוגבל ***",
        email: "*** מידע מוגבל ***",
        phone: "*** מידע מוגבל ***",
        address: "*** מידע מוגבל ***"
      };
    }
    return client;
  };
  
  // סנן רשימת משרות
  const filterJobs = (jobs: any[]): any[] => {
    if (!jobs) return [];
    
    let filteredJobs = jobs;
    
    // אם יש הגבלה על משרות ספציפיות
    if (isJobViewer && allowedJobIds.length > 0) {
      filteredJobs = jobs.filter(job => allowedJobIds.includes(job.id));
    }
    
    // הסתר שמות לקוחות אם נדרש
    if (!canViewClientNames) {
      filteredJobs = filteredJobs.map(job => ({
        ...job,
        client: filterClientData(job.client)
      }));
    }
    
    return filteredJobs;
  };
  
  // סנן רשימת מועמדים (בעתיד - לפי משרות מותרות)
  const filterCandidates = (candidates: any[]): any[] => {
    if (!candidates) return [];
    
    // כרגע מחזיר הכל, אבל אפשר להוסיף לוגיקה לסינון
    // לפי מועמדים שהוגשו רק למשרות המותרות
    return candidates;
  };
  
  return {
    filterClientName,
    filterClientData,
    filterJobs,
    filterCandidates,
    canViewClientNames,
    isJobViewer,
    allowedJobIds
  };
}