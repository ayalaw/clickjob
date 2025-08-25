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
import CandidateForm from "@/components/forms/candidate-form";
import SearchFilter from "@/components/search-filter";
import { Plus, Search, Phone, Mail, FileText, Edit, Trash2 } from "lucide-react";
import type { Candidate } from "@shared/schema";

export default function Candidates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
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

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/candidates", { search }],
    enabled: isAuthenticated,
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "הצלחה",
        description: "המועמד נמחק בהצלחה",
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
        description: "שגיאה במחיקת המועמד",
        variant: "destructive",
      });
    },
  });

  const handleAddCandidate = () => {
    setSelectedCandidate(null);
    setIsFormOpen(true);
  };

  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsFormOpen(true);
  };

  const handleDeleteCandidate = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את המועמד?")) {
      deleteCandidate.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'employed': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'employed': return 'מועסק';
      case 'inactive': return 'לא פעיל';
      case 'blacklisted': return 'ברשימה שחורה';
      default: return status;
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
        <Header title="מאגר מועמדים" />
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="חיפוש מועמדים..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-candidates"
                />
              </div>
              <SearchFilter />
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAddCandidate}
                  className="btn-primary"
                  data-testid="button-add-candidate"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף מועמד
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCandidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
                  </DialogTitle>
                </DialogHeader>
                <CandidateForm 
                  candidate={selectedCandidate}
                  onSuccess={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {candidatesLoading ? (
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
                {candidatesData?.candidates?.map((candidate: Candidate) => (
                  <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-candidate-name-${candidate.id}`}>
                            {candidate.firstName} {candidate.lastName}
                          </h3>
                          <p className="text-sm text-gray-600" data-testid={`text-candidate-profession-${candidate.id}`}>
                            {candidate.profession}
                          </p>
                        </div>
                        <Badge className={getStatusColor(candidate.status || 'available')}>
                          {getStatusText(candidate.status || 'available')}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 ml-2" />
                          <span data-testid={`text-candidate-email-${candidate.id}`}>{candidate.email}</span>
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 ml-2" />
                            <span data-testid={`text-candidate-phone-${candidate.id}`}>{candidate.phone}</span>
                          </div>
                        )}
                        {candidate.experience && (
                          <div className="text-sm text-gray-600">
                            <span>ניסיון: {candidate.experience} שנים</span>
                          </div>
                        )}
                        {candidate.cvPath && (
                          <div className="flex items-center text-sm text-blue-600">
                            <FileText className="h-4 w-4 ml-2" />
                            <span>קורות חיים מועלה</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCandidate(candidate)}
                          data-testid={`button-edit-candidate-${candidate.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCandidate(candidate.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-candidate-${candidate.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {candidatesData?.candidates?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">לא נמצאו מועמדים</p>
                  <Button 
                    onClick={handleAddCandidate}
                    className="mt-4 btn-primary"
                    data-testid="button-add-first-candidate"
                  >
                    הוסף מועמד ראשון
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
