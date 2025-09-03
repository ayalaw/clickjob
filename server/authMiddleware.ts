import { Request, Response, NextFunction } from "express";
import { storage } from "./storage.js";

// Extend Express Request type to include user permissions
declare global {
  namespace Express {
    interface Request {
      userPermissions?: {
        hasPermission: (resource: string, action: string) => Promise<boolean>;
        hasRole: (roleType: string) => Promise<boolean>;
        isSuperAdmin: () => Promise<boolean>;
        isAdmin: () => Promise<boolean>;
        userId: string;
      };
    }
  }
}

/**
 * Middleware to check if user has required permission
 * @param resource - The resource being accessed (e.g., 'candidates', 'jobs')  
 * @param action - The action being performed (e.g., 'create', 'read', 'update', 'delete')
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser?.id) {
        return res.status(401).json({ message: "Unauthorized - No user found" });
      }

      const userId = sessionUser.id;
      const hasPermission = await storage.hasPermission(userId, resource, action);

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Forbidden - Missing permission: ${action} on ${resource}` 
        });
      }

      // Add permission helper functions to request
      req.userPermissions = {
        hasPermission: (res: string, act: string) => storage.hasPermission(userId, res, act),
        hasRole: (roleType: string) => storage.hasRole(userId, roleType),
        isSuperAdmin: () => storage.hasRole(userId, 'super_admin'),
        isAdmin: () => storage.hasRole(userId, 'admin'),
        userId
      };

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Internal server error during permission check" });
    }
  };
}

/**
 * Middleware to check if user has required role
 * @param roleType - The role type required ('super_admin', 'admin', 'user')
 */
export function requireRole(roleType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionUser = req.user as any;
      if (!sessionUser?.id) {
        return res.status(401).json({ message: "Unauthorized - No user found" });
      }

      const userId = sessionUser.id;
      const hasRole = await storage.hasRole(userId, roleType);

      if (!hasRole) {
        return res.status(403).json({ 
          message: `Forbidden - Required role: ${roleType}` 
        });
      }

      // Add permission helper functions to request
      req.userPermissions = {
        hasPermission: (res: string, act: string) => storage.hasPermission(userId, res, act),
        hasRole: (roleType: string) => storage.hasRole(userId, roleType),
        isSuperAdmin: () => storage.hasRole(userId, 'super_admin'),
        isAdmin: () => storage.hasRole(userId, 'admin'),
        userId
      };

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Internal server error during role check" });
    }
  };
}

/**
 * Middleware to inject user permissions without enforcing any specific permission
 * Useful for routes that need to check permissions conditionally
 */
export function injectUserPermissions(req: Request, res: Response, next: NextFunction) {
  const sessionUser = req.user as any;
  if (!sessionUser?.claims?.sub) {
    return next();
  }

  const userId = sessionUser.claims.sub;
  
  req.userPermissions = {
    hasPermission: (res: string, act: string) => storage.hasPermission(userId, res, act),
    hasRole: (roleType: string) => storage.hasRole(userId, roleType),
    isSuperAdmin: () => storage.hasRole(userId, 'super_admin'),
    isAdmin: () => storage.hasRole(userId, 'admin'),
    userId
  };

  next();
}

/**
 * Helper function to check multiple permissions
 * @param req - Express request object
 * @param permissions - Array of {resource, action} objects
 * @returns Promise<boolean> - true if user has ALL specified permissions
 */
export async function hasAllPermissions(
  req: Request, 
  permissions: Array<{resource: string, action: string}>
): Promise<boolean> {
  if (!req.userPermissions) return false;

  for (const permission of permissions) {
    const hasPermission = await req.userPermissions.hasPermission(
      permission.resource, 
      permission.action
    );
    if (!hasPermission) return false;
  }
  
  return true;
}

/**
 * Helper function to check if user has any of the specified permissions
 * @param req - Express request object
 * @param permissions - Array of {resource, action} objects
 * @returns Promise<boolean> - true if user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  req: Request, 
  permissions: Array<{resource: string, action: string}>
): Promise<boolean> {
  if (!req.userPermissions) return false;

  for (const permission of permissions) {
    const hasPermission = await req.userPermissions.hasPermission(
      permission.resource, 
      permission.action
    );
    if (hasPermission) return true;
  }
  
  return false;
}