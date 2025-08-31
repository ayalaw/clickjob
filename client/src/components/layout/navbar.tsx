import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Building2, Briefcase, Mail, BarChart3, Settings, UserCheck, Search, Menu, Calendar, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
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
  { name: "סינון ראיונות", href: "/interviews", icon: UserCheck },
  { name: "מערכת מיילים", href: "/emails", icon: Mail },
  { name: "הגדרות מייל", href: "/email-settings", icon: Settings },
  { name: "ניהול משתמשים", href: "/user-management", icon: Shield },
  { name: "דוחות ואנליטיקה", href: "/reports", icon: BarChart3 },
  { name: "הגדרות מערכת", href: "/settings", icon: Settings },
];

export default function Navbar() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { canManageUsers } = usePermissions();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary">מערכת ניהול גיוס</h1>
            <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">חברת גיוס מתקדמת</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8 space-x-reverse">
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
          <div className="lg:hidden flex items-center">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}