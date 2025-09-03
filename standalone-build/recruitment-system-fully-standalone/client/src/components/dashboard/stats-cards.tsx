import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, UserPlus, Handshake, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    activeJobs: number;
    newCandidates: number;
    placements: number;
    revenue: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });
  const [, setLocation] = useLocation();

  const statsData = [
    {
      title: "משרות פעילות",
      value: stats?.activeJobs || 0,
      icon: Briefcase,
      color: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-primary",
      change: "+12%",
      changeText: "מהחודש שעבר",
      isPositive: true,
      link: "/jobs",
    },
    {
      title: "מועמדים חדשים",
      value: stats?.newCandidates || 0,
      icon: UserPlus,
      color: "bg-green-100 dark:bg-green-900",
      iconColor: "text-success",
      change: "+8%",
      changeText: "השבוע",
      isPositive: true,
      link: "/candidates",
    },
    {
      title: "השמות החודש",
      value: stats?.placements || 0,
      icon: Handshake,
      color: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-warning",
      change: "-3%",
      changeText: "מהחודש שעבר",
      isPositive: false,
      link: "/candidates",
    },
    {
      title: "הכנסות חודשיות",
      value: stats?.revenue ? `₪${stats.revenue.toLocaleString()}` : "₪0",
      icon: DollarSign,
      color: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600",
      change: "+15%",
      changeText: "מהחודש שעבר",
      isPositive: true,
      link: "/clients",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        const ChangeIcon = stat.isPositive ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={index} 
            className="stat-card cursor-pointer hover:shadow-lg transition-shadow" 
            onClick={() => setLocation(stat.link)}
            data-testid={`card-stat-${index}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-stat-title-${index}`}>
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-secondary dark:text-white" data-testid={`text-stat-value-${index}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm flex items-center ${stat.isPositive ? 'text-success' : 'text-error'}`}>
                  <ChangeIcon className="h-4 w-4 ml-1" />
                  {stat.change}
                </span>
                <span className="text-gray-600 dark:text-gray-300 text-sm mr-2">
                  {stat.changeText}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
