import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import type { Candidate } from "@shared/schema";

export default function RecentCandidates() {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-candidates"],
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}.${lastName.charAt(0)}`;
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: he 
      });
    } catch {
      return "לאחרונה";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
            מועמדים חדשים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 animate-pulse">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full ml-3"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
          מועמדים חדשים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {candidates?.length > 0 ? (
            candidates.slice(0, 3).map((candidate: Candidate) => (
              <div 
                key={candidate.id} 
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                data-testid={`card-recent-candidate-${candidate.id}`}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center ml-3">
                    <span className="text-primary font-medium text-sm">
                      {getInitials(candidate.firstName, candidate.lastName)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-secondary dark:text-white" data-testid={`text-candidate-name-${candidate.id}`}>
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-candidate-profession-${candidate.id}`}>
                      {candidate.profession || "לא צוין"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500" data-testid={`text-candidate-time-${candidate.id}`}>
                  {getTimeAgo(candidate.createdAt || new Date().toISOString())}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">אין מועמדים חדשים</p>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-primary hover:text-primary-dark"
          onClick={() => window.location.href = '/candidates'}
          data-testid="button-view-all-candidates"
        >
          צפה בכל המועמדים <ArrowLeft className="h-4 w-4 mr-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
