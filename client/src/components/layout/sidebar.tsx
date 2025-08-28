import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Building2, Briefcase, Mail, BarChart3, Settings, UserCheck, Search, Calendar } from "lucide-react";

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
  { name: "דוחות ואנליטיקה", href: "/reports", icon: BarChart3 },
  { name: "הגדרות מערכת", href: "/system-settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="bg-surface w-64 shadow-lg border-l border-gray-200 dark:border-gray-700 flex-shrink-0 sidebar-transition">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary">מערכת ניהול גיוס</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">חברת גיוס מתקדמת</p>
      </div>
      
      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg transition-colors",
                    isActive 
                      ? "text-primary bg-blue-50 dark:bg-blue-900/20" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  data-testid={`link-nav-${item.href === '/' ? 'dashboard' : item.href.slice(1)}`}
                >
                  <Icon className="h-5 w-5 ml-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
