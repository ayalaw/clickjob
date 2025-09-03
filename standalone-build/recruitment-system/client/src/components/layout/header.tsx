import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return "ח.נ";
    return `${firstName.charAt(0)}.${lastName.charAt(0)}`;
  };

  return (
    <header className="bg-surface shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-secondary dark:text-white">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4 space-x-reverse">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -left-1 bg-error text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            3
          </span>
        </Button>
        
        {/* User Menu */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="text-right">
            <p className="text-sm font-medium text-secondary dark:text-white" data-testid="text-user-name">
              {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'משתמש'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">מנהל גיוס</p>
          </div>
          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {getInitials(user?.firstName, user?.lastName)}
            </span>
          </div>
        </div>

        {/* Logout Button */}
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
    </header>
  );
}
