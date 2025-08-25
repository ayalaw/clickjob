import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  UserCheck, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Calendar,
  CheckCircle, 
  XCircle, 
  Send,
  ArrowLeft,
  ArrowRight,
  Download,
  Briefcase,
  Star,
  Globe
} from "lucide-react";
import type { JobApplicationWithDetails, JobApplication } from "@shared/schema";

export default function Interviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentApplicationIndex, setCurrentApplicationIndex] = useState(0);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "נדרשת הזדהות",
        description: "נועלת למערכת...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch job applications for interviews
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<{ applications: JobApplicationWithDetails[] }>({
    queryKey: ["/api/job-applications", "for-review"],
    enabled: isAuthenticated,
  });

  const applications = applicationsData?.applications || [];
  const currentApplication = applications[currentApplicationIndex];

  // Mutations for application actions
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<JobApplication> }) => {
      await apiRequest(`/api/job-applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      // Move to next application after action
      if (currentApplicationIndex < applications.length - 1) {
        setCurrentApplicationIndex(currentApplicationIndex + 1);
      }
      setReviewerFeedback("");
      setSelectedRejectionReason("");
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "נדרשת הזדהות מחדש",
          description: "מועבר לדף התחברות...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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

  const handleApprove = () => {
    if (!currentApplication) return;
    
    updateApplicationMutation.mutate({
      id: currentApplication.id,
      updates: {
        status: 'interview',
        reviewerFeedback,
        reviewedAt: new Date(),
        sentToClient: !!reviewerFeedback.trim(),
      }
    });
    
    toast({
      title: "מועמד אושר! ✅",
      description: "המועמד הועבר לשלב הבא",
    });
  };

  const handleReject = () => {
    if (!currentApplication || !selectedRejectionReason) {
      toast({
        title: "שגיאה",
        description: "יש לבחור סיבת פסילה",
        variant: "destructive",
      });
      return;
    }
    
    updateApplicationMutation.mutate({
      id: currentApplication.id,
      updates: {
        status: 'rejected',
        rejectionReason: selectedRejectionReason as any,
        reviewerFeedback,
        reviewedAt: new Date(),
      }
    });
    
    toast({
      title: "מועמד נפסל",
      description: "הסטטוס נשמר במערכת",
    });
  };

  const handleSendFeedback = () => {
    if (!currentApplication || !reviewerFeedback.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין חוות דעת",
        variant: "destructive",
      });
      return;
    }
    
    updateApplicationMutation.mutate({
      id: currentApplication.id,
      updates: {
        reviewerFeedback,
        sentToClient: true,
        reviewedAt: new Date(),
      }
    });
    
    toast({
      title: "חוות דעת נשלחה! 📧",
      description: "הועברה ללקוח בהצלחה",
    });
  };

  const goToPrevious = () => {
    if (currentApplicationIndex > 0) {
      setCurrentApplicationIndex(currentApplicationIndex - 1);
      setReviewerFeedback("");
      setSelectedRejectionReason("");
    }
  };

  const goToNext = () => {
    if (currentApplicationIndex < applications.length - 1) {
      setCurrentApplicationIndex(currentApplicationIndex + 1);
      setReviewerFeedback("");
      setSelectedRejectionReason("");
    }
  };

  const getRejectionReasonText = (reason: string) => {
    const reasons = {
      lack_of_experience: "חוסר ניסיון",
      geographic_mismatch: "אי התאמה גיאוגרפית",
      salary_demands: "דרישות שכר",
      qualifications_mismatch: "אי התאמת כישורים",
      other: "אחר"
    };
    return reasons[reason as keyof typeof reasons] || reason;
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  if (applicationsLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="mr-64 flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 dark:text-gray-300">טוען מועמדות לסקירה...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!applications.length) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="mr-64">
          <Header title="סינון ראיונות" />
          <main className="p-8">
            <div className="text-center py-12">
              <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                אין מועמדות חדשות לסקירה
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                כל המועמדות נסקרו או שאין מועמדויות זמינות כרגע
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="mr-64 flex-1 flex flex-col">
        <Header title="סינון ראיונות" />
        
        {/* Action Buttons Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSendFeedback}
                disabled={updateApplicationMutation.isPending || !reviewerFeedback.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-send-feedback"
              >
                <Send className="h-4 w-4 ml-1" />
                שלח למעסיק
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={updateApplicationMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-approve-candidate"
              >
                <CheckCircle className="h-4 w-4 ml-1" />
                מתאים לראיון
              </Button>
              
              <Button
                onClick={handleReject}
                disabled={updateApplicationMutation.isPending || !selectedRejectionReason}
                variant="destructive"
                data-testid="button-reject-candidate"
              >
                <XCircle className="h-4 w-4 ml-1" />
                פסול מועמד
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                מועמד {currentApplicationIndex + 1} מתוך {applications.length}
              </span>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentApplicationIndex === 0}
                  data-testid="button-previous-candidate"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={currentApplicationIndex >= applications.length - 1}
                  data-testid="button-next-candidate"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 flex overflow-hidden">
          {/* Left side - CV Display (75% width) */}
          <div className="flex-1 w-3/4 p-4">
            <Card className="h-full">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    קורות חיים - {currentApplication?.candidate.firstName} {currentApplication?.candidate.lastName}
                  </CardTitle>
                  {currentApplication?.candidate.cvPath && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/uploads/${currentApplication.candidate.cvPath}`, '_blank')}
                      data-testid="button-download-cv"
                    >
                      <Download className="h-4 w-4 ml-1" />
                      הורד PDF
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 h-full">
                {currentApplication?.candidate.cvPath ? (
                  <div className="h-full">
                    <iframe
                      src={`/uploads/${currentApplication.candidate.cvPath}`}
                      className="w-full h-full border-0"
                      title="קורות חיים"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center text-gray-500">
                      <FileText className="h-24 w-24 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">לא הועלה קובץ קורות חיים</p>
                      <p className="text-sm mt-2">אנא העלה קובץ PDF או DOC</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right side - Info Panel (25% width) */}
          <div className="w-1/4 p-4 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="space-y-4 h-full overflow-y-auto">
              
              {/* Job & Company Info */}
              <Card>
                <CardHeader className="py-3 px-4 bg-blue-50 dark:bg-blue-900/20">
                  <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-base">
                    <Building2 className="h-4 w-4" />
                    פרטי המשרה
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {currentApplication && (
                    <>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                          {currentApplication.job.client.companyName}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {currentApplication.job.client.industry}
                        </p>
                      </div>

                      <Separator />

                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Briefcase className="h-3 w-3" />
                          <span className="font-medium text-xs">{currentApplication.job.title}</span>
                        </div>
                        {currentApplication.job.jobCode && (
                          <Badge variant="secondary" className="text-xs mb-2">
                            קוד: {currentApplication.job.jobCode}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <MapPin className="h-3 w-3" />
                          {currentApplication.job.location}
                        </div>
                      </div>

                      <div>
                        <h6 className="font-medium text-xs mb-1">איש קשר:</h6>
                        <p className="text-xs font-medium">{currentApplication.job.client.contactName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          <Mail className="h-3 w-3" />
                          {currentApplication.job.client.email}
                        </div>
                        {currentApplication.job.client.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                            <Phone className="h-3 w-3" />
                            {currentApplication.job.client.phone}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Candidate Info */}
              <Card>
                <CardHeader className="py-3 px-4 bg-green-50 dark:bg-green-900/20">
                  <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200 text-base">
                    <UserCheck className="h-4 w-4" />
                    פרטי המועמד
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {currentApplication && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm font-bold bg-blue-100 text-blue-800">
                            {currentApplication.candidate.firstName[0]}{currentApplication.candidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm">
                            {currentApplication.candidate.firstName} {currentApplication.candidate.lastName}
                          </h4>
                          {currentApplication.candidate.profession && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {currentApplication.candidate.profession}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{currentApplication.candidate.city}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{currentApplication.candidate.mobile}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="break-all">{currentApplication.candidate.email}</span>
                        </div>
                        {currentApplication.candidate.experience && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>{currentApplication.candidate.experience} שנות ניסיון</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Panel */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">פאנל פעולות</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Feedback Text Area */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      חוות דעת (עד 1000 תווים):
                    </label>
                    <Textarea
                      value={reviewerFeedback}
                      onChange={(e) => setReviewerFeedback(e.target.value)}
                      placeholder="הזן חוות דעת על המועמד..."
                      maxLength={1000}
                      className="min-h-20 text-xs"
                      data-testid="textarea-reviewer-feedback"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {reviewerFeedback.length}/1000 תווים
                    </p>
                  </div>

                  {/* Rejection Reason */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      סיבת פסילה:
                    </label>
                    <Select value={selectedRejectionReason} onValueChange={setSelectedRejectionReason}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-rejection-reason">
                        <SelectValue placeholder="בחר סיבה..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lack_of_experience">חוסר ניסיון</SelectItem>
                        <SelectItem value="geographic_mismatch">אי התאמה גיאוגרפית</SelectItem>
                        <SelectItem value="salary_demands">דרישות שכר</SelectItem>
                        <SelectItem value="qualifications_mismatch">אי התאמת כישורים</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}