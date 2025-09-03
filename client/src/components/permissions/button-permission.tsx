import { Button, type ButtonProps } from "@/components/ui/button";
import { useDetailedPermissions, type Permission } from "@/hooks/useDetailedPermissions";
import { ReactNode } from "react";

interface PermissionButtonProps extends ButtonProps {
  permission: Permission;
  fallback?: ReactNode;
  hideWhenNoAccess?: boolean; // true = מסתיר כפתור, false = מציג כפתור מושבת
}

// כפתור עם הרשאות
export function PermissionButton({
  permission,
  children,
  fallback = null,
  hideWhenNoAccess = false,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { canAccessPage, canUseMenu, canViewComponent } = useDetailedPermissions();
  
  let hasPermission = false;
  
  // בדוק סוג ההרשאה
  if (permission.startsWith('view_') || permission.startsWith('create_') || 
      permission.startsWith('edit_') || permission.startsWith('delete_') ||
      permission.startsWith('manage_') || permission.startsWith('access_')) {
    hasPermission = canAccessPage(permission as any);
  } else if (permission.startsWith('quick_') || permission.includes('_')) {
    hasPermission = canUseMenu(permission as any);
  } else {
    hasPermission = canViewComponent(permission as any);
  }
  
  // אם אין הרשאה
  if (!hasPermission) {
    if (hideWhenNoAccess) {
      return <>{fallback}</>;
    }
    
    // מציג כפתור מושבת
    return (
      <Button 
        {...props} 
        disabled={true}
        variant="outline"
        className="opacity-50 cursor-not-allowed"
        title="אין הרשאה לפעולה זו"
      >
        {children}
      </Button>
    );
  }
  
  return (
    <Button {...props} disabled={disabled}>
      {children}
    </Button>
  );
}

// כפתורי פעולה נפוצים עם הרשאות
export function AddButton({ children, ...props }: Omit<PermissionButtonProps, 'permission'>) {
  return (
    <PermissionButton permission="create_candidates" {...props}>
      {children || "הוסף"}
    </PermissionButton>
  );
}

export function EditButton({ children, ...props }: Omit<PermissionButtonProps, 'permission'>) {
  return (
    <PermissionButton permission="edit_candidates" {...props}>
      {children || "ערוך"}
    </PermissionButton>
  );
}

export function DeleteButton({ children, ...props }: Omit<PermissionButtonProps, 'permission'>) {
  return (
    <PermissionButton permission="delete_candidates" {...props}>
      {children || "מחק"}
    </PermissionButton>
  );
}

export function ExportButton({ children, ...props }: Omit<PermissionButtonProps, 'permission'>) {
  return (
    <PermissionButton permission="export_data" {...props}>
      {children || "ייצא"}
    </PermissionButton>
  );
}

export function SettingsButton({ children, ...props }: Omit<PermissionButtonProps, 'permission'>) {
  return (
    <PermissionButton permission="access_settings" {...props}>
      {children || "הגדרות"}
    </PermissionButton>
  );
}