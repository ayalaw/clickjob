import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReminderForm } from "@/components/reminder-form";
import { Calendar, Clock, User, Briefcase, Building, Check, Trash2, Edit } from "lucide-react";
import type { ReminderWithDetails } from "@shared/schema";

export default function CalendarPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("upcoming");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "לא מורשה",
        description: "אתה מנותק. מתחבר שוב...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<ReminderWithDetails[]>({
    queryKey: ["/api/reminders"],
    enabled: isAuthenticated,
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "הצלחה",
        description: "התזכורת נמחקה בהצלחה",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: "שגיאה במחיקת התזכורת",
        variant: "destructive",
      });
    },
  });

  const toggleCompleted = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      await apiRequest("PUT", `/api/reminders/${id}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "הצלחה",
        description: "סטטוס התזכורת עודכן בהצלחה",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון התזכורת",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReminder = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את התזכורת?")) {
      deleteReminder.mutate(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return priority;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date();
  };

  const filterReminders = (status: string) => {
    const now = new Date();
    switch (status) {
      case 'upcoming':
        return reminders.filter(r => !r.isCompleted && new Date(r.reminderDate) >= now);
      case 'overdue':
        return reminders.filter(r => !r.isCompleted && new Date(r.reminderDate) < now);
      case 'completed':
        return reminders.filter(r => r.isCompleted);
      default:
        return reminders;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">יומן תזכורות</h1>
        </div>
        <ReminderForm 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })}
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" data-testid="tab-upcoming">
            קרובות ({filterReminders('upcoming').length})
          </TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">
            באיחור ({filterReminders('overdue').length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            הושלמו ({filterReminders('completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <RemindersList 
            reminders={filterReminders('upcoming')}
            onToggleCompleted={(id, isCompleted) => toggleCompleted.mutate({ id, isCompleted })}
            onDelete={handleDeleteReminder}
            loading={remindersLoading}
            emptyMessage="אין תזכורות קרובות"
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          <RemindersList 
            reminders={filterReminders('overdue')}
            onToggleCompleted={(id, isCompleted) => toggleCompleted.mutate({ id, isCompleted })}
            onDelete={handleDeleteReminder}
            loading={remindersLoading}
            emptyMessage="אין תזכורות באיחור"
            isOverdue={true}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <RemindersList 
            reminders={filterReminders('completed')}
            onToggleCompleted={(id, isCompleted) => toggleCompleted.mutate({ id, isCompleted })}
            onDelete={handleDeleteReminder}
            loading={remindersLoading}
            emptyMessage="אין תזכורות שהושלמו"
            showCompleted={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface RemindersListProps {
  reminders: ReminderWithDetails[];
  onToggleCompleted: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
  loading: boolean;
  emptyMessage: string;
  isOverdue?: boolean;
  showCompleted?: boolean;
}

function RemindersList({ 
  reminders, 
  onToggleCompleted, 
  onDelete, 
  loading, 
  emptyMessage,
  isOverdue = false,
  showCompleted = false
}: RemindersListProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return priority;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>טוען תזכורות...</p>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => (
        <Card 
          key={reminder.id} 
          className={`transition-all duration-200 hover:shadow-md ${
            isOverdue ? 'border-r-4 border-r-red-400' : 
            showCompleted ? 'border-r-4 border-r-green-400' : 
            'border-r-4 border-r-blue-400'
          }`}
          data-testid={`reminder-item-${reminder.id}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className={`text-lg text-right ${showCompleted ? 'line-through text-gray-500' : ''}`}>
                  {reminder.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getPriorityColor(reminder.priority || 'medium')}>
                    {getPriorityText(reminder.priority || 'medium')}
                  </Badge>
                  <div className={`flex items-center gap-1 text-sm ${
                    isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                    {formatDate(reminder.reminderDate)}
                    {isOverdue && <span className="text-red-600 font-bold">(באיחור)</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={showCompleted ? "default" : "outline"}
                  onClick={() => onToggleCompleted(reminder.id, !reminder.isCompleted)}
                  data-testid={`button-toggle-${reminder.id}`}
                >
                  <Check className="w-4 h-4" />
                  {showCompleted ? "בטל השלמה" : "סמן כהושלם"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(reminder.id)}
                  className="text-red-600 hover:text-red-700"
                  data-testid={`button-delete-${reminder.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                  מחק
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {reminder.description && (
              <p className="text-gray-700 mb-3 text-right">{reminder.description}</p>
            )}
            
            {/* Related entities */}
            <div className="space-y-2">
              {reminder.candidate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>מועמד: {reminder.candidate.firstName} {reminder.candidate.lastName}</span>
                </div>
              )}
              {reminder.job && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span>משרה: {reminder.job.title}</span>
                </div>
              )}
              {reminder.client && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="w-4 h-4" />
                  <span>לקוח: {reminder.client.companyName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}