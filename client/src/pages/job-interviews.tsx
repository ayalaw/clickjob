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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  UserCheck, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Send,
  Eye,
  Download,
  ArrowRight,
  Briefcase
} from "lucide-react";
import type { JobApplicationWithDetails, JobApplication, JobWithClient } from "@shared/schema";

export default function JobInterviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, params] = useRoute("/interviews/:jobId");
  const jobId = params?.jobId;
  
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationWithDetails | null>(null);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");

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
  const { data: jobData } = useQuery<JobWithClient>({
    queryKey: ["/api/jobs", jobId],
    enabled: isAuthenticated && !!jobId,
  });

  // Fetch job applications for this specific job
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<{ applications: JobApplicationWithDetails[] }>({
    queryKey: ["/api/job-applications", "for-review", jobId],
    enabled: isAuthenticated && !!jobId,
  });

  const applications = applicationsData?.applications.filter(app => app.jobId === jobId) || [];

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
      setReviewerFeedback("");
      setSelectedRejectionReason("");
      setSelectedApplication(null);
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

  const handleApprove = (application: JobApplicationWithDetails) => {
    updateApplicationMutation.mutate({
      id: application.id,
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

  const handleReject = (application: JobApplicationWithDetails) => {
    if (!selectedRejectionReason) {
      toast({
        title: "שגיאה",
        description: "יש לבחור סיבת פסילה",
        variant: "destructive",
      });
      return;
    }
    
    updateApplicationMutation.mutate({
      id: application.id,
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

  const handleSendFeedback = (application: JobApplicationWithDetails) => {
    if (!reviewerFeedback.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין חוות דעת",
        variant: "destructive",
      });
      return;
    }
    
    updateApplicationMutation.mutate({
      id: application.id,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">הוגש</Badge>;
      case 'interview':
        return <Badge className="bg-green-100 text-green-800">בראיון</Badge>;
      case 'rejected':
        return <Badge variant="destructive">נפסל</Badge>;
      case 'hired':
        return <Badge className="bg-blue-100 text-blue-800">התקבל</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  return (
    <div dir="rtl" className="space-y-6">
        
        {/* Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Link href="/interviews" className="hover:text-blue-600">
              סינון ראיונות
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">{jobData?.title}</span>
            {jobData?.jobCode && (
              <Badge variant="outline" className="text-xs">
                {jobData.jobCode}
              </Badge>
            )}
          </div>
        </div>
        
        <main className="flex-1 p-6 space-y-6">
          {/* Job Info Card */}
          {jobData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Briefcase className="h-5 w-5" />
                  פרטי המשרה
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{jobData.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{jobData.client?.companyName || 'לא צוין'}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {jobData.location}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-sm">איש קשר:</h5>
                  <p className="text-sm">{jobData.client?.contactName || 'לא צוין'}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="h-3 w-3" />
                    {jobData.client?.email || 'לא צוין'}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-sm">סטטיסטיקות:</h5>
                  <div className="text-sm space-y-1">
                    <div>סה"כ מועמדויות: <span className="font-bold">{applications.length}</span></div>
                    <div>ממתינים לסקירה: <span className="font-bold text-yellow-600">
                      {applications.filter(app => app.status === 'submitted').length}
                    </span></div>
                    <div>בראיון: <span className="font-bold text-green-600">
                      {applications.filter(app => app.status === 'interview').length}
                    </span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Panel for Selected Application */}
          {selectedApplication && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>פעולות עבור: {selectedApplication.candidate.firstName} {selectedApplication.candidate.lastName}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedApplication(null)}>
                    סגור
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
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
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
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
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSendFeedback(selectedApplication)}
                    disabled={updateApplicationMutation.isPending || !reviewerFeedback.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-send-feedback"
                  >
                    <Send className="h-4 w-4 ml-1" />
                    שלח חוות דעת למעסיק
                  </Button>
                  
                  <Button
                    onClick={() => handleApprove(selectedApplication)}
                    disabled={updateApplicationMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-approve-candidate"
                  >
                    <CheckCircle className="h-4 w-4 ml-1" />
                    אשר לראיון
                  </Button>
                  
                  <Button
                    onClick={() => handleReject(selectedApplication)}
                    disabled={updateApplicationMutation.isPending || !selectedRejectionReason}
                    variant="destructive"
                    data-testid="button-reject-candidate"
                  >
                    <XCircle className="h-4 w-4 ml-1" />
                    פסול מועמד
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                מועמדויות למשרה
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    אין מועמדויות למשרה זו
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    לא נמצאו מועמדויות עבור משרה זו כרגע
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>מועמד</TableHead>
                        <TableHead>פרטי קשר</TableHead>
                        <TableHead>ניסיון</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>תאריך הגשה</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {application.candidate.firstName} {application.candidate.lastName}
                              </div>
                              {application.candidate.profession && (
                                <div className="text-sm text-gray-500">
                                  {application.candidate.profession}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {application.candidate.email}
                              </div>
                              <div className="text-sm flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {application.candidate.mobile}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {application.candidate.experience && (
                                <div className="text-sm">
                                  {application.candidate.experience} שנות ניסיון
                                </div>
                              )}
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {application.candidate.city}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(application.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(application.appliedAt).toLocaleDateString('he-IL')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setReviewerFeedback(application.reviewerFeedback || "");
                                  setSelectedRejectionReason(application.rejectionReason || "");
                                }}
                                data-testid={`button-review-${application.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {application.candidate.cvPath && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Show CV in modal or navigate to candidate detail
                                    window.location.href = `/candidates/${application.candidate.id}`;
                                  }}
                                  data-testid={`button-cv-${application.id}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
    </div>
  );
}