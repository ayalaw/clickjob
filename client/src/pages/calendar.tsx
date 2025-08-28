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
import { Calendar, Clock, User, Briefcase, Building, Check, Trash2, Edit, Video, Phone, Users } from "lucide-react";
import type { ReminderWithDetails, InterviewEventWithDetails } from "@shared/schema";

export default function CalendarPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("all");

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
        description: "שגיאה בעדכון סטטוס אירוע הראיון",
        variant: "destructive",
      });
    },
  });

  const handleDeleteReminder = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את התזכורת?")) {
      deleteReminder.mutate(id);
    }
  };

  const handleDeleteInterviewEvent = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את אירוע הראיון?")) {
      deleteInterviewEvent.mutate(id);
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

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in-person': return <Users className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'phone': return 'שיחת טלפון';
      case 'in-person': return 'פגישה פרונטלית';
      case 'video': return 'שיחת וידאו';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'מתוכנן';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      case 'rescheduled': return 'נדחה';
      default: return status;
    }
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

  const filterInterviewEvents = (status: string) => {
    switch (status) {
      case 'scheduled':
        return interviewEvents.filter(e => e.status === 'scheduled');
      case 'completed':
        return interviewEvents.filter(e => e.status === 'completed');
      case 'cancelled':
        return interviewEvents.filter(e => e.status === 'cancelled');
      default:
        return interviewEvents;
    }
  };

  // Combine and sort reminders and interview events by date
  const allEvents = [
    ...reminders.map(reminder => ({ ...reminder, type: 'reminder' as const })),
    ...interviewEvents.map(event => ({ ...event, type: 'interview' as const }))
  ].sort((a, b) => {
    const dateA = new Date(a.type === 'reminder' ? a.reminderDate : a.eventDate);
    const dateB = new Date(b.type === 'reminder' ? b.reminderDate : b.eventDate);
    return dateB.getTime() - dateA.getTime();
  });

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
          <h1 className="text-3xl font-bold">יומן ואירועים</h1>
        </div>
        <ReminderForm 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })}
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            כל האירועים ({allEvents.length})
          </TabsTrigger>
          <TabsTrigger value="reminders" data-testid="tab-reminders">
            תזכורות ({reminders.length})
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            ראיונות ({interviewEvents.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-overdue">
            באיחור ({filterReminders('overdue').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <EventsList 
            events={allEvents}
            onToggleReminderCompleted={(id, isCompleted) => toggleCompleted.mutate({ id, isCompleted })}
            onDeleteReminder={handleDeleteReminder}
            onDeleteInterviewEvent={handleDeleteInterviewEvent}
            onUpdateInterviewStatus={(id, status) => updateInterviewEventStatus.mutate({ id, status })}
            loading={remindersLoading || eventsLoading}
            emptyMessage="אין אירועים"
          />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <RemindersList 
            reminders={reminders}
            onToggleCompleted={(id, isCompleted) => toggleCompleted.mutate({ id, isCompleted })}
            onDelete={handleDeleteReminder}
            loading={remindersLoading}
            emptyMessage="אין תזכורות"
          />
        </TabsContent>

        <TabsContent value="interviews" className="mt-6">
          <InterviewEventsList 
            events={interviewEvents}
            onDelete={handleDeleteInterviewEvent}
            onUpdateStatus={(id, status) => updateInterviewEventStatus.mutate({ id, status })}
            loading={eventsLoading}
            emptyMessage="אין אירועי ראיונות"
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

interface EventsListProps {
  events: Array<(ReminderWithDetails & { type: 'reminder' }) | (InterviewEventWithDetails & { type: 'interview' })>;
  onToggleReminderCompleted: (id: string, isCompleted: boolean) => void;
  onDeleteReminder: (id: string) => void;
  onDeleteInterviewEvent: (id: string) => void;
  onUpdateInterviewStatus: (id: string, status: string) => void;
  loading: boolean;
  emptyMessage: string;
}

function EventsList({
  events,
  onToggleReminderCompleted,
  onDeleteReminder,
  onDeleteInterviewEvent,
  onUpdateInterviewStatus,
  loading,
  emptyMessage
}: EventsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={`${event.type}-${event.id}`} className="p-4">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {event.type === 'reminder' ? (
                    <Clock className="h-4 w-4 text-blue-600" />
                  ) : (
                    getEventTypeIcon((event as InterviewEventWithDetails).eventType)
                  )}
                  <h3 className="font-semibold text-lg">
                    {event.type === 'reminder' ? event.title : (event as InterviewEventWithDetails).title}
                  </h3>
                  <Badge variant="outline" className={
                    event.type === 'reminder' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }>
                    {event.type === 'reminder' ? 'תזכורת' : 'ראיון'}
                  </Badge>
                </div>

                <p className="text-gray-600 mb-2">
                  {event.type === 'reminder' ? event.description : (event as InterviewEventWithDetails).description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDate(event.type === 'reminder' ? event.reminderDate : (event as InterviewEventWithDetails).eventDate)}
                    </span>
                  </div>

                  {event.candidate && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{event.candidate.firstName} {event.candidate.lastName}</span>
                    </div>
                  )}

                  {event.job && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{event.job.title}</span>
                    </div>
                  )}

                  {event.client && (
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{event.client.companyName}</span>
                    </div>
                  )}
                </div>

                {event.type === 'reminder' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getPriorityColor(event.priority)}>
                      {getPriorityText(event.priority)}
                    </Badge>
                    {event.isCompleted && (
                      <Badge className="bg-green-100 text-green-800">
                        הושלם
                      </Badge>
                    )}
                  </div>
                )}

                {event.type === 'interview' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor((event as InterviewEventWithDetails).status)}>
                      {getStatusText((event as InterviewEventWithDetails).status)}
                    </Badge>
                    <Badge variant="outline">
                      {getEventTypeText((event as InterviewEventWithDetails).eventType)}
                    </Badge>
                    {(event as InterviewEventWithDetails).recruiterName && (
                      <Badge 
                        style={{ 
                          backgroundColor: (event as InterviewEventWithDetails).recruiterColor + '20', 
                          color: (event as InterviewEventWithDetails).recruiterColor,
                          borderColor: (event as InterviewEventWithDetails).recruiterColor 
                        }}
                      >
                        {(event as InterviewEventWithDetails).recruiterName}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {event.type === 'reminder' && !event.isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleReminderCompleted(event.id, true)}
                    data-testid={`button-complete-${event.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                
                {event.type === 'reminder' && event.isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleReminderCompleted(event.id, false)}
                    data-testid={`button-uncomplete-${event.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}

                {event.type === 'interview' && (event as InterviewEventWithDetails).status === 'scheduled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateInterviewStatus(event.id, 'completed')}
                    data-testid={`button-complete-interview-${event.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => event.type === 'reminder' ? onDeleteReminder(event.id) : onDeleteInterviewEvent(event.id)}
                  data-testid={`button-delete-${event.type}-${event.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface InterviewEventsListProps {
  events: InterviewEventWithDetails[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  loading: boolean;
  emptyMessage: string;
}

function InterviewEventsList({ 
  events, 
  onDelete, 
  onUpdateStatus,
  loading, 
  emptyMessage
}: InterviewEventsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="p-4">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getEventTypeIcon(event.eventType)}
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <Badge className={getStatusColor(event.status)}>
                    {getStatusText(event.status)}
                  </Badge>
                </div>

                <p className="text-gray-600 mb-2">{event.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{event.candidate.firstName} {event.candidate.lastName}</span>
                  </div>

                  {event.job && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      <span>{event.job.title}</span>
                    </div>
                  )}

                  {event.client && (
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{event.client.companyName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {getEventTypeText(event.eventType)}
                  </Badge>
                  {event.recruiterName && (
                    <Badge 
                      style={{ 
                        backgroundColor: event.recruiterColor + '20', 
                        color: event.recruiterColor,
                        borderColor: event.recruiterColor 
                      }}
                    >
                      {event.recruiterName}
                    </Badge>
                  )}
                  {event.location && (
                    <Badge variant="outline">
                      {event.location}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {event.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateStatus(event.id, 'completed')}
                    data-testid={`button-complete-interview-${event.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(event.id)}
                  data-testid={`button-delete-interview-${event.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}