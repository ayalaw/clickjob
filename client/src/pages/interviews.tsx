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
  Briefcase
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
          <Header />
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
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-600" />
                סינון ראיונות
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                סקירת מועמדים והעברה ללקוחות - מועמד {currentApplicationIndex + 1} מתוך {applications.length}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentApplicationIndex === 0}
                data-testid="button-previous-candidate"
              >
                <ArrowRight className="h-4 w-4 ml-1" />
                הקודם
              </Button>
              <Button
                variant="outline"
                onClick={goToNext}
                disabled={currentApplicationIndex >= applications.length - 1}
                data-testid="button-next-candidate"
              >
                הבא
                <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Right side - Job & Company Info */}
            <Card className="h-fit">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-200">
                  <Building2 className="h-6 w-6" />
                  פרטי המשרה והחברה
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {currentApplication && (
                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentApplication.job.client.companyName}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {currentApplication.job.client.industry}
                      </p>
                    </div>

                    <Separator />

                    {/* Job Title */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {currentApplication.job.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {currentApplication.job.location}
                        </div>
                        <Badge variant="outline">
                          {currentApplication.job.jobType}
                        </Badge>
                        {currentApplication.job.isRemote && (
                          <Badge variant="secondary">עבודה מרחוק</Badge>
                        )}
                      </div>
                    </div>

                    {/* Job Description */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">תיאור התפקיד:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {currentApplication.job.description}
                      </p>
                    </div>

                    {/* Requirements */}
                    {currentApplication.job.requirements && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">דרישות התפקיד:</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {currentApplication.job.requirements}
                        </p>
                      </div>
                    )}

                    {/* Salary Range */}
                    {currentApplication.job.salaryRange && (
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">טווח שכר:</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {currentApplication.job.salaryRange}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Contact Info */}
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">איש קשר:</h5>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {currentApplication.job.client.contactName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Mail className="h-4 w-4" />
                          {currentApplication.job.client.email}
                        </div>
                        {currentApplication.job.client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Phone className="h-4 w-4" />
                            {currentApplication.job.client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Left side - Candidate Info */}
            <div className="space-y-6">
              {/* Candidate Header */}
              <Card>
                <CardContent className="p-6">
                  {currentApplication && (
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-800">
                          {currentApplication.candidate.firstName[0]}{currentApplication.candidate.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {currentApplication.candidate.firstName} {currentApplication.candidate.lastName}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <MapPin className="h-4 w-4" />
                            <span>{currentApplication.candidate.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Phone className="h-4 w-4" />
                            <span>{currentApplication.candidate.mobile}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Mail className="h-4 w-4" />
                            <span>{currentApplication.candidate.email}</span>
                          </div>
                          {currentApplication.candidate.experience && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                              <Briefcase className="h-4 w-4" />
                              <span>{currentApplication.candidate.experience} שנות ניסיון</span>
                            </div>
                          )}
                        </div>

                        {currentApplication.candidate.profession && (
                          <div className="mt-3">
                            <Badge variant="secondary">{currentApplication.candidate.profession}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV Display */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      קורות חיים
                    </div>
                    {currentApplication?.candidate.cvPath && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/uploads/${currentApplication.candidate.cvPath}`, '_blank')}
                        data-testid="button-download-cv"
                      >
                        <Download className="h-4 w-4 ml-1" />
                        הורד
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentApplication?.candidate.cvPath ? (
                    <div className="h-96 border rounded-lg overflow-hidden">
                      <iframe
                        src={`/uploads/${currentApplication.candidate.cvPath}`}
                        className="w-full h-full"
                        title="קורות חיים"
                      />
                    </div>
                  ) : (
                    <div className="h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>לא הועלה קובץ קורות חיים</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional candidate info */}
                  {currentApplication?.candidate.notes && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h6 className="font-medium text-gray-900 dark:text-white mb-1">הערות נוספות:</h6>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {currentApplication.candidate.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>פאנל פעולות</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Feedback Text Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    חוות דעת (עד 1000 תווים):
                  </label>
                  <Textarea
                    value={reviewerFeedback}
                    onChange={(e) => setReviewerFeedback(e.target.value)}
                    placeholder="הזן חוות דעת על המועמד..."
                    maxLength={1000}
                    className="min-h-24"
                    data-testid="textarea-reviewer-feedback"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {reviewerFeedback.length}/1000 תווים
                  </p>
                </div>

                {/* Rejection Reason (shown when rejecting) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    סיבת פסילה (לפסילה):
                  </label>
                  <Select value={selectedRejectionReason} onValueChange={setSelectedRejectionReason}>
                    <SelectTrigger data-testid="select-rejection-reason">
                      <SelectValue placeholder="בחר סיבת פסילה..." />
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSendFeedback}
                    disabled={updateApplicationMutation.isPending || !reviewerFeedback.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-send-feedback"
                  >
                    <Send className="h-4 w-4 ml-1" />
                    {updateApplicationMutation.isPending ? 'שולח...' : 'שלח חוות דעת למעסיק'}
                  </Button>
                  
                  <Button
                    onClick={handleApprove}
                    disabled={updateApplicationMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-approve-candidate"
                  >
                    <CheckCircle className="h-4 w-4 ml-1" />
                    {updateApplicationMutation.isPending ? 'מעבד...' : 'סמן מתאים'}
                  </Button>
                  
                  <Button
                    onClick={handleReject}
                    disabled={updateApplicationMutation.isPending || !selectedRejectionReason}
                    variant="destructive"
                    data-testid="button-reject-candidate"
                  >
                    <XCircle className="h-4 w-4 ml-1" />
                    {updateApplicationMutation.isPending ? 'מעבד...' : 'פסול מועמד'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}