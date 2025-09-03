import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Building2, 
  MapPin, 
  Eye,
  Calendar,
  Users,
  Briefcase
} from "lucide-react";
import type { JobWithClient } from "@shared/schema";

export default function Interviews() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // State for candidate details modal
  const [selectedJobDetails, setSelectedJobDetails] = useState<{
    jobId: string;
    jobTitle: string;
    status: string;
    candidates: any[];
  } | null>(null);

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

  // Fetch all jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: JobWithClient[] }>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
  });

  const jobs = jobsData?.jobs || [];
  const activeJobs = jobs.filter(job => job.status === 'active');

  // Fetch job applications to count candidates per job
  const { data: applicationsData } = useQuery<{ applications: any[] }>({
    queryKey: ["/api/job-applications"],
    enabled: isAuthenticated,
  });

  const applications = applicationsData?.applications || [];

  // Fetch all candidates
  const { data: candidatesData } = useQuery<{ candidates: any[] }>({
    queryKey: ["/api/candidates/enriched"],
    enabled: isAuthenticated,
  });

  const allCandidates = candidatesData?.candidates || [];

  // Status translation function
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'פעילה';
      case 'paused': return 'מושהית';
      case 'closed': return 'סגורה';
      case 'submitted': return 'הוגש';
      case 'reviewed': return 'נסקר';
      case 'interview': return 'ראיון';
      case 'interview_scheduled': return 'זומן לראיון';
      case 'rejected': return 'נדחה';
      case 'accepted': return 'התקבל';
      case 'sent_to_employer': return 'נשלח למעסיק';
      case 'rejected_by_employer': return 'נפסל בראיון';
      case 'invited_to_interview': return 'זומן לראיון';
      case 'available': return 'זמין';
      case 'pending': return 'ממתין';
      case 'in_interview': return 'בתהליך ראיון';
      case 'hired': return 'התקבל';
      case 'not_relevant': return 'לא רלוונטי';
      case 'whatsapp_sent': return 'נשלחה הודעת ווצאפ';
      case 'phone_contact_made': return 'נוצר קשר טלפוני';
      case 'waiting_employer_response': return 'ממתין לתשובת מעסיק';
      case 'attended_interview': return 'הגיע לראיון';
      case 'missed_interview': return 'לא הגיע לראיון';
      case 'passed_interview': return 'עבר ראיון';
      case 'employment_ended': return 'סיים העסקה';
      case 'employed': return 'מועסק';
      case 'inactive': return 'לא פעיל';
      case 'blacklisted': return 'ברשימה שחורה';
      case 'new_application': return 'מועמדות חדשה';
      default: return status || 'לא הוגדר';
    }
  };

  const getJobStats = (jobId: string) => {
    const jobApplications = applications.filter(app => app.jobId === jobId);
    return {
      total: jobApplications.length,
      submitted: jobApplications.filter(app => app.status === 'submitted').length,
      interview: jobApplications.filter(app => app.status === 'interview').length,
      rejected: jobApplications.filter(app => app.status === 'rejected').length,
      waitingForInterview: jobApplications.filter(app => app.status === 'submitted').length,
    };
  };

  // Function to get candidates for a specific job and status
  const getCandidatesForJobAndStatus = (jobId: string, statusType: string) => {
    const jobApplications = applications.filter(app => app.jobId === jobId);
    let candidateIds: string[] = [];
    
    switch (statusType) {
      case 'all':
        candidateIds = jobApplications.map(app => app.candidateId);
        break;
      case 'submitted':
        candidateIds = jobApplications.filter(app => app.status === 'submitted').map(app => app.candidateId);
        break;
      case 'interview':
        candidateIds = jobApplications.filter(app => app.status === 'interview').map(app => app.candidateId);
        break;
      case 'rejected':
        candidateIds = jobApplications.filter(app => app.status === 'rejected').map(app => app.candidateId);
        break;
      case 'waitingForInterview':
        candidateIds = jobApplications.filter(app => app.status === 'submitted').map(app => app.candidateId);
        break;
    }
    
    return allCandidates.filter(candidate => candidateIds.includes(candidate.id));
  };

  // Function to handle clicking on a status number
  const handleStatusClick = (jobId: string, jobTitle: string, statusType: string) => {
    const candidates = getCandidatesForJobAndStatus(jobId, statusType);
    let statusText = '';
    
    switch (statusType) {
      case 'all': statusText = 'כל המועמדים'; break;
      case 'submitted': statusText = 'ממתינים לראיון'; break;
      case 'interview': statusText = 'נשלחו למעסיק'; break;
      case 'rejected': statusText = 'נפסלו'; break;
      case 'waitingForInterview': statusText = 'מחכים לראיון'; break;
    }
    
    setSelectedJobDetails({
      jobId,
      jobTitle,
      status: statusText,
      candidates
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">פעיל</Badge>;
      case 'paused':
        return <Badge variant="secondary">מושהה</Badge>;
      case 'closed':
        return <Badge variant="destructive">סגור</Badge>;
      default:
        // Translate other statuses
        const translatedStatus = getStatusText(status || '');
        return <Badge variant="outline">{translatedStatus}</Badge>;
    }
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-300">טוען משרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
        
        <main className="flex-1 p-6 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{jobs.length}</div>
                  <div className="text-sm text-gray-600">סה"כ משרות</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{activeJobs.length}</div>
                  <div className="text-sm text-gray-600">משרות פעילות</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{applications.length}</div>
                  <div className="text-sm text-gray-600">סה"כ מועמדויות</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {applications.filter(app => app.status === 'submitted').length}
                  </div>
                  <div className="text-sm text-gray-600">ממתינים לסקירה</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                ראיונות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    אין משרות במערכת
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    צור משרות חדשות כדי לראות אותן כאן
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>משרה</TableHead>
                        <TableHead>חברה</TableHead>
                        <TableHead>קוד משרה</TableHead>
                        <TableHead>מיקום</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>סה״כ מועמדים למשרה</TableHead>
                        <TableHead>נשלחו למעסיק</TableHead>
                        <TableHead>נפסלו</TableHead>
                        <TableHead>מחכים לראיון</TableHead>
                        <TableHead>פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => {
                        const stats = getJobStats(job.id);
                        return (
                          <TableRow key={job.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <Link href={`/jobs`} className="hover:text-blue-600">
                                  <div className="font-medium cursor-pointer hover:underline">{job.title}</div>
                                </Link>
                                <div className="text-sm text-gray-500">
                                  {job.description?.substring(0, 60)}...
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link href={`/clients`} className="hover:text-blue-600">
                                  <div className="font-medium flex items-center gap-1 cursor-pointer hover:underline">
                                    <Building2 className="h-3 w-3" />
                                    {job.client.companyName}
                                  </div>
                                </Link>
                                <div className="text-sm text-gray-500">
                                  {job.client.contactName}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {job.jobCode || 'לא הוגדר'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(job.status)}
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <button 
                                  onClick={() => handleStatusClick(job.id, job.title, 'all')}
                                  className="text-lg font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors"
                                >
                                  {stats.total}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <button 
                                  onClick={() => handleStatusClick(job.id, job.title, 'interview')}
                                  className="text-lg font-bold text-green-600 hover:text-green-800 cursor-pointer hover:underline transition-colors"
                                >
                                  {stats.interview}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <button 
                                  onClick={() => handleStatusClick(job.id, job.title, 'rejected')}
                                  className="text-lg font-bold text-red-600 hover:text-red-800 cursor-pointer hover:underline transition-colors"
                                >
                                  {stats.rejected}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <button 
                                  onClick={() => handleStatusClick(job.id, job.title, 'waitingForInterview')}
                                  className="text-lg font-bold text-orange-600 hover:text-orange-800 cursor-pointer hover:underline transition-colors"
                                >
                                  {stats.waitingForInterview}
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link href={`/interviews/${job.id}`}>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm">
                                  <Eye className="h-4 w-4" />
                                  התחל ראיונות
                                </div>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Candidates Modal */}
          {selectedJobDetails && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {getStatusText(selectedJobDetails.status)} - {selectedJobDetails.jobTitle}
                  </div>
                  <button 
                    onClick={() => setSelectedJobDetails(null)}
                    className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    סגור
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedJobDetails.candidates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין מועמדים בסטטוס זה למשרה
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <Table className="w-full">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-right font-semibold text-gray-700 px-6 py-4">שם מועמד</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-4 py-4">טלפון</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-4 py-4">אימייל</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-4 py-4">עיר</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-4 py-4">מקצוע</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700 px-4 py-4">סטטוס נוכחי</TableHead>
                          <TableHead className="text-center font-semibold text-gray-700 px-4 py-4">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedJobDetails.candidates.map((candidate, index) => (
                          <TableRow key={candidate.id} className={`hover:bg-blue-50 border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <TableCell className="px-6 py-4">
                              <Link href={`/candidates/${candidate.id}`}>
                                <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline text-lg">
                                  {candidate.firstName} {candidate.lastName}
                                </div>
                              </Link>
                              {candidate.nationalId && (
                                <div className="text-sm text-gray-500 mt-1">
                                  ת.ז: {candidate.nationalId}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="text-base font-medium text-gray-700">{candidate.mobile || candidate.phone || 'לא הוגדר'}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="text-base text-gray-700 break-all">{candidate.email}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="text-base text-gray-700">{candidate.city || 'לא הוגדר'}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="text-base text-gray-700">{candidate.profession || 'לא הוגדר'}</span>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <span className="text-sm px-3 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                                {getStatusText(candidate.status || '')}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-4 text-center">
                              <Link href={`/candidates/${candidate.id}`}>
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium transition-colors">
                                  <Eye className="h-4 w-4" />
                                  צפה
                                </button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
    </div>
  );
}