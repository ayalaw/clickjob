import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PermissionWrapper } from "@/components/permissions/permission-wrapper";
import { PermissionButton, AddButton, EditButton, DeleteButton } from "@/components/permissions/button-permission";
import { useDataFiltering } from "@/components/permissions/permission-wrapper";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import JobForm from "@/components/forms/job-form";
import SearchFilter from "@/components/search-filter";
import { Plus, Search, MapPin, Calendar, Building2, Edit, Trash2, Users, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { JobWithClient } from "@shared/schema";

export default function Jobs() {
  const { toast } = useToast();
  const { filterJobs, filterClientName, canViewClientNames } = useDataFiltering();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobWithClient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: JobWithClient[]; total: number }>({
    queryKey: ["/api/jobs", { search }],
    enabled: isAuthenticated,
    select: (data) => ({
      ...data,
      jobs: filterJobs(data.jobs)
    })
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "הצלחה",
        description: "המשרה נמחקה בהצלחה",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "שגיאה",
        description: "שגיאה במחיקת המשרה",
        variant: "destructive",
      });
    },
  });

  const handleAddJob = () => {
    setSelectedJob(null);
    setIsFormOpen(true);
  };

  const handleEditJob = (job: JobWithClient) => {
    setSelectedJob(job);
    setIsFormOpen(true);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את המשרה?")) {
      deleteJob.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return priority || 'לא הוגדר';
    }
  };

  if (isLoading) {
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

  return (
    <div dir="rtl" className="space-y-6">
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="חיפוש משרות..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-jobs"
                />
              </div>
              <SearchFilter />
            </div>
            
            <PermissionWrapper permission="create_jobs">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <AddButton 
                    onClick={handleAddJob}
                    className="btn-primary"
                    data-testid="button-add-job"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף משרה
                  </AddButton>
                </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sr-only">
                  <DialogTitle>
                    {selectedJob ? "עריכת משרה" : "הוספת משרה חדשה"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedJob ? "ערוך פרטי המשרה" : "הוסף משרה חדשה למאגר"}
                  </DialogDescription>
                </DialogHeader>
                <JobForm 
                  job={selectedJob}
                  onSuccess={() => setIsFormOpen(false)}
                />
              </DialogContent>
              </Dialog>
            </PermissionWrapper>
          </div>

          {jobsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {jobsData?.jobs && jobsData.jobs.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900">
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">קוד משרה</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">כותרת המשרה</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">לקוח</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">מיקום</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">שכר</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">סוג משרה</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">סטטוס</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">עדיפות</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">תאריך יעד</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsData.jobs.map((job: JobWithClient) => (
                        <TableRow key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700" data-testid={`row-job-${job.id}`}>
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-primary font-mono text-sm" data-testid={`text-job-code-${job.id}`}>
                                {job.jobCode}
                              </p>
                              {job.additionalCodes && job.additionalCodes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {job.additionalCodes.map((code, index) => (
                                    <span key={index} className="text-xs bg-blue-100 text-blue-700 px-1 rounded">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-secondary dark:text-white" data-testid={`text-job-title-${job.id}`}>
                                {job.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                <Users className="inline h-3 w-3 ml-1" />
                                {job.positions} משרות
                              </p>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-job-client-${job.id}`}>
                            {filterClientName(job.client?.companyName) || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-job-location-${job.id}`}>
                            {job.location ? (
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 ml-1" />
                                {job.location}{job.isRemote && " (מהבית)"}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {job.salaryRange || "-"}
                          </TableCell>
                          <TableCell>
                            {job.jobType || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status || 'active')}>
                              {getStatusText(job.status || 'active')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(job.priority || 'medium')}>
                              {getPriorityText(job.priority || 'medium')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {job.deadline ? (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 ml-1" />
                                {format(new Date(job.deadline.toString()), 'dd/MM/yyyy')}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/jobs/${job.id}/landing`, '_blank')}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                data-testid={`button-landing-page-${job.id}`}
                                title="דף נחיתה למפרסום"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <EditButton
                                permission="edit_jobs"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditJob(job)}
                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                data-testid={`button-edit-job-${job.id}`}
                                hideWhenNoAccess={true}
                              >
                                <Edit className="h-4 w-4" />
                              </EditButton>
                              <DeleteButton
                                permission="delete_jobs"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteJob(job.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                data-testid={`button-delete-job-${job.id}`}
                                hideWhenNoAccess={true}
                              >
                                <Trash2 className="h-4 w-4" />
                              </DeleteButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">לא נמצאו משרות</p>
                  <AddButton 
                    onClick={handleAddJob}
                    className="mt-4 btn-primary"
                    data-testid="button-add-first-job"
                    hideWhenNoAccess={true}
                  >
                    הוסף משרה ראשונה
                  </AddButton>
                </div>
              )}
            </>
          )}
        </main>
    </div>
  );
}
