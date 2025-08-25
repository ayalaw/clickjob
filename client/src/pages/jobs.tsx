import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import JobForm from "@/components/forms/job-form";
import SearchFilter from "@/components/search-filter";
import { Plus, Search, MapPin, Calendar, Building2, Edit, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import type { JobWithClient } from "@shared/schema";

export default function Jobs() {
  const { toast } = useToast();
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
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
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
      default: return status;
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
      default: return priority;
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
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header title="מאגר משרות" />
        
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
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAddJob}
                  className="btn-primary"
                  data-testid="button-add-job"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף משרה
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedJob ? "עריכת משרה" : "הוספת משרה חדשה"}
                  </DialogTitle>
                </DialogHeader>
                <JobForm 
                  job={selectedJob}
                  onSuccess={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {jobsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobsData?.jobs?.map((job: JobWithClient) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-job-title-${job.id}`}>
                            {job.title}
                          </h3>
                          <p className="text-sm text-gray-600" data-testid={`text-job-client-${job.id}`}>
                            {job.client?.companyName}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(job.status || 'active')}>
                            {getStatusText(job.status || 'active')}
                          </Badge>
                          <Badge className={getPriorityColor(job.priority || 'medium')}>
                            {getPriorityText(job.priority || 'medium')}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {job.location && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-4 w-4 ml-2" />
                            <span data-testid={`text-job-location-${job.id}`}>
                              {job.location}
                              {job.isRemote && " (עבודה מהבית)"}
                            </span>
                          </div>
                        )}
                        {job.salaryRange && (
                          <div className="text-sm text-gray-600">
                            <span>שכר: {job.salaryRange}</span>
                          </div>
                        )}
                        {job.jobType && (
                          <div className="text-sm text-gray-600">
                            <span>סוג משרה: {job.jobType}</span>
                          </div>
                        )}
                        {job.deadline && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 ml-2" />
                            <span>תאריך יעד: {format(new Date(job.deadline.toString()), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-blue-600">
                          <Users className="h-4 w-4 ml-2" />
                          <span>{job.positions} משרות פתוחות</span>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditJob(job)}
                          data-testid={`button-edit-job-${job.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteJob(job.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-job-${job.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {jobsData?.jobs?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">לא נמצאו משרות</p>
                  <Button 
                    onClick={handleAddJob}
                    className="mt-4 btn-primary"
                    data-testid="button-add-first-job"
                  >
                    הוסף משרה ראשונה
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
