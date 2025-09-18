import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Building2, Briefcase, Mail, BarChart3, Settings, UserCheck, Search, Menu, Calendar, Shield, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useDetailedPermissions } from "@/hooks/useDetailedPermissions";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "לוח בקרה", href: "/", icon: LayoutDashboard },
  { name: "מאגר מועמדים", href: "/candidates", icon: Users },
  { name: "חיפוש בקורות חיים", href: "/cv-search", icon: Search },
  { name: "יומן", href: "/calendar", icon: Calendar },
  { name: "מאגר לקוחות", href: "/clients", icon: Building2 },
  { name: "מאגר משרות", href: "/jobs", icon: Briefcase },
  { name: "ראיונות", href: "/interviews", icon: UserCheck },
  { name: "מערכת מיילים", href: "/emails", icon: Mail },
  { name: "הגדרות מייל", href: "/email-settings", icon: Settings },
  { name: "דוחות ואנליטיקה", href: "/reports", icon: BarChart3 },
  { name: "הגדרות מערכת", href: "/settings", icon: Settings },
];

export default function Navbar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { canManageUsers } = usePermissions();
  const { getAllowedNavigation, canViewComponent } = useDetailedPermissions();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        queryClient.clear();
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary">מערכת ניהול גיוס</h1>
            <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">חברת גיוס מתקדמת</span>
          </div>

          {/* User Info and Logout */}
          <div className="hidden lg:flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'משתמש'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">מנהל גיוס</p>
              </div>
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` || 'מ' : 'מ'}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 ml-2" />
              יציאה
            </Button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8 space-x-reverse">
            {getAllowedNavigation().map((item) => {
              // ממפה אייקונים לפי שם
              const getIcon = (iconName: string) => {
                switch (iconName) {
                  case 'LayoutDashboard': return LayoutDashboard;
                  case 'Users': return Users;
                  case 'Search': return Search;
                  case 'Calendar': return Calendar;
                  case 'Building2': return Building2;
                  case 'Briefcase': return Briefcase;
                  case 'UserCheck': return UserCheck;
                  case 'Mail': return Mail;
                  case 'Settings': return Settings;
                  case 'BarChart3': return BarChart3;
                  case 'Shield': return Shield;
                  default: return Settings;
                }
              };
              
              const Icon = getIcon(item.icon);
              const isActive = location === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "text-primary bg-blue-50 dark:bg-blue-900/20" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  data-testid={`link-nav-${item.href === '/' ? 'dashboard' : item.href.slice(1)}`}
                >
                  <Icon className="h-4 w-4 ml-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2 space-x-reverse">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              data-testid="button-logout-mobile"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {navigation
                  .filter((item) => {
                    // Show user management only if user has permission
                    if (item.href === '/user-management') {
                      return canManageUsers;
                    }
                    return true;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center w-full px-2 py-2",
                            isActive && "bg-blue-50 dark:bg-blue-900/20"
                          )}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4 ml-2" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-2 py-2 text-red-600 hover:text-red-800"
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                    יציאה
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}