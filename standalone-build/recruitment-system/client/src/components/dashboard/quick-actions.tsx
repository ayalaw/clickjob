import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Briefcase, Building2 } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "הוסף מועמד חדש",
      icon: UserPlus,
      color: "btn-primary",
      href: "/candidates",
    },
    {
      title: "פרסם משרה חדשה",
      icon: Briefcase,
      color: "btn-success",
      href: "/jobs",
    },
    {
      title: "הוסף לקוח חדש",
      icon: Building2,
      color: "btn-warning",
      href: "/clients",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
          פעולות מהירות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                className={`w-full ${action.color} flex items-center justify-center`}
                onClick={() => window.location.href = action.href}
                data-testid={`button-quick-action-${index}`}
              >
                <Icon className="h-4 w-4 ml-2" />
                {action.title}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
