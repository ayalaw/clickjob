import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReminderForm } from "@/components/reminder-form";
import { Calendar, Clock, User, Briefcase, Building, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReminderWithDetails, InterviewEventWithDetails } from "@shared/schema";

export default function CalendarPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

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

  const { data: interviewEvents = [], isLoading: eventsLoading } = useQuery<InterviewEventWithDetails[]>({
    queryKey: ["/api/interview-events"],
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
      if (error.message.includes("401")) {
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
      if (error.message.includes("401")) {
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

  const deleteInterviewEvent = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/interview-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-events"] });
      toast({
        title: "הצלחה",
        description: "אירוע הראיון נמחק בהצלחה",
      });
    },
    onError: (error) => {
      if (error.message.includes("401")) {
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
        description: "שגיאה במחיקת אירוע הראיון",
        variant: "destructive",
      });
    },
  });

  const updateInterviewEventStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/interview-events/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-events"] });
      toast({
        title: "הצלחה",
        description: "סטטוס אירוע הראיון עודכן בהצלחה",
      });
    },
    onError: (error) => {
      if (error.message.includes("401")) {
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
        description: "שגיאה בעדכון סטטוס אירוע הראיון",
        variant: "destructive",
      });
    },
  });

  // Generate the 7 days of current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    return day;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayReminders = reminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminderDate);
      return reminderDate >= dayStart && reminderDate <= dayEnd;
    });

    const dayInterviewEvents = interviewEvents.filter(event => {
      const eventDate = new Date(event.eventDate);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });

    return [
      ...dayReminders.map(reminder => ({ ...reminder, type: 'reminder' as const })),
      ...dayInterviewEvents.map(event => ({ ...event, type: 'interview' as const }))
    ].sort((a, b) => {
      const dateA = new Date(a.type === 'reminder' ? a.reminderDate : a.eventDate);
      const dateB = new Date(b.type === 'reminder' ? b.reminderDate : b.eventDate);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

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
          <h1 className="text-3xl font-bold">יומן</h1>
        </div>
        <ReminderForm 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })}
        />
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigateWeek('prev')}
          className="flex items-center gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          שבוע קודם
        </Button>
        
        <div className="text-lg font-semibold">
          {weekDays[0].getDate()} - {weekDays[6].getDate()} {monthNames[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => navigateWeek('next')}
          className="flex items-center gap-2"
        >
          שבוע הבא
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly Calendar View */}
      <div className="grid grid-cols-7 gap-1 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        {weekDays.map((day, index) => (
          <div 
            key={day.toISOString()} 
            className={`p-4 text-center border-b border-gray-200 ${
              isToday(day) ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-gray-50'
            }`}
          >
            <div className="text-sm text-gray-600">{dayNames[day.getDay()]}</div>
            <div className={`text-xl ${isToday(day) ? 'text-blue-600' : ''}`}>
              {day.getDate()}
            </div>
          </div>
        ))}

        {/* Day Content */}
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          
          return (
            <div 
              key={`content-${day.toISOString()}`} 
              className="min-h-[200px] p-2 border-l border-gray-200 last:border-l-0"
            >
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={`${event.type}-${event.id}`}
                    className={`p-2 rounded text-xs ${
                      event.type === 'reminder' 
                        ? 'bg-blue-100 text-blue-800 border-l-2 border-blue-500' 
                        : 'bg-purple-100 text-purple-800 border-l-2 border-purple-500'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {formatTime(event.type === 'reminder' ? event.reminderDate : event.eventDate)} - {event.title}
                    </div>
                    {event.candidate && (
                      <div className="text-xs opacity-75 truncate">
                        {event.candidate.firstName} {event.candidate.lastName}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {event.type === 'reminder' && (
                        <>
                          {!event.isCompleted ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-12 p-0 text-xs bg-green-100 text-green-700 hover:bg-green-200"
                              onClick={() => toggleCompleted.mutate({ id: event.id, isCompleted: true })}
                            >
                              בוצע
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-12 p-0 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              onClick={() => toggleCompleted.mutate({ id: event.id, isCompleted: false })}
                            >
                              ממתין
                            </Button>
                          )}
                        </>
                      )}
                      {event.type === 'interview' && (
                        <>
                          {(event as InterviewEventWithDetails).status === 'scheduled' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-12 p-0 text-xs bg-green-100 text-green-700 hover:bg-green-200"
                              onClick={() => updateInterviewEventStatus.mutate({ id: event.id, status: 'completed' })}
                            >
                              בוצע
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-12 p-0 text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              onClick={() => updateInterviewEventStatus.mutate({ id: event.id, status: 'scheduled' })}
                            >
                              ממתין
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}