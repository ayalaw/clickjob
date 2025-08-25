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
  Download
} from "lucide-react";
import type { JobApplicationWithDetails, JobApplication } from "@shared/schema";

export default function Interviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedApplication, setSelectedApplication] = useState<JobApplicationWithDetails | null>(null);
  const [reviewerFeedback, setReviewerFeedback] = useState("");
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "נדרשת הזדהות",
        description: "נועבר למערכת...",
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="mr-64 flex-1 flex flex-col">
        <Header title="סינון ראיונות" />
        
        <main className="flex-1 p-6 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                  <div className="text-sm text-gray-600">סה"כ מועמדויות</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {applications.filter(app => app.status === 'submitted').length}
                  </div>
                  <div className="text-sm text-gray-600">ממתינות לסקירה</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {applications.filter(app => app.status === 'interview').length}
                  </div>
                  <div className="text-sm text-gray-600">בראיון</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {applications.filter(app => app.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">נפסלו</div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    אשר למועמד
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
                מועמדויות לסקירה
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    אין מועמדויות לסקירה
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    לא נמצאו מועמדויות הממתינות לסקירה כרגע
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>מועמד</TableHead>
                        <TableHead>משרה</TableHead>
                        <TableHead>חברה</TableHead>
                        <TableHead>קוד משרה</TableHead>
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
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {application.candidate.email}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {application.candidate.mobile}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{application.job.title}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {application.job.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {application.job.client.companyName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {application.job.client.contactName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {application.job.jobCode || 'לא הוגדר'}
                            </Badge>
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
                                  onClick={() => window.open(`/uploads/${application.candidate.cvPath}`, '_blank')}
                                  data-testid={`button-cv-${application.id}`}
                                >
                                  <Download className="h-4 w-4" />
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
    </div>
  );
}