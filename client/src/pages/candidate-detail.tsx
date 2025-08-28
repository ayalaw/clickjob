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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { ReminderForm } from "@/components/reminder-form";
import type { Candidate } from "@shared/schema";

export default function CandidateDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showEvents, setShowEvents] = useState(true); // Show events by default
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState("");
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [editableTemplate, setEditableTemplate] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingReferral, setIsSendingReferral] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [referToJobDialogOpen, setReferToJobDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [jobSearchTerm, setJobSearchTerm] = useState("");
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

  const { data: candidateEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<any[]>({
    queryKey: [`/api/candidates/${id}/events`],
    enabled: isAuthenticated && !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      // Legacy statuses
      case 'available': return 'bg-green-100 text-green-800';
      case 'employed': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      // New detailed statuses
      case 'pending': return 'bg-purple-100 text-purple-800';
      case 'pending_initial_screening': return 'bg-yellow-100 text-yellow-800';
      case 'in_initial_screening': return 'bg-orange-100 text-orange-800';
      case 'passed_initial_screening': return 'bg-green-100 text-green-800';
      case 'failed_initial_screening': return 'bg-red-100 text-red-800';
      case 'sent_to_employer': return 'bg-blue-100 text-blue-800';
      case 'whatsapp_sent': return 'bg-green-100 text-green-800';
      case 'phone_contact_made': return 'bg-cyan-100 text-cyan-800';
      case 'waiting_employer_response': return 'bg-yellow-100 text-yellow-800';
      case 'invited_to_interview': return 'bg-indigo-100 text-indigo-800';
      case 'attended_interview': return 'bg-blue-100 text-blue-800';
      case 'missed_interview': return 'bg-red-100 text-red-800';
      case 'passed_interview': return 'bg-green-100 text-green-800';
      case 'rejected_by_employer': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-emerald-100 text-emerald-800';
      case 'employment_ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      // Legacy statuses
      case 'available': return 'זמין';
      case 'employed': return 'מועסק';
      case 'inactive': return 'לא פעיל';
      case 'blacklisted': return 'ברשימה שחורה';
      // New detailed statuses
      case 'pending': return 'ממתין';
      case 'pending_initial_screening': return 'ממתין לסינון ראשוני';
      case 'in_initial_screening': return 'בסינון ראשוני';
      case 'passed_initial_screening': return 'עבר סינון ראשוני';
      case 'failed_initial_screening': return 'נפסל בסינון ראשוני';
      case 'sent_to_employer': return 'נשלח למעסיק';
      case 'whatsapp_sent': return 'נשלחה הודעת ווצאפ';
      case 'phone_contact_made': return 'נוצר קשר טלפוני';
      case 'waiting_employer_response': return 'מועמד ממתין לתשובת מעסיק';
      case 'invited_to_interview': return 'זומן לראיון אצל מעסיק';
      case 'attended_interview': return 'הגיע לראיון אצל מעסיק';
      case 'missed_interview': return 'לא הגיע לראיון';
      case 'passed_interview': return 'עבר ראיון אצל מעסיק';
      case 'rejected_by_employer': return 'נפסל ע"י מעסיק';
      case 'hired': return 'התקבל לעבודה';
      case 'employment_ended': return 'סיים העסקה';
      default: return status;
    }
  };

  // Load templates from database
  const { data: templatesData } = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: () => apiRequest('GET', '/api/message-templates'),
  });

  const templates = Array.isArray(templatesData) ? templatesData : [];

  // Load jobs for referral
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<any>(null);

  // Fetch jobs when component loads
  useEffect(() => {
    if (isAuthenticated) {
      setJobsLoading(true);
      apiRequest('GET', '/api/jobs')
        .then(async (response: Response) => {
          const data = await response.json();
          console.log('Jobs API response:', data);
          if (data && data.jobs && Array.isArray(data.jobs)) {
            setJobsList(data.jobs);
            console.log('Set jobs list:', data.jobs);
          } else {
            console.log('No jobs found in response');
            setJobsList([]);
          }
        })
        .catch((error: any) => {
          console.error('Error fetching jobs:', error);
          setJobsError(error);
          setJobsList([]);
        })
        .finally(() => {
          setJobsLoading(false);
        });
    }
  }, [isAuthenticated]);

  const jobs = jobsList;

  // Filter notes from events
  const noteEvents = candidateEvents?.filter((event: any) => event.eventType === 'note_added') || [];

  // Filter jobs based on search term
  const filteredJobs = jobs.filter((job: any) => 
    job.title?.toLowerCase()?.includes(jobSearchTerm.toLowerCase()) ||
    (job.client?.name || '').toLowerCase().includes(jobSearchTerm.toLowerCase())
  );

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const getWhatsAppTemplate = (messageType: string, candidateName: string) => {
    // Find template from database
    const template = templates.find(t => t.name === messageType);
    if (template) {
      return template.content.replace(/\{שם המועמד\}/g, candidateName);
    }

    // Fallback to hardcoded templates
    const hardcodedTemplates: Record<string, string> = {
      "זימון לראיון עבודה": `שלום ${candidateName} 👋

קיבלנו את קורות החיים שלך והתרשמנו!

נשמח לזמן אותך לראיון עבודה:
📅 תאריך: [להשלים]
🕐 שעה: [להשלים]
📍 מיקום: [להשלים]

על מנת לוודא שהמועד מתאים לך, אנא אשר קבלת ההודעה.

בהצלחה!
צוות הגיוס`,
      
      "אין מענה בנייד": `שלום ${candidateName} 👋

ניסינו להגיע אליך טלפונית מספר פעמים ללא הצלחה.

נשמח לתאם איתך שיחה בזמן שנוח לך:
📞 אנא חזר אלינו בהודעה עם שעות נוחות לפנייה
📧 או כתוב לנו אימייל

נחכה לתגובתך
צוות הגיוס`,

      "בקשת עדכון פרטים": `שלום ${candidateName} 👋

נשמח לעדכן את פרטייך במערכת שלנו.

אנא שלח לנו:
📝 קורות חיים מעודכנות
📞 מספר טלפון נוסף (אם יש)
📧 כתובת אימייל נוספת (אם יש)

תודה על שיתוף הפעולה!
צוות הגיוס`,

      "הודעת תודה": `שלום ${candidateName} 👋

תודה רבה על הזמן שהקדשת לראיון!

התרשמנו מאוד ממך ונחזור אליך בהקדם עם עדכון.

המשך יום נעים!
צוות הגיוס`
    };
    
    return hardcodedTemplates[messageType] || `שלום ${candidateName}, צוות הגיוס פנה אליך.`;
  };

  const handleTemplateSelection = (messageType: string) => {
    if (!candidate?.mobile) return;
    
    const candidateName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
    const messageTemplate = getWhatsAppTemplate(messageType, candidateName);
    
    setSelectedMessageType(messageType);
    setEditableTemplate(messageTemplate);
    setWhatsappDialogOpen(false);
    setEditTemplateDialogOpen(true);
  };

  const handleSendWhatsAppMessage = () => {
    if (!candidate?.mobile || !editableTemplate) return;
    
    // Record the WhatsApp message event
    apiRequest('POST', `/api/candidates/${id}/events`, {
      eventType: 'whatsapp_message',
      description: `נשלחה הודעת וואטסאפ: ${selectedMessageType}`,
      metadata: {
        messageType: selectedMessageType,
        mobile: candidate.mobile,
        template: editableTemplate,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      // Refresh events if they're showing
      if (showEvents) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}/events`] });
      }
      
      toast({
        title: "הודעה נרשמה",
        description: `הודעת וואטסאפ "${selectedMessageType}" נרשמה באירועי המועמד`,
      });
    }).catch(() => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לרשום את האירוע",
        variant: "destructive",
      });
    });

    // Open WhatsApp with the edited template
    const phoneNumber = candidate.mobile.replace(/^0/, '').replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(editableTemplate);
    window.open(`https://wa.me/972${phoneNumber}?text=${encodedMessage}`, '_blank');
    setEditTemplateDialogOpen(false);
    setEditableTemplate("");
    setSelectedMessageType("");
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס הערה",
        variant: "destructive",
      });
      return;
    }

    if (isAddingNote) return; // Prevent double clicks
    setIsAddingNote(true);

    apiRequest('POST', `/api/candidates/${id}/events`, {
      eventType: 'note_added',
      description: `הערה נוספה: ${newNote}`,
      metadata: {
        note: newNote,
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      // Always refresh events list after adding a note
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}/events`] });
      
      toast({
        title: "הערה נוספה",
        description: "ההערה נשמרה בהצלחה",
      });
      
      setNewNote("");
      setNotesDialogOpen(false);
    }).catch(() => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את ההערה",
        variant: "destructive",
      });
    }).finally(() => {
      setIsAddingNote(false);
    });
  };

  const handleJobReferral = async () => {
    if (selectedJobIds.length === 0 || !recommendation.trim()) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות משרה אחת ולכתוב חוות דעת",
        variant: "destructive",
      });
      return;
    }

    if (isSendingReferral) return; // Prevent double clicks
    setIsSendingReferral(true);

    try {
      // Process each selected job
      for (const jobId of selectedJobIds) {
        const selectedJob = jobs.find((job: any) => job.id === jobId);
        if (!selectedJob) continue;

        // Create event for the referral
        await apiRequest('POST', `/api/candidates/${id}/events`, {
          eventType: 'job_referral',
          description: `הופנה למשרה: ${selectedJob.title} אצל ${selectedJob.client?.name}`,
          metadata: {
            jobId: jobId,
            jobTitle: selectedJob.title,
            clientName: selectedJob.client?.name,
            recommendation: recommendation,
            timestamp: new Date().toISOString()
          }
        });

        // Send email to employer
        await apiRequest('POST', '/api/job-referrals', {
          candidateId: id,
          jobId: jobId,
          recommendation: recommendation
        });
      }

      if (showEvents) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}/events`] });
      }
      
      toast({
        title: "המועמד הופנה למשרות",
        description: `חוות הדעת נשלחה למעסיקים עבור ${selectedJobIds.length} משרות`,
      });
      
      setSelectedJobIds([]);
      setRecommendation("");
      setJobSearchTerm("");
      setReferToJobDialogOpen(false);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשלוח את ההפניה למעסיק",
        variant: "destructive",
      });
    } finally {
      setIsSendingReferral(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !candidate || newStatus === candidate.status) return;
    
    if (isUpdatingStatus) return; // Prevent double clicks
    setIsUpdatingStatus(true);

    try {
      await updateMutation.mutateAsync({ status: newStatus });
      
      toast({
        title: "סטטוס עודכן",
        description: "סטטוס המועמד עודכן בהצלחה",
      });
      
      setNewStatus("");
      setStatusDialogOpen(false);
      
      // Refresh events to show the new status change event
      if (showEvents) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}/events`] });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הסטטוס",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
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
                        <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
                          <DialogTrigger asChild>
                            <button
                              className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
                              title="שלח הודעת וואטסאפ"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                              </svg>
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md" dir="rtl">
                            <DialogHeader>
                              <DialogTitle>בחר סוג הודעה לווטסאפ</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              {templates.length > 0 ? (
                                templates.map((template) => (
                                  <Button
                                    key={template.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleTemplateSelection(template.name)}
                                  >
                                    {template.icon} {template.name}
                                  </Button>
                                ))
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleTemplateSelection("זימון לראיון עבודה")}
                                  >
                                    📅 זימון לראיון עבודה
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleTemplateSelection("אין מענה בנייד")}
                                  >
                                    📞 אין מענה בנייד
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleTemplateSelection("בקשת עדכון פרטים")}
                                  >
                                    📝 בקשת עדכון פרטים
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleTemplateSelection("הודעת תודה")}
                                  >
                                    🙏 הודעת תודה
                                  </Button>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Template Editor Dialog */}
                        <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>ערוך הודעה - {selectedMessageType}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">תוכן ההודעה:</label>
                                <textarea
                                  value={editableTemplate}
                                  onChange={(e) => setEditableTemplate(e.target.value)}
                                  className="w-full h-60 p-3 border rounded-md resize-none text-sm font-mono leading-relaxed"
                                  dir="rtl"
                                  placeholder="כתוב את תוכן ההודעה כאן..."
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditTemplateDialogOpen(false)}
                                >
                                  ביטול
                                </Button>
                                <Button
                                  onClick={handleSendWhatsAppMessage}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  📱 שלח בוואטסאפ
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEvents(!showEvents)}
                className="flex items-center gap-2"
                data-testid="button-recent-events"
              >
                <History className="w-4 h-4" />
                אירועים אחרונים
              </Button>
              
              <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-blue-600 border-blue-200"
                  >
                    📊 שנה סטטוס
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>שנה סטטוס מועמד</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">סטטוס נוכחי: {getStatusText(candidate.status || '')}</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="בחר סטטוס חדש" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">ממתין</SelectItem>
                          <SelectItem value="pending_initial_screening">ממתין לסינון ראשוני</SelectItem>
                          <SelectItem value="in_initial_screening">בסינון ראשוני</SelectItem>
                          <SelectItem value="passed_initial_screening">עבר סינון ראשוני</SelectItem>
                          <SelectItem value="failed_initial_screening">נפסל בסינון ראשוני</SelectItem>
                          <SelectItem value="sent_to_employer">נשלח למעסיק</SelectItem>
                          <SelectItem value="whatsapp_sent">נשלחה הודעת ווצאפ</SelectItem>
                          <SelectItem value="phone_contact_made">נוצר קשר טלפוני</SelectItem>
                          <SelectItem value="waiting_employer_response">מועמד ממתין לתשובת מעסיק</SelectItem>
                          <SelectItem value="invited_to_interview">זומן לראיון אצל מעסיק</SelectItem>
                          <SelectItem value="attended_interview">הגיע לראיון אצל מעסיק</SelectItem>
                          <SelectItem value="missed_interview">לא הגיע לראיון</SelectItem>
                          <SelectItem value="passed_interview">עבר ראיון אצל מעסיק</SelectItem>
                          <SelectItem value="rejected_by_employer">נפסל ע"י מעסיק</SelectItem>
                          <SelectItem value="hired">התקבל לעבודה</SelectItem>
                          <SelectItem value="employment_ended">סיים העסקה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatusDialogOpen(false);
                          setNewStatus('');
                        }}
                      >
                        ביטול
                      </Button>
                      <Button 
                        onClick={handleStatusChange}
                        disabled={isUpdatingStatus || !newStatus || newStatus === candidate.status}
                      >
                        {isUpdatingStatus ? "מעדכן..." : "💾 עדכן סטטוס"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <ReminderForm candidateId={candidate.id} />

              <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-purple-600 border-purple-200"
                  >
                    📝 הוסף הערה
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>הוסף הערה למועמד</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full h-32 p-3 border rounded-md resize-none"
                      dir="rtl"
                      placeholder="כתוב הערה על המועמד..."
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setNotesDialogOpen(false)}
                      >
                        ביטול
                      </Button>
                      <Button 
                        onClick={handleAddNote}
                        disabled={isAddingNote}
                      >
                        {isAddingNote ? "שומר..." : "💾 שמור הערה"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={referToJobDialogOpen} onOpenChange={(open) => {
                setReferToJobDialogOpen(open);
                if (!open) {
                  setSelectedJobIds([]);
                  setRecommendation('');
                  setJobSearchTerm('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-green-600 border-green-200"
                  >
                    📧 הפנה למשרה
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>הפנה מועמד למשרה</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">חיפוש משרות:</label>
                      <Input
                        value={jobSearchTerm}
                        onChange={(e) => setJobSearchTerm(e.target.value)}
                        className="w-full mt-1"
                        placeholder="חפש לפי שם משרה או חברה..."
                        dir="rtl"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">
                        בחר משרות ({selectedJobIds.length} נבחרו):
                      </label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2 mt-1">
                        {jobsLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">טוען משרות...</p>
                          </div>
                        ) : jobsError ? (
                          <p className="text-red-500 text-sm text-center py-4">
                            שגיאה בטעינת המשרות: {(jobsError as any)?.message || 'שגיאה לא ידועה'}
                          </p>
                        ) : filteredJobs.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">
                            {jobSearchTerm ? 'לא נמצאו משרות מתאימות' : `אין משרות זמינות (טועדות: ${jobs.length})`}
                          </p>
                        ) : (
                          filteredJobs.map((job: any) => (
                            <div
                              key={job.id}
                              className={`flex items-center space-x-2 space-x-reverse p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                selectedJobIds.includes(job.id) ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                              onClick={() => toggleJobSelection(job.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedJobIds.includes(job.id)}
                                onChange={() => toggleJobSelection(job.id)}
                                className="rounded"
                              />
                              <div className="flex-1 text-right">
                                <div className="font-medium text-sm">{job.title}</div>
                                <div className="text-xs text-gray-500">{job.client?.name}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">חוות דעת על המועמד:</label>
                      <textarea
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        className="w-full h-32 p-3 border rounded-md resize-none"
                        dir="rtl"
                        placeholder="כתוב חוות דעת מקצועית על המועמד למעסיק..."
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setReferToJobDialogOpen(false)}
                      >
                        ביטול
                      </Button>
                      <Button 
                        onClick={handleJobReferral}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isSendingReferral}
                      >
                        {isSendingReferral ? "שולח..." : "📧 שלח למעסיק"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                              <span className="text-base font-medium">
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
                                 event.eventType === 'whatsapp_message' ? 'הודעת וואטסאפ' :
                                 event.eventType === 'note_added' ? 'הערה נוספה' :
                                 event.eventType === 'job_referral' ? 'הופנה למשרה' :
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
                                {event.metadata.template && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-line">
                                    <strong>תבנית ההודעה:</strong>
                                    <br />
                                    {event.metadata.template}
                                  </div>
                                )}
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
                    <div className="flex justify-end">
                      <Button 
                        onClick={saveAllChanges} 
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        שמור הכל
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">שם פרטי:</span>
                      <Input
                        value={fieldValues.firstName || ''}
                        onChange={(e) => updateFieldValue('firstName', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס שם פרטי"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">שם משפחה:</span>
                      <Input
                        value={fieldValues.lastName || ''}
                        onChange={(e) => updateFieldValue('lastName', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס שם משפחה"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">דוא״ל:</span>
                      <Input
                        value={fieldValues.email || ''}
                        onChange={(e) => updateFieldValue('email', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס דוא״ל"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">טלפון 1:</span>
                      <Input
                        value={fieldValues.phone || ''}
                        onChange={(e) => updateFieldValue('phone', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס טלפון"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">טלפון 2:</span>
                      <Input
                        value={fieldValues.phone2 || ''}
                        onChange={(e) => updateFieldValue('phone2', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס טלפון 2"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">תעודת זהות:</span>
                      <Input
                        value={fieldValues.nationalId || ''}
                        onChange={(e) => updateFieldValue('nationalId', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס ת.ז."
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">עיר:</span>
                      <Input
                        value={fieldValues.city || ''}
                        onChange={(e) => updateFieldValue('city', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס עיר"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">רחוב:</span>
                      <Input
                        value={fieldValues.street || ''}
                        onChange={(e) => updateFieldValue('street', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס רחוב"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">מס' בית:</span>
                      <Input
                        value={fieldValues.houseNumber || ''}
                        onChange={(e) => updateFieldValue('houseNumber', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס מס' בית"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">מין:</span>
                      <Select
                        value={fieldValues.gender || ''}
                        onValueChange={(value) => updateFieldValue('gender', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="בחר מין" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="זכר">זכר</SelectItem>
                          <SelectItem value="נקבה">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">מצב משפחתי:</span>
                      <Select
                        value={fieldValues.maritalStatus || ''}
                        onValueChange={(value) => updateFieldValue('maritalStatus', value)}
                      >
                        <SelectTrigger className="w-48">
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
                      <span className="text-base font-medium">ניידות:</span>
                      <Input
                        value={fieldValues.mobile || ''}
                        onChange={(e) => updateFieldValue('mobile', e.target.value)}
                        className="w-48 text-base"
                        placeholder="הכנס ניידות"
                      />
                    </div>
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">רישיון נהיגה:</span>
                      <Select
                        value={fieldValues.drivingLicense || ''}
                        onValueChange={(value) => updateFieldValue('drivingLicense', value)}
                      >
                        <SelectTrigger className="w-48">
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
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">סטטוס:</span>
                      <Select
                        value={fieldValues.status || ''}
                        onValueChange={(value) => updateFieldValue('status', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="בחר סטטוס" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">זמין</SelectItem>
                          <SelectItem value="employed">מועסק</SelectItem>
                          <SelectItem value="inactive">לא פעיל</SelectItem>
                          <SelectItem value="blacklisted">ברשימה שחורה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes Section */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-base font-medium mb-3 flex items-center gap-2">
                        📝 הערות על המועמד ({noteEvents.length})
                      </h4>
                      {noteEvents.length > 0 ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {noteEvents.map((note: any) => (
                            <div key={note.id} className="bg-purple-50 p-3 rounded-lg border-r-4 border-purple-200">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-purple-600 font-medium">
                                  {note.userName || 'משתמש לא ידוע'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(note.createdAt).toLocaleDateString('he-IL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed" dir="rtl">
                                {note.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">אין הערות על המועמד</p>
                      )}
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