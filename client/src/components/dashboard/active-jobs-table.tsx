import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Eye, Edit, Users } from "lucide-react";
import { format } from "date-fns";
import type { JobWithClient } from "@shared/schema";

export default function ActiveJobsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 5; // Show only 5 jobs on dashboard

  const { data: jobsData, isLoading } = useQuery<{ jobs: JobWithClient[]; total: number }>({
    queryKey: ["/api/jobs", { limit, offset: (currentPage - 1) * limit }],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'פעילה';
      case 'paused': return 'מושהית';
      case 'closed': return 'סגורה';
      default: return status || 'לא הוגדר';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return "לא צוין";
    }
  };

  const handleAddJob = () => {
    window.location.href = '/jobs';
  };

  const handleViewJob = (jobId: string) => {
    // In a real app, this would navigate to job details
    console.log('View job:', jobId);
  };

  const handleEditJob = (jobId: string) => {
    // In a real app, this would open edit dialog
    console.log('Edit job:', jobId);
  };

  const handleViewCandidates = (jobId: string) => {
    // In a real app, this would show job applications
    console.log('View candidates for job:', jobId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
              משרות פעילות
            </CardTitle>
            <div className="flex space-x-3 space-x-reverse">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">כותרת משרה</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">לקוח</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">סטטוס</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">תאריך יעד</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2 space-x-reverse">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-secondary dark:text-white">
            משרות פעילות
          </CardTitle>
          <div className="flex space-x-3 space-x-reverse">
            <Button 
              onClick={handleAddJob}
              className="btn-primary text-sm"
              data-testid="button-add-job-dashboard"
            >
              <Plus className="h-4 w-4 ml-1" />
              הוסף משרה
            </Button>
            <Button 
              variant="outline" 
              className="text-sm"
              data-testid="button-filter-jobs"
            >
              <Filter className="h-4 w-4 ml-1" />
              סנן
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">כותרת משרה</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">לקוח</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">סטטוס</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">תאריך יעד</th>
                <th className="text-right p-4 text-sm font-medium text-gray-700 dark:text-gray-300">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobsData?.jobs && jobsData.jobs.length > 0 ? (
                jobsData.jobs.slice(0, 5).map((job: JobWithClient) => (
                  <tr key={job.id} className="table-row-hover" data-testid={`row-job-${job.id}`}>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-secondary dark:text-white" data-testid={`text-job-title-${job.id}`}>
                          {job.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300" data-testid={`text-job-location-${job.id}`}>
                          {job.location && `${job.location}${job.isRemote ? ', עבודה מהבית' : ''}`}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-secondary dark:text-white" data-testid={`text-job-client-${job.id}`}>
                        {job.client?.companyName || "לא משויך"}
                      </p>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(job.status || 'active')}>
                        {getStatusText(job.status || 'active')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-secondary dark:text-white" data-testid={`text-job-deadline-${job.id}`}>
                        {job.deadline ? formatDate(job.deadline.toString()) : "לא צוין"}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2 space-x-reverse">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewJob(job.id)}
                          className="text-primary hover:text-primary-dark"
                          data-testid={`button-view-job-${job.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditJob(job.id)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          data-testid={`button-edit-job-${job.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCandidates(job.id)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          data-testid={`button-view-candidates-${job.id}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">אין משרות פעילות</p>
                    <Button 
                      onClick={handleAddJob}
                      className="mt-4 btn-primary"
                      data-testid="button-add-first-job-dashboard"
                    >
                      פרסם משרה ראשונה
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {jobsData?.jobs && jobsData.jobs.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <p>מציג {Math.min(5, jobsData?.jobs?.length || 0)} מתוך {jobsData?.total || jobsData?.jobs?.length || 0} משרות</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/jobs'}
              data-testid="button-view-all-jobs"
            >
              צפה בכל המשרות
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
