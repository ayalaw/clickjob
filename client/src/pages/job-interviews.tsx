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
  Eye
} from "lucide-react";
import type { JobApplicationWithDetails, JobApplication, JobWithClient } from "@shared/schema";

export default function JobInterviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/interviews/:jobId");
  const jobId = params?.jobId;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewerFeedback, setReviewerFeedback] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "נדרשת הזדהות",
        description: "מועבר למערכת...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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

  const applications = applicationsData?.applications.filter(app => app.jobId === jobId) || [];
  const currentApplication = applications[currentIndex];

  // Mutations for application actions
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<JobApplication> }) => {
      await apiRequest("PATCH", `/api/job-applications/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      setReviewerFeedback("");
      
      // Move to next candidate if available
      if (currentIndex < applications.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: "סיימת לבדוק את כל המועמדים! 🎉",
          description: "כל המועמדויות למשרה זו נבדקו",
        });
      }
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
        sentToClient: true,
      }
    });
    
    toast({
      title: "מועמד אושר! ✅",
      description: "המועמד הועבר לשלב הבא ונשלח ללקוח",
    });
  };

  const handleReject = () => {
    if (!currentApplication) return;
    
    updateApplicationMutation.mutate({
      id: currentApplication.id,
      updates: {
        status: 'rejected',
        reviewerFeedback,
        reviewedAt: new Date(),
      }
    });
    
    toast({
      title: "מועמד נפסל ❌",
      description: "המועמד הועבר לסטטוס נפסל",
    });
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

  const navigateToCandidate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setReviewerFeedback("");
    } else if (direction === 'next' && currentIndex < applications.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setReviewerFeedback("");
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
            אין מועמדויות למשרה זו
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            לא נמצאו מועמדויות הממתינות לסקירה עבור המשרה הזו
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
                      <a
                        href={`https://wa.me/972${currentApplication.candidate.phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                        data-testid="link-whatsapp"
                      >
                        <MessageSquare className="h-4 w-4" />
                        וואטסאפ
                      </a>
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
                  <Button
                    onClick={handleNeedsMoreReview}
                    disabled={updateApplicationMutation.isPending}
                    variant="outline"
                    data-testid="button-more-review"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    🔄 נדרש ראיון נוסף
                  </Button>
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
                    <div className="h-full flex flex-col">
                      {/* File info */}
                      <div className="flex justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <FileText className="w-4 h-4" />
                          קובץ קורות חיים - {currentApplication.candidate.cvPath?.split('/').pop()}
                        </div>
                      </div>
                      
                      {/* CV Display */}
                      <div className="flex-1 bg-white rounded border overflow-hidden">
                        {currentApplication.candidate.cvPath?.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={`/uploads/${currentApplication.candidate.cvPath?.replace('uploads/', '')}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : currentApplication.candidate.cvPath?.toLowerCase().includes('.doc') ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/uploads/' + currentApplication.candidate.cvPath?.replace('uploads/', ''))}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-gray-400">תצוגה מקדימה לא זמינה</p>
                          </div>
                        )}
                      </div>
                    </div>
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
    </div>
  );
}