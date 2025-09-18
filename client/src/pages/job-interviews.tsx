import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  UserCheck, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowRight,
  Briefcase,
  MessageSquare,
  Eye,
  Calendar,
  Plus
} from "lucide-react";
import type { JobApplicationWithDetails, JobApplication, JobWithClient } from "@shared/schema";

export default function JobInterviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/interviews/:jobId");
  const jobId = params?.jobId;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [whatsappDialog, setWhatsappDialog] = useState(false);
  const [selectedWhatsappMessage, setSelectedWhatsappMessage] = useState("");
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [warningAlert, setWarningAlert] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const whatsappMessages = [
    "שלום, זה מחברת גיוס H-Group. ניסיתי להתקשר אליך לגבי משרה שתואמת לך. אנא צור איתי קשר בחזרה",
    "שלום, מחברת גיוס H-Group. יש לי הצעת עבודה מעניינת בשבילך. אשמח לשוחח איתך",
    "היי, זה מחברת גיוס H-Group. זכור שהיה לנו קדם קשר? יש לי משרה נחמדה שתתאים לך",
    "שלום, מחברת גיוס H-Group. אשמח לשוחח איתך על משרה שמתאימה לפרופיל שלך",
    "היי, זה מחברת גיוס H-Group. נשמח לשמוע אם אתה עדיין מחפש משרה חדשה"
  ];

  // Check for previous candidate events for this job in the last 45 days
  const checkPreviousEvents = async (candidateId: string, jobId: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/events`);
      if (!response.ok) return;
      
      const events = await response.json();
      const now = new Date();
      const fortyFiveDaysAgo = new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000));
      
      // Look for relevant events in the last 45 days for this specific job
      const recentEvents = events.filter((event: any) => {
        const eventDate = new Date(event.createdAt);
        const isRecent = eventDate >= fortyFiveDaysAgo;
        const isSameJob = event.metadata?.jobId === jobId || event.metadata?.jobTitle;
        const isRelevantEvent = ['sent_to_employer', 'rejected_by_employer', 'rejected'].includes(event.eventType);
        
        return isRecent && isSameJob && isRelevantEvent;
      });
      
      if (recentEvents.length > 0) {
        const latestEvent = recentEvents[0];
        const eventDate = new Date(latestEvent.createdAt);
        const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let eventDescription = '';
        if (latestEvent.eventType === 'sent_to_employer') {
          eventDescription = 'נשלח למעסיק';
        } else if (latestEvent.eventType === 'rejected_by_employer' || latestEvent.eventType === 'rejected') {
          eventDescription = 'נפסל';
        }
        
        const warningText = `⚠️ התראה: מועמד זה ${eventDescription} למשרה זו לפני ${daysAgo} ימים`;
        setWarningMessage(warningText);
        setWarningAlert(true);
      }
    } catch (error) {
      console.error('Error checking previous events:', error);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "נדרשת הזדהות",
        description: "מועבר למערכת...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch job details
  const { data: jobsData } = useQuery<{ jobs: JobWithClient[] }>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated && !!jobId,
  });

  const jobData = jobsData?.jobs.find(job => job.id === jobId);

  // Fetch job applications for this specific job
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<{ applications: JobApplicationWithDetails[] }>({
    queryKey: ["/api/job-applications"],
    enabled: isAuthenticated && !!jobId,
  });

  // Show only applications that haven't been reviewed yet
  const applications = applicationsData?.applications.filter(app => 
    app.jobId === jobId && 
    app.status === 'submitted' && 
    !app.reviewedAt
  ) || [];
  const currentApplication = applications[currentIndex];

  // Check previous events when current application changes
  useEffect(() => {
    if (currentApplication && jobId && currentApplication.candidateId) {
      checkPreviousEvents(currentApplication.candidateId, jobId);
    }
  }, [currentApplication?.candidateId, jobId]);

  // Mutations for application actions
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<JobApplication> }) => {
      await apiRequest("PATCH", `/api/job-applications/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      // Also invalidate specific candidate data if available
      if (currentApplication?.candidateId) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${currentApplication.candidateId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${currentApplication.candidateId}/events`] });
      }
      
      setReviewerFeedback("");
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "נדרשת הזדהות מחדש",
          description: "מועבר לדף התחברות...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: error.message || "פעולה נכשלה",
        variant: "destructive",
      });
    },
  });

  const handleApprove = async () => {
    if (!currentApplication) return;
    
    try {
      // Update application status
      await updateApplicationMutation.mutateAsync({
        id: currentApplication.id,
        updates: {
          status: 'interview',
          reviewerFeedback,
          reviewedAt: new Date(),
          sentToClient: true,
        }
      });

      // Update candidate status to 'sent_to_employer'
      await apiRequest("PATCH", `/api/candidates/${currentApplication.candidateId}`, {
        status: 'sent_to_employer',
        lastStatusChange: new Date(),
      });

      // Send candidate profile to employer via email (only if email is configured)
      let emailSent = false;
      let emailError = null;
      
      if (jobData?.client?.email) {
        try {
          await apiRequest("POST", "/api/send-candidate-profile", {
            candidateId: currentApplication.candidateId,
            jobId: currentApplication.jobId,
            reviewerFeedback: reviewerFeedback || "מועמד מומלץ למשרה",
            recipientEmail: jobData.client.email,
            recipientName: jobData.client.contactName,
          });
          emailSent = true;
        } catch (error) {
          console.error('Email sending failed:', error);
          emailError = error;
          emailSent = false;
        }
      }
      
      // Show accurate success/error message
      if (emailSent) {
        toast({
          title: "מועמד נשלח למעסיק! ✅",
          description: "המועמד נשלח למעסיק בהצלחה עם חוות הדעת שלך",
        });
      } else if (jobData?.client?.email && emailError) {
        toast({
          title: "מועמד אושר אבל המייל נכשל! ⚠️",
          description: "המועמד אושר במערכת אבל לא ניתן לשלוח מייל למעסיק. אנא צור קשר ידני.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "מועמד אושר בהצלחה! ✅",
          description: "המועמד אושר והתווסף לרשימת המועמדים המאושרים",
        });
      }

      // Move to next candidate automatically
      setTimeout(() => {
        if (currentIndex < applications.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setReviewerFeedback("");
          setWarningAlert(false);
          setWarningMessage("");
        } else {
          toast({
            title: "סיימת לבדוק את כל המועמדים! 🎉",
            description: "כל המועמדויות למשרה זו נבדקו",
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Error approving candidate:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת המועמד למעסיק",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!currentApplication) return;
    
    try {
      // Update application status
      await updateApplicationMutation.mutateAsync({
        id: currentApplication.id,
        updates: {
          status: 'rejected',
          reviewerFeedback,
          reviewedAt: new Date(),
        }
      });

      // Update candidate status to 'rejected_by_employer'
      await apiRequest("PATCH", `/api/candidates/${currentApplication.candidateId}`, {
        status: 'rejected_by_employer',
        lastStatusChange: new Date(),
        notes: reviewerFeedback ? `הערות פסילה: ${reviewerFeedback}` : undefined,
      });
      
      toast({
        title: "מועמד נפסל ❌",
        description: "המועמד סומן כנפסל והערותיך נשמרו",
      });

      // Move to next candidate automatically
      setTimeout(() => {
        if (currentIndex < applications.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setReviewerFeedback("");
          setWarningAlert(false);
          setWarningMessage("");
        } else {
          toast({
            title: "סיימת לבדוק את כל המועמדים! 🎉",
            description: "כל המועמדויות למשרה זו נבדקו",
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון סטטוס המועמד",
        variant: "destructive",
      });
    }
  };

  const handleNeedsMoreReview = () => {
    if (!currentApplication) return;
    
    updateApplicationMutation.mutate({
      id: currentApplication.id,
      updates: {
        status: 'submitted',
        reviewerFeedback,
        reviewedAt: new Date(),
      }
    });
    
    toast({
      title: "נדרש ראיון נוסף 🔄",
      description: "המועמד סומן לבדיקה נוספת",
    });
  };

  const handleWhatsappSend = async () => {
    if (!currentApplication || !selectedWhatsappMessage) return;
    
    try {
      // Update candidate status to 'whatsapp_sent'
      await apiRequest("PATCH", `/api/candidates/${currentApplication.candidateId}`, {
        status: 'whatsapp_sent',
        lastStatusChange: new Date(),
        notes: `הודעת ווצאפ נשלחה: ${selectedWhatsappMessage}`,
      });

      // Update application with WhatsApp note
      await updateApplicationMutation.mutateAsync({
        id: currentApplication.id,
        updates: {
          reviewerFeedback: `הודעת ווצאפ נשלחה: ${selectedWhatsappMessage}`,
        }
      });

      // Open WhatsApp with the message
      const phoneNumber = currentApplication.candidate.phone?.replace(/^0/, '972');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(selectedWhatsappMessage)}`;
      window.open(whatsappUrl, '_blank');
      
      setWhatsappDialog(false);
      setSelectedWhatsappMessage("");
      
      toast({
        title: "הודעת ווצאפ נשלחה! 📱",
        description: "המועמד הועבר לסוף הרשימה והסטטוס עודכן",
      });

      // Move to next candidate automatically
      setTimeout(() => {
        if (currentIndex < applications.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setReviewerFeedback("");
          setWarningAlert(false);
          setWarningMessage("");
        } else {
          toast({
            title: "סיימת לבדוק את כל המועמדים! 🎉",
            description: "כל המועמדויות למשרה זו נבדקו",
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת הודעת ווצאפ",
        variant: "destructive",
      });
    }
  };

  const handleScheduleInterview = async () => {
    if (!currentApplication || !interviewDate || !interviewTime) return;
    
    try {
      const interviewDateTime = new Date(`${interviewDate}T${interviewTime}`);
      
      // Update application status
      await updateApplicationMutation.mutateAsync({
        id: currentApplication.id,
        updates: {
          status: 'submitted',
          reviewerFeedback: `נדרש ראיון נוסף ב-${interviewDateTime.toLocaleDateString('he-IL')} בשעה ${interviewTime}`,
          reviewedAt: new Date(),
        }
      });

      // Update candidate status
      await apiRequest("PATCH", `/api/candidates/${currentApplication.candidateId}`, {
        status: 'waiting_for_second_interview',
        lastStatusChange: new Date(),
      });

      // Create reminder event
      await apiRequest("POST", "/api/reminders", {
        title: `ראיון נוסף - ${currentApplication.candidate.firstName} ${currentApplication.candidate.lastName}`,
        description: `ראיון נוסף למועמד ${currentApplication.candidate.firstName} ${currentApplication.candidate.lastName} למשרה ${jobData?.title}`,
        dueDate: interviewDateTime,
        type: 'interview',
        candidateId: currentApplication.candidateId,
        jobId: currentApplication.jobId,
      });
      
      setInterviewDialog(false);
      setInterviewDate("");
      setInterviewTime("");
      
      toast({
        title: "ראיון נוסף נקבע! 📅",
        description: `ראיון נקבע ל-${interviewDateTime.toLocaleDateString('he-IL')} בשעה ${interviewTime}`,
      });

      // Move to next candidate automatically
      setTimeout(() => {
        if (currentIndex < applications.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setReviewerFeedback("");
          setWarningAlert(false);
          setWarningMessage("");
        } else {
          toast({
            title: "סיימת לבדוק את כל המועמדים! 🎉",
            description: "כל המועמדויות למשרה זו נבדקו",
          });
        }
      }, 1500);
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בקביעת הראיון",
        variant: "destructive",
      });
    }
  };

  const navigateToCandidate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setReviewerFeedback("");
      setWarningAlert(false); // Reset warning when navigating
      setWarningMessage("");
    } else if (direction === 'next' && currentIndex < applications.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setReviewerFeedback("");
      setWarningAlert(false); // Reset warning when navigating
      setWarningMessage("");
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  if (!jobId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            משרה לא נמצאה
          </h2>
          <Link href="/interviews">
            <Button>חזור לרשימת משרות</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (applicationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <UserCheck className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">טוען מועמדות לסקירה...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            כל המועמדים נבדקו! ✅
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            כל המועמדויות למשרה זו כבר נבדקו ואושרו/נפסלו. אין מועמדים נוספים לבדיקה.
          </p>
          <Link href="/interviews">
            <Button>חזור לרשימת משרות</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentApplication) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            מועמד לא נמצא
          </h2>
          <Link href="/interviews">
            <Button>חזור לרשימת משרות</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with candidate info */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
            <Link href="/interviews" className="hover:text-blue-600">
              ראיונות
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{jobData?.title}</span>
          </div>

          {/* Candidate Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <User className="h-10 w-10 p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 rounded-full" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentApplication.candidate.firstName} {currentApplication.candidate.lastName}
                  </h1>
                  <div className="flex items-center gap-4 mt-1">
                    {currentApplication.candidate.phone && (
                      <a
                        href={`tel:${currentApplication.candidate.phone}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        data-testid="link-phone"
                      >
                        <Phone className="h-4 w-4" />
                        {currentApplication.candidate.phone}
                      </a>
                    )}
                    {currentApplication.candidate.email && (
                      <a
                        href={`mailto:${currentApplication.candidate.email}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        data-testid="link-email"
                      >
                        <Mail className="h-4 w-4" />
                        {currentApplication.candidate.email}
                      </a>
                    )}
                    {currentApplication.candidate.phone && (
                      <Dialog open={whatsappDialog} onOpenChange={setWhatsappDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 border-green-200"
                            data-testid="button-whatsapp"
                          >
                            <MessageSquare className="h-4 w-4" />
                            שלח ווצאפ
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>שליחת הודעת ווצאפ</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>בחר הודעה מוכנה:</Label>
                              <Select value={selectedWhatsappMessage} onValueChange={setSelectedWhatsappMessage}>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר הודעה..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {whatsappMessages.map((message, index) => (
                                    <SelectItem key={index} value={message}>
                                      {message.substring(0, 50)}...
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {selectedWhatsappMessage && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm">{selectedWhatsappMessage}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button onClick={handleWhatsappSend} disabled={!selectedWhatsappMessage}>
                                שלח הודעה
                              </Button>
                              <Button variant="outline" onClick={() => setWhatsappDialog(false)}>
                                ביטול
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                מועמד {currentIndex + 1} מתוך {applications.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToCandidate('prev')}
                  disabled={currentIndex === 0}
                  data-testid="button-prev-candidate"
                >
                  <ChevronRight className="h-4 w-4" />
                  הקודם
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToCandidate('next')}
                  disabled={currentIndex === applications.length - 1}
                  data-testid="button-next-candidate"
                >
                  הבא
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-10 gap-6">
          {/* Right Column - Job Details (30%) */}
          <div className="col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  פרטי המשרה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {jobData?.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {jobData?.client?.companyName || 'לא צוין'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {jobData?.location}
                    </span>
                  </div>
                </div>

                {jobData?.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">תיאור התפקיד</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {jobData.description}
                    </p>
                  </div>
                )}

                {jobData?.requirements && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">דרישות התפקיד</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {jobData.requirements}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">סוג משרה</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {jobData?.jobType || 'לא צוין'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">משכורת</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {jobData?.salaryRange || 'לא צוין'}
                    </p>
                  </div>
                </div>

                {jobData?.client && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">איש קשר</h4>
                    <div className="space-y-1">
                      <p className="text-sm">{jobData.client.contactName || 'לא צוין'}</p>
                      {jobData.client.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <Mail className="h-3 w-3" />
                          {jobData.client.email}
                        </div>
                      )}
                      {jobData.client.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="h-3 w-3" />
                          {jobData.client.phone}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Area */}
            <Card>
              <CardHeader>
                <CardTitle>הערכת המועמד</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Status Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={updateApplicationMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    ✅ מתאים
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={updateApplicationMutation.isPending}
                    variant="destructive"
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    ❌ לא מתאים
                  </Button>
                  <Dialog open={interviewDialog} onOpenChange={setInterviewDialog}>
                    <DialogTrigger asChild>
                      <Button
                        disabled={updateApplicationMutation.isPending}
                        variant="outline"
                        data-testid="button-more-review"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        🔄 נדרש ראיון נוסף
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>קביעת ראיון נוסף</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="interview-date">תאריך הראיון:</Label>
                          <Input
                            id="interview-date"
                            type="date"
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div>
                          <Label htmlFor="interview-time">שעת הראיון:</Label>
                          <Input
                            id="interview-time"
                            type="time"
                            value={interviewTime}
                            onChange={(e) => setInterviewTime(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleScheduleInterview} 
                            disabled={!interviewDate || !interviewTime}
                          >
                            הפנייה לראיון
                          </Button>
                          <Button variant="outline" onClick={() => setInterviewDialog(false)}>
                            ביטול
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    הערות פנימיות (אופציונלי)
                  </label>
                  <Textarea
                    value={reviewerFeedback}
                    onChange={(e) => setReviewerFeedback(e.target.value)}
                    placeholder="הזן חוות דעת או הערות על המועמד..."
                    className="min-h-20"
                    data-testid="textarea-reviewer-feedback"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    הערות אלו ישמרו במערכת לעיון עתידי
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Left Column - CV Preview (70%) */}
          <div className="col-span-7">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    קורות החיים
                  </span>
                  {currentApplication.candidate.cvPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentApplication.candidate.cvPath) {
                          window.open(`/api/candidates/${currentApplication.candidate.id}/cv`, '_blank');
                        }
                      }}
                      data-testid="button-download-cv"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      הורד קובץ
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentApplication.candidate.cvPath ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b flex items-center justify-between">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        קורות חיים - {currentApplication.candidate.firstName} {currentApplication.candidate.lastName}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/candidates/${currentApplication.candidate.id}/cv`, '_blank')}
                          data-testid="button-view-cv"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          פתח בחלון חדש
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/api/candidates/${currentApplication.candidate.id}/cv`;
                            link.download = `CV-${currentApplication.candidate.firstName}-${currentApplication.candidate.lastName}.pdf`;
                            link.click();
                          }}
                          data-testid="button-download-cv"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          הורד
                        </Button>
                      </div>
                    </div>
                    <iframe
                      src={`/api/candidates/${currentApplication.candidate.id}/cv`}
                      className="w-full border-0 bg-white dark:bg-gray-800"
                      title={`קורות חיים - ${currentApplication.candidate.firstName} ${currentApplication.candidate.lastName}`}
                      style={{ height: 'calc(100vh - 250px)', minHeight: '700px' }}
                      allow="fullscreen"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">
                      לא הועלה קובץ קורות חיים
                    </p>
                  </div>
                )}

                {/* Candidate Details from CV */}
                {currentApplication.candidate.experience && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      פרטים שחולצו מהקורות חיים
                    </h4>
                    <div className="space-y-3 text-sm">
                      {currentApplication.candidate.experience && (
                        <div>
                          <span className="font-medium">ניסיון תעסוקתי:</span>
                          <p className="text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                            {currentApplication.candidate.experience}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Warning Alert for Previous Events */}
      <AlertDialog open={warningAlert} onOpenChange={setWarningAlert}>
        <AlertDialogContent className="w-[90%] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-orange-600">
              ⚠️ התראה חשובה
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-lg">
              {warningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center">
            <AlertDialogAction 
              onClick={() => setWarningAlert(false)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              הבנתי
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}