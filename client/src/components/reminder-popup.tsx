import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, User, Briefcase, Building } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReminderWithDetails } from "@shared/schema";

export function ReminderPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [checkedReminders, setCheckedReminders] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: dueReminders = [], refetch } = useQuery<ReminderWithDetails[]>({
    queryKey: ['/api/reminders/due'],
    refetchInterval: 60000, // Check every minute
  });

  // Show popup when there are new due reminders
  useEffect(() => {
    const newReminders = dueReminders.filter(reminder => !checkedReminders.has(reminder.id));
    if (newReminders.length > 0) {
      setIsOpen(true);
    }
  }, [dueReminders, checkedReminders]);

  const markAsCompleted = async (reminderId: string) => {
    try {
      await apiRequest('PUT', `/api/reminders/${reminderId}`, {
        isCompleted: true
      });

      setCheckedReminders(prev => new Set([...prev, reminderId]));
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      refetch();

      toast({
        title: "הצלחה",
        description: "התזכורת סומנה כהושלמה",
      });
    } catch (error) {
      console.error('Error marking reminder as completed:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון התזכורת",
        variant: "destructive",
      });
    }
  };

  const snoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      const newDate = new Date();
      newDate.setMinutes(newDate.getMinutes() + minutes);

      await apiRequest('PUT', `/api/reminders/${reminderId}`, {
        reminderDate: newDate.toISOString()
      });

      setCheckedReminders(prev => new Set([...prev, reminderId]));
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      refetch();

      toast({
        title: "הצלחה",
        description: `התזכורת נדחתה ב-${minutes} דקות`,
      });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בדחיית התזכורת",
        variant: "destructive",
      });
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

  const activeReminders = dueReminders.filter(reminder => !checkedReminders.has(reminder.id));

  if (activeReminders.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Bell className="w-5 h-5" />
            תזכורות פעילות ({activeReminders.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {activeReminders.map((reminder) => (
            <Card key={reminder.id} className="border-r-4 border-r-orange-400" data-testid={`reminder-card-${reminder.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-right">{reminder.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(reminder.priority || 'medium')}>
                        {getPriorityText(reminder.priority || 'medium')}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {formatDate(reminder.reminderDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {reminder.description && (
                  <p className="text-gray-700 mb-3 text-right">{reminder.description}</p>
                )}
                
                {/* Related entities */}
                <div className="space-y-2 mb-4">
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

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => markAsCompleted(reminder.id)}
                    data-testid={`button-complete-reminder-${reminder.id}`}
                  >
                    סיים
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snoozeReminder(reminder.id, 15)}
                    data-testid={`button-snooze-15-${reminder.id}`}
                  >
                    דחה 15 דק'
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snoozeReminder(reminder.id, 60)}
                    data-testid={`button-snooze-60-${reminder.id}`}
                  >
                    דחה שעה
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} data-testid="button-close-reminder-popup">
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}