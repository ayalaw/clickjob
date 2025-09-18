import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReminderForm } from "@/components/reminder-form";
import { Calendar, Clock, User, Briefcase, Building, ChevronLeft, ChevronRight, Bell, X, RotateCcw } from "lucide-react";
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
  
  const [activeReminderPopup, setActiveReminderPopup] = useState<ReminderWithDetails | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(15);
  const [checkedReminders, setCheckedReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<ReminderWithDetails[]>({
    queryKey: ["/api/reminders"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Check every 30 seconds for new reminders
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
          window.location.href = "/login";
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
          window.location.href = "/login";
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
          window.location.href = "/login";
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
          window.location.href = "/login";
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

  const snoozeReminder = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const newDate = new Date();
      newDate.setMinutes(newDate.getMinutes() + minutes);
      await apiRequest("PUT", `/api/reminders/${id}`, { 
        reminderDate: newDate.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setActiveReminderPopup(null);
      toast({
        title: "הצלחה",
        description: `התזכורת נדחתה ב-${snoozeMinutes} דקות`,
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה",
        description: "שגיאה בדחיית התזכורת",
        variant: "destructive",
      });
    },
  });

  // Check for due reminders every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !reminders.length) return;

    const checkDueReminders = () => {
      const now = new Date();
      const dueReminders = reminders.filter(reminder => {
        if (reminder.isCompleted || checkedReminders.has(reminder.id)) return false;
        
        const reminderTime = new Date(reminder.reminderDate);
        const timeDiff = reminderTime.getTime() - now.getTime();
        
        // Show popup if reminder is due (within 1 minute)
        return timeDiff <= 60000 && timeDiff >= -60000;
      });

      if (dueReminders.length > 0 && !activeReminderPopup) {
        setActiveReminderPopup(dueReminders[0]);
      }
    };

    const interval = setInterval(checkDueReminders, 30000);
    checkDueReminders(); // Check immediately

    return () => clearInterval(interval);
  }, [reminders, isAuthenticated, activeReminderPopup, checkedReminders]);

  const markReminderAsRead = () => {
    if (activeReminderPopup) {
      setCheckedReminders(prev => new Set([...Array.from(prev), activeReminderPopup.id]));
      setActiveReminderPopup(null);
    }
  };

  const handleSnoozeReminder = () => {
    if (activeReminderPopup) {
      snoozeReminder.mutate({ id: activeReminderPopup.id, minutes: snoozeMinutes });
    }
  };

  const getEventReason = (event: ReminderWithDetails | InterviewEventWithDetails) => {
    if (event.type === 'interview') {
      const interviewEvent = event as InterviewEventWithDetails;
      switch (interviewEvent.eventType) {
        case 'phone': return 'ראיון טלפוני';
        case 'video': return 'ראיון וידאו';
        case 'in-person': return 'ראיון פרונטלי';
        default: return 'ראיון';
      }
    }
    
    // For reminders, try to detect reason from title or description
    const title = event.title.toLowerCase();
    const description = event.description?.toLowerCase() || '';
    
    if (title.includes('ראיון') || description.includes('ראיון')) {
      if (title.includes('טלפון') || description.includes('טלפון')) return 'ראיון טלפוני';
      if (title.includes('וידאו') || description.includes('וידאו')) return 'ראיון וידאו';
      return 'הופנה לראיון';
    }
    
    if (title.includes('חזור') || title.includes('טלפון') || description.includes('חזור') || description.includes('טלפון')) {
      return 'לחזור טלפונית';
    }
    
    if (title.includes('מעקב') || description.includes('מעקב')) {
      return 'מעקב מועמד';
    }
    
    return event.title; // Default to title if no pattern found
  };

  const handleCandidateClick = (candidateId: string) => {
    window.open(`/candidates/${candidateId}`, '_blank');
  };

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
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 gap-0">
          <div className="p-4 text-center border-b border-gray-200 bg-gray-50 text-sm font-medium">
            שעה
          </div>
          {weekDays.map((day) => (
            <div 
              key={day.toISOString()} 
              className={`p-4 text-center border-b border-gray-200 border-l ${
                isToday(day) ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-gray-50'
              }`}
            >
              <div className="text-sm text-gray-600">{dayNames[day.getDay()]}</div>
              <div className={`text-xl ${isToday(day) ? 'text-blue-600' : ''}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Hour Rows */}
        {Array.from({ length: 11 }, (_, i) => {
          const hour = i + 8; // Hours from 8 to 18
          const hourString = `${hour.toString().padStart(2, '0')}:00`;
          
          return (
            <div key={hour} className="grid grid-cols-8 gap-0 min-h-[60px]">
              {/* Hour Label */}
              <div className="p-2 text-center border-b border-gray-200 bg-gray-50 text-sm font-medium flex items-center justify-center">
                {hourString}
              </div>
              
              {/* Day Columns */}
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const hourEvents = dayEvents.filter(event => {
                  const eventDate = new Date(event.type === 'reminder' ? event.reminderDate : event.eventDate);
                  return eventDate.getHours() === hour;
                });
                
                return (
                  <div 
                    key={`${day.toISOString()}-${hour}`} 
                    className="p-1 border-b border-l border-gray-200 min-h-[60px]"
                  >
                    <div className="space-y-1">
                      {hourEvents.map((event) => (
                        <div
                          key={`${event.type}-${event.id}`}
                          className={`p-2 rounded text-xs ${
                            event.type === 'reminder' 
                              ? 'bg-blue-100 text-blue-800 border-l-2 border-blue-500' 
                              : 'bg-purple-100 text-purple-800 border-l-2 border-purple-500'
                          }`}
                        >
                          {event.candidate && (
                            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded mb-2 font-bold text-center border">
                              🎯 {getEventReason(event)}
                            </div>
                          )}
                          
                          <div className="font-medium mb-1">
                            {event.title}
                          </div>
                          
                          {event.candidate && (
                            <div className="text-xs mb-1">
                              👤 <button 
                                onClick={() => handleCandidateClick(event.candidate!.id)}
                                className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                              >
                                {event.candidate.firstName} {event.candidate.lastName}
                              </button>
                            </div>
                          )}
                          
                          {event.job && (
                            <div className="text-xs opacity-75 mb-1">
                              💼 {event.job.title}
                            </div>
                          )}
                          
                          {event.client && (
                            <div className="text-xs opacity-75 mb-1">
                              🏢 {event.client.companyName}
                            </div>
                          )}
                          
                          {event.type === 'reminder' && event.description && (
                            <div className="text-xs opacity-75 mb-1">
                              📝 {event.description}
                            </div>
                          )}
                          
                          {event.type === 'interview' && (event as InterviewEventWithDetails).description && (
                            <div className="text-xs opacity-75 mb-1">
                              📝 {(event as InterviewEventWithDetails).description}
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
          );
        })}
      </div>

      {/* Reminder Popup Dialog */}
      <Dialog open={!!activeReminderPopup} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Bell className="h-5 w-5" />
              תזכורת דחופה!
            </DialogTitle>
          </DialogHeader>
          
          {activeReminderPopup && (
            <div className="space-y-4">
              {activeReminderPopup.candidate && (
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-bold text-center border-2 border-yellow-300">
                  🎯 {getEventReason(activeReminderPopup)}
                </div>
              )}
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-lg mb-2">{activeReminderPopup.title}</h3>
                
                {activeReminderPopup.description && (
                  <p className="text-gray-700 mb-3">{activeReminderPopup.description}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>זמן: {new Date(activeReminderPopup.reminderDate).toLocaleString('he-IL')}</span>
                  </div>
                  
                  {activeReminderPopup.candidate && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>מועמד: </span>
                      <button 
                        onClick={() => handleCandidateClick(activeReminderPopup.candidate!.id)}
                        className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                      >
                        {activeReminderPopup.candidate.firstName} {activeReminderPopup.candidate.lastName}
                      </button>
                    </div>
                  )}
                  
                  {activeReminderPopup.job && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>משרה: {activeReminderPopup.job.title}</span>
                    </div>
                  )}
                  
                  {activeReminderPopup.client && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span>חברה: {activeReminderPopup.client.companyName}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="snooze-minutes">דחה ב:</Label>
                  <Input
                    id="snooze-minutes"
                    type="number"
                    value={snoozeMinutes}
                    onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
                    className="w-20"
                    min="1"
                    max="1440"
                  />
                  <span className="text-sm text-gray-600">דקות</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={markReminderAsRead}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              סמן כנקרא
            </Button>
            <Button 
              onClick={handleSnoozeReminder}
              disabled={snoozeReminder.isPending}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="h-4 w-4" />
              דחה תזכורת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}