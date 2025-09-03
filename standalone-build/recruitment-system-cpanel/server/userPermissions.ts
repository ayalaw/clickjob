import { storage } from './storage';

// מערכת הרשאות מתקדמת
export interface UserPermissions {
  canViewClientNames: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canViewAllJobs: boolean;
  allowedJobIds: string[];
  restrictedPages: string[];
  roleType: string;
}

// קבל הרשאות משתמש
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    // קבל תפקידי המשתמש
    const userRoles = await storage.getUserRoles(userId);
    
    const permissions: UserPermissions = {
      canViewClientNames: false,
      canAccessSettings: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canViewAllJobs: false,
      allowedJobIds: [],
      restrictedPages: [],
      roleType: 'user'
    };

    for (const userRole of userRoles) {
      const roleType = userRole.role?.type || 'user';
      
      // הגדר הרשאות לפי סוג התפקיד
      switch (roleType) {
        case 'super_admin':
          // אדמין ראשי - הכל מותר
          permissions.canViewClientNames = true;
          permissions.canAccessSettings = true;
          permissions.canManageUsers = true;
          permissions.canViewAnalytics = true;
          permissions.canViewAllJobs = true;
          permissions.roleType = 'super_admin';
          break;
          
        case 'admin':
          // אדמין רגיל - הכל חוץ מניהול משתמשים
          permissions.canViewClientNames = true;
          permissions.canAccessSettings = true;
          permissions.canManageUsers = false;
          permissions.canViewAnalytics = true;
          permissions.canViewAllJobs = true;
          permissions.roleType = 'admin';
          break;
          
        case 'restricted_admin':
          // אדמין מוגבל - רואה הכל חוץ מדפים מסוימים
          permissions.canViewClientNames = true;
          permissions.canAccessSettings = false;
          permissions.canManageUsers = false;
          permissions.canViewAnalytics = true;
          permissions.canViewAllJobs = true;
          permissions.restrictedPages = ['settings', 'users'];
          permissions.roleType = 'restricted_admin';
          break;
          
        case 'job_viewer':
          // צופה משרות - רק משרות ללא שמות לקוחות
          permissions.canViewClientNames = false;
          permissions.canAccessSettings = false;
          permissions.canManageUsers = false;
          permissions.canViewAnalytics = false;
          permissions.canViewAllJobs = false;
          permissions.roleType = 'job_viewer';
          
          // קבל רשימת משרות מותרות
          if (userRole.allowedJobIds) {
            try {
              permissions.allowedJobIds = JSON.parse(userRole.allowedJobIds);
            } catch (e) {
              console.error('שגיאה בפענוח רשימת משרות מותרות:', e);
            }
          }
          break;
          
        case 'user':
        default:
          // משתמש רגיל - הרשאות בסיסיות
          permissions.canViewClientNames = true;
          permissions.canAccessSettings = false;
          permissions.canManageUsers = false;
          permissions.canViewAnalytics = false;
          permissions.canViewAllJobs = true;
          permissions.roleType = 'user';
          break;
      }
      
      // אם יש הגבלות נוספות
      if (userRole.restrictions) {
        const restrictions = userRole.restrictions as any;
        if (restrictions.restrictedPages) {
          permissions.restrictedPages = [...permissions.restrictedPages, ...restrictions.restrictedPages];
        }
      }
    }

    return permissions;
  } catch (error) {
    console.error('שגיאה בקבלת הרשאות משתמש:', error);
    // החזר הרשאות בסיסיות במקרה של שגיאה
    return {
      canViewClientNames: false,
      canAccessSettings: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canViewAllJobs: false,
      allowedJobIds: [],
      restrictedPages: [],
      roleType: 'user'
    };
  }
}

// בדוק אם המשתמש יכול לגשת לדף מסוים
export async function canAccessPage(userId: string, pageName: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return !permissions.restrictedPages.includes(pageName);
}

// בדוק אם המשתמש יכול לראות משרה מסוימת
export async function canViewJob(userId: string, jobId: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  
  // אם יכול לראות את כל המשרות
  if (permissions.canViewAllJobs) {
    return true;
  }
  
  // אם מוגבל למשרות מסוימות
  return permissions.allowedJobIds.includes(jobId);
}

// הוסף משרה למשתמש מוגבל
export async function addJobToUser(userId: string, jobId: string): Promise<boolean> {
  try {
    const userRoles = await storage.getUserRoles(userId);
    
    for (const userRole of userRoles) {
      if (userRole.role?.type === 'job_viewer') {
        let allowedJobs: string[] = [];
        
        if (userRole.allowedJobIds) {
          try {
            allowedJobs = JSON.parse(userRole.allowedJobIds);
          } catch (e) {
            console.error('שגיאה בפענוח רשימת משרות:', e);
          }
        }
        
        if (!allowedJobs.includes(jobId)) {
          allowedJobs.push(jobId);
          
          // עדכן במסד הנתונים
          await storage.updateUserRole(userRole.id, {
            allowedJobIds: JSON.stringify(allowedJobs)
          });
          
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('שגיאה בהוספת משרה למשתמש:', error);
    return false;
  }
}

// הסר משרה ממשתמש מוגבל
export async function removeJobFromUser(userId: string, jobId: string): Promise<boolean> {
  try {
    const userRoles = await storage.getUserRoles(userId);
    
    for (const userRole of userRoles) {
      if (userRole.role?.type === 'job_viewer') {
        let allowedJobs: string[] = [];
        
        if (userRole.allowedJobIds) {
          try {
            allowedJobs = JSON.parse(userRole.allowedJobIds);
          } catch (e) {
            console.error('שגיאה בפענוח רשימת משרות:', e);
          }
        }
        
        const index = allowedJobs.indexOf(jobId);
        if (index > -1) {
          allowedJobs.splice(index, 1);
          
          // עדכן במסד הנתונים
          await storage.updateUserRole(userRole.id, {
            allowedJobIds: JSON.stringify(allowedJobs)
          });
          
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('שגיאה בהסרת משרה ממשתמש:', error);
    return false;
  }
}

// צור משתמש עם הגבלות
export async function createRestrictedUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  roleType: 'job_viewer' | 'restricted_admin';
  allowedJobIds?: string[];
  restrictedPages?: string[];
}): Promise<string | null> {
  try {
    // צור את המשתמש
    const userId = await storage.createUser({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });
    
    // מצא את התפקיד המתאים
    const roles = await storage.getRoles();
    const role = roles.find(r => r.type === userData.roleType);
    
    if (!role) {
      throw new Error(`תפקיד ${userData.roleType} לא נמצא`);
    }
    
    // הקצה את התפקיד עם הגבלות
    await storage.assignRoleToUser({
      userId,
      roleId: role.id,
      assignedBy: 'system', // או ID של המשתמש המקצה
      allowedJobIds: userData.allowedJobIds ? JSON.stringify(userData.allowedJobIds) : undefined,
      restrictions: userData.restrictedPages ? { restrictedPages: userData.restrictedPages } : undefined
    });
    
    return userId;
  } catch (error) {
    console.error('שגיאה ביצירת משתמש מוגבל:', error);
    return null;
  }
}

// פילטר משרות לפי הרשאות המשתמש
export async function filterJobsByPermissions(userId: string, jobs: any[]): Promise<any[]> {
  const permissions = await getUserPermissions(userId);
  
  let filteredJobs = jobs;
  
  // אם לא יכול לראות את כל המשרות, פלטר לפי המותרות
  if (!permissions.canViewAllJobs) {
    filteredJobs = jobs.filter(job => permissions.allowedJobIds.includes(job.id));
  }
  
  // אם לא יכול לראות שמות לקוחות, הסתר אותם
  if (!permissions.canViewClientNames) {
    filteredJobs = filteredJobs.map(job => ({
      ...job,
      client: job.client ? {
        ...job.client,
        name: '*** מידע מוגבל ***',
        contactName: '*** מידע מוגבל ***',
        email: '*** מידע מוגבל ***',
        phone: '*** מידע מוגבל ***'
      } : null
    }));
  }
  
  return filteredJobs;
}