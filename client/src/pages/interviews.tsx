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

  const getJobStats = (jobId: string) => {
    const jobApplications = applications.filter(app => app.jobId === jobId);
    return {
      total: jobApplications.length,
      submitted: jobApplications.filter(app => app.status === 'submitted').length,
      interview: jobApplications.filter(app => app.status === 'interview').length,
      rejected: jobApplications.filter(app => app.status === 'rejected').length,
    };
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
        return <Badge variant="outline">{status || 'לא הוגדר'}</Badge>;
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
                        <TableHead>מועמדויות</TableHead>
                        <TableHead>ממתינים</TableHead>
                        <TableHead>בראיון</TableHead>
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
                                <Link href={`/jobs/${job.id}/edit`} className="hover:text-blue-600">
                                  <div className="font-medium cursor-pointer hover:underline">{job.title}</div>
                                </Link>
                                <div className="text-sm text-gray-500">
                                  {job.description?.substring(0, 60)}...
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link href={`/clients/${job.client.id}/edit`} className="hover:text-blue-600">
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
                                <span className="text-lg font-bold text-blue-600">{stats.total}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <span className="text-lg font-bold text-yellow-600">{stats.submitted}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <span className="text-lg font-bold text-green-600">{stats.interview}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link href={`/interviews/${job.id}`}>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm">
                                  <Eye className="h-4 w-4" />
                                  צפה בראיונות
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
        </main>
    </div>
  );
}