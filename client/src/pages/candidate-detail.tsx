import { useState, useEffect, memo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  FileText, 
  Eye, 
  ArrowRight,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  Car,
  Baby,
  Download,
  Save,
  X,
  Clock,
  History,
  MessageCircle
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

export default function CandidateDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showEvents, setShowEvents] = useState(false);
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

  const id = window.location.pathname.split('/').pop();
  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${id}`],
    enabled: isAuthenticated && !!id,
  });

  const { data: candidateEvents, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: [`/api/candidates/${id}/events`],
    enabled: isAuthenticated && !!id && showEvents,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'employed': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'employed': return 'מועסק';
      case 'inactive': return 'לא פעיל';
      case 'blacklisted': return 'ברשימה שחורה';
      default: return status;
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updatedData: Record<string, string>) => {
      return apiRequest('PUT', `/api/candidates/${id}`, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}`] });
      toast({
        title: "נשמר בהצלחה",
        description: "פרטי המועמד עודכנו",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את פרטי המועמד",
        variant: "destructive",
      });
    }
  });

  const saveAllChanges = () => {
    // Use fieldValues instead of editValues
    updateMutation.mutate(fieldValues);
  };


  // Create separate state for each field to avoid re-renders
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Update field values when candidate data loads
  useEffect(() => {
    if (candidate) {
      setFieldValues({
        firstName: candidate.firstName || '',
        lastName: candidate.lastName || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        phone2: candidate.phone2 || '',
        nationalId: candidate.nationalId || '',
        city: candidate.city || '',
        street: candidate.street || '',
        houseNumber: candidate.houseNumber || '',
        gender: candidate.gender || '',
        maritalStatus: candidate.maritalStatus || '',
        mobile: candidate.mobile || '',
        drivingLicense: candidate.drivingLicense || '',
      });
    }
  }, [candidate]);

  const updateFieldValue = (field: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || candidateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!candidate) {
    return (
      <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">מועמד לא נמצא</h2>
            <Button onClick={() => navigate("/candidates")}>חזור למועמדים</Button>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          {/* Header with candidate info */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {candidate.firstName?.charAt(0) || '?'}{candidate.lastName?.charAt(0) || ''}
                </div>
                
                {/* Candidate Info */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    עריכת פרטי המועמד - {candidate.firstName} {candidate.lastName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {/* Mobile with WhatsApp */}
                    {candidate.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{candidate.mobile}</span>
                        <a
                          href={`https://wa.me/972${candidate.mobile.replace(/^0/, '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 transition-colors"
                          title="שלח הודעת וואטסאפ"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    
                    {/* Email with mailto */}
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{candidate.email}</span>
                        <a
                          href={`mailto:${candidate.email}`}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="שלח אימייל"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    
                    {/* City */}
                    {candidate.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{candidate.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Navigation */}
          <div className="mb-6 flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/candidates")}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לרשימת המועמדים
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowEvents(!showEvents)}
              className="flex items-center gap-2"
              data-testid="button-recent-events"
            >
              <History className="w-4 h-4" />
              אירועים אחרונים
            </Button>
          </div>

          {/* Events Panel */}
          {showEvents && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  אירועים אחרונים
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : candidateEvents && candidateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {candidateEvents.map((event: any) => (
                      <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium">
                                {event.eventType === 'email_received' ? 'התקבל מייל' :
                                 event.eventType === 'email_reapplication' ? 'פנייה חוזרת דרך מייל' :
                                 event.eventType === 'email_application' ? 'הגיע דרך מייל' :
                                 event.eventType === 'created' ? 'נוצר במערכת' :
                                 event.eventType === 'cv_uploaded' ? 'הועלה קורות חיים' :
                                 event.eventType === 'job_application' ? 'הפניה למשרה' :
                                 event.eventType === 'profile_updated' ? 'עדכון פרטים' :
                                 event.eventType === 'sent_to_employer' ? 'נשלח למעסיק' :
                                 event.eventType === 'interview_invited' ? 'הזמנה לראיון' :
                                 event.eventType === 'status_change' ? 'שינוי סטטוס' :
                                 event.eventType === 'task_created' ? 'נוצרה משימה' :
                                 event.eventType === 'task_completed' ? 'הושלמה משימה' :
                                 event.eventType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            {event.metadata && (
                              <div className="text-xs text-gray-500">
                                {event.metadata.source && <span>מקור: {event.metadata.source === 'manual_entry' ? 'הכנסה ידנית' : event.metadata.source === 'cv_upload' ? 'העלאת קורות חיים' : event.metadata.source}</span>}
                                {event.metadata.createdBy && <span> | נוצר על ידי: {event.metadata.createdBy}</span>}
                                {event.metadata.jobCode && <span> | קוד משרה: {event.metadata.jobCode}</span>}
                                {event.metadata.jobTitle && <span> | משרה: {event.metadata.jobTitle}</span>}
                                {event.metadata.emailSubject && <span> | נושא: {event.metadata.emailSubject}</span>}
                                {event.metadata.recipient && <span> | נשלח אל: {event.metadata.recipient}</span>}
                                {event.metadata.updatedFields && event.metadata.updatedFields.length > 0 && (
                                  <span> | עודכנו: {event.metadata.updatedFields.map((field: string) => {
                                    const fieldMap: Record<string, string> = {
                                      firstName: 'שם פרטי',
                                      lastName: 'שם משפחה',
                                      email: 'אימייל',
                                      mobile: 'טלפון נייד',
                                      phone: 'טלפון בית',
                                      phone2: 'טלפון נוסף',
                                      nationalId: 'תעודת זהות',
                                      city: 'עיר',
                                      street: 'רחוב',
                                      houseNumber: 'מספר בית',
                                      zipCode: 'מיקוד',
                                      gender: 'מין',
                                      maritalStatus: 'מצב משפחתי',
                                      drivingLicense: 'רישיון נהיגה',
                                      address: 'כתובת',
                                      profession: 'מקצוע',
                                      experience: 'ניסיון',
                                      expectedSalary: 'שכר צפוי',
                                      status: 'סטטוס',
                                      rating: 'דירוג',
                                      notes: 'הערות',
                                      tags: 'תגיות',
                                      recruitmentSource: 'מקור גיוס'
                                    };
                                    return fieldMap[field] || field;
                                  }).join(', ')}</span>
                                )}
                                {event.metadata.cvUploaded && <span> | כולל קורות חיים</span>}
                                {event.metadata.newStatus && <span> | סטטוס חדש: {event.metadata.newStatus}</span>}
                                {event.metadata.taskTitle && <span> | כותרת משימה: {event.metadata.taskTitle}</span>}
                                {event.metadata.taskType && <span> | סוג משימה: {event.metadata.taskType}</span>}
                                {event.metadata.autoMatched && <span> | התאמה אוטומטית</span>}
                                {event.metadata.shortlistCount && <span> | רשימה קצרה (${event.metadata.shortlistCount} מועמדים)</span>}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(event.createdAt).toLocaleString('he-IL')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    אין אירועים להצגה
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Layout - 68% CV, 32% Details */}
          <div className="flex gap-6 h-[calc(100vh-12rem)]">
            {/* CV Display Card - 68% */}
            <div className="flex-[2] min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    קורות חיים
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                  {candidate.cvPath ? (
                    <div className="h-full flex flex-col">
                      {/* File info */}
                      <div className="flex justify-center p-3 bg-gray-50 rounded mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          קובץ קורות חיים - {candidate.cvPath?.split('/').pop()}
                        </div>
                      </div>
                      
                      {/* CV Display */}
                      <div className="flex-1 bg-white rounded border overflow-hidden">
                        {candidate.cvPath?.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={`/uploads/${candidate.cvPath?.replace('uploads/', '')}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : candidate.cvPath?.toLowerCase().includes('.doc') ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/uploads/' + candidate.cvPath?.replace('uploads/', ''))}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">תצוגה מקדימה לא זמינה</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">לא הועלה קובץ קורות חיים</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Candidate Details Card - 32% */}
            <div className="flex-1 min-w-0">
              <div className="h-full overflow-y-auto">
                {/* Single Card with all candidate details */}
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        עריכת פרטי המועמד
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(candidate.status || 'available')}>
                          {getStatusText(candidate.status || 'available')}
                        </Badge>
                        <Button 
                          onClick={saveAllChanges} 
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          שמור הכל
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">שם פרטי:</span>
                      <Input
                        value={fieldValues.firstName || ''}
                        onChange={(e) => updateFieldValue('firstName', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס שם פרטי"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">שם משפחה:</span>
                      <Input
                        value={fieldValues.lastName || ''}
                        onChange={(e) => updateFieldValue('lastName', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס שם משפחה"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">דוא״ל:</span>
                      <Input
                        value={fieldValues.email || ''}
                        onChange={(e) => updateFieldValue('email', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס דוא״ל"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">טלפון 1:</span>
                      <Input
                        value={fieldValues.phone || ''}
                        onChange={(e) => updateFieldValue('phone', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס טלפון"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">טלפון 2:</span>
                      <Input
                        value={fieldValues.phone2 || ''}
                        onChange={(e) => updateFieldValue('phone2', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס טלפון 2"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">תעודת זהות:</span>
                      <Input
                        value={fieldValues.nationalId || ''}
                        onChange={(e) => updateFieldValue('nationalId', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס ת.ז."
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">עיר:</span>
                      <Input
                        value={fieldValues.city || ''}
                        onChange={(e) => updateFieldValue('city', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס עיר"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">רחוב:</span>
                      <Input
                        value={fieldValues.street || ''}
                        onChange={(e) => updateFieldValue('street', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס רחוב"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">מס' בית:</span>
                      <Input
                        value={fieldValues.houseNumber || ''}
                        onChange={(e) => updateFieldValue('houseNumber', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס מס' בית"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">מין:</span>
                      <Select
                        value={fieldValues.gender || ''}
                        onValueChange={(value) => updateFieldValue('gender', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="בחר מין" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="זכר">זכר</SelectItem>
                          <SelectItem value="נקבה">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">מצב משפחתי:</span>
                      <Select
                        value={fieldValues.maritalStatus || ''}
                        onValueChange={(value) => updateFieldValue('maritalStatus', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="בחר מצב" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="רווק/ה">רווק/ה</SelectItem>
                          <SelectItem value="נשוי/אה">נשוי/אה</SelectItem>
                          <SelectItem value="גרוש/ה">גרוש/ה</SelectItem>
                          <SelectItem value="אלמן/ה">אלמן/ה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">ניידות:</span>
                      <Input
                        value={fieldValues.mobile || ''}
                        onChange={(e) => updateFieldValue('mobile', e.target.value)}
                        className="w-32 text-sm"
                        placeholder="הכנס ניידות"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-sm font-medium">רישיון נהיגה:</span>
                      <Select
                        value={fieldValues.drivingLicense || ''}
                        onValueChange={(value) => updateFieldValue('drivingLicense', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="בחר רישיון" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="אין">אין</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }