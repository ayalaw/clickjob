import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import type { TaskWithDetails } from "@shared/schema";

export default function UrgentTasks() {
  const { toast } = useToast();
  
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/dashboard/urgent-tasks"],
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("PUT", `/api/tasks/${taskId}`, { isCompleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/urgent-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "הצלחה",
        description: "המשימה סומנה כהושלמה",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "לא מורשה",
          description: "אתה מנותק. מתחבר שוב...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון המשימה",
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-error bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'border-warning bg-orange-50 dark:bg-orange-900/20';
      case 'low': return 'border-success bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'דחוף';
      case 'medium': return 'בינוני';
      case 'low': return 'נמוך';
      default: return priority || 'לא הוגדר';
    }
  };

  const formatDueDate = (dueDate: string) => {
    try {
      const date = new Date(dueDate);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return `היום ${format(date, 'HH:mm')}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `מחר ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'dd/MM/yyyy HH:mm');
      }
    } catch {
      return "לא צוין";
    }
  };

  const handleCompleteTask = (taskId: string) => {
    completeTask.mutate(taskId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
            משימות דחופות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 border-r-4 border-gray-200 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
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
          משימות דחופות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks?.length > 0 ? (
            tasks.slice(0, 3).map((task: TaskWithDetails) => (
              <div 
                key={task.id}
                className={`flex items-start p-3 border-r-4 rounded-lg ${getPriorityColor(task.priority || 'medium')}`}
                data-testid={`card-urgent-task-${task.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-secondary dark:text-white" data-testid={`text-task-title-${task.id}`}>
                      {task.title}
                    </p>
                    <Badge className={getPriorityBadgeColor(task.priority || 'medium')}>
                      {getPriorityText(task.priority || 'medium')}
                    </Badge>
                  </div>
                  
                  {(task.candidate || task.job || task.client) && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1" data-testid={`text-task-context-${task.id}`}>
                      {task.candidate && `${task.candidate.firstName} ${task.candidate.lastName}`}
                      {task.job && ` - ${task.job.title}`}
                      {task.client && ` - ${task.client.companyName}`}
                    </p>
                  )}
                  
                  {task.dueDate && (
                    <p className="text-xs text-error dark:text-red-400 mt-1" data-testid={`text-task-due-${task.id}`}>
                      תאריך יעד: {formatDueDate(task.dueDate)}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCompleteTask(task.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
                  data-testid={`button-complete-task-${task.id}`}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">אין משימות דחופות</p>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full mt-4 text-primary hover:text-primary-dark"
          onClick={() => window.location.href = '/tasks'}
          data-testid="button-view-all-tasks"
        >
          צפה בכל המשימות <ArrowLeft className="h-4 w-4 mr-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
