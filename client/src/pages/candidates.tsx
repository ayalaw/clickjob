import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CandidateForm from "@/components/forms/candidate-form";
import SearchFilter from "@/components/search-filter";
import { EmailDialog } from "@/components/email-dialog";
import { Plus, Search, Phone, Mail, FileText, Edit, Trash2, Send, Users } from "lucide-react";
import type { Candidate, EnrichedCandidate } from "@shared/schema";

export default function Candidates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Status color and text helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'sent_to_employer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_interview': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'hired': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'not_relevant': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'rejected_by_employer': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'invited_to_interview': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'whatsapp_sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'phone_contact_made': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'waiting_employer_response': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'attended_interview': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'missed_interview': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'passed_interview': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'employment_ended': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'employed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'blacklisted': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'submitted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'reviewed': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'interview': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'accepted': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'pending': return 'ממתין';
      case 'sent_to_employer': return 'נשלח למעסיק';
      case 'in_interview': return 'בתהליך ראיון';
      case 'hired': return 'התקבל';
      case 'rejected': return 'נדחה';
      case 'not_relevant': return 'לא רלוונטי';
      case 'rejected_by_employer': return 'נפסל בראיון';
      case 'invited_to_interview': return 'זומן לראיון';
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
      case 'submitted': return 'הוגש';
      case 'reviewed': return 'נסקר';
      case 'interview': return 'ראיון';
      case 'accepted': return 'התקבל';
      default: return status;
    }
  };

  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [emailDialog, setEmailDialog] = useState<{
    isOpen: boolean;
    type: "candidate" | "interview" | "shortlist";
    candidateId?: string;
    candidateIds?: string[];
    candidateName?: string;
  }>({
    isOpen: false,
    type: "candidate",
  });
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

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

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery<{ candidates: EnrichedCandidate[]; total: number }>({
    queryKey: ["/api/candidates/enriched", { search, dateFilter }],
    enabled: isAuthenticated,
  });

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/candidates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
    <div dir="rtl" className="min-h-screen w-full max-w-full space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">מועמדים</h1>
      </div>
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
              <div className="min-w-[200px]">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger data-testid="select-date-filter">
                    <SelectValue placeholder="סינון לפי תאריך" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התאריכים</SelectItem>
                    <SelectItem value="today">היום</SelectItem>
                    <SelectItem value="yesterday">אתמול</SelectItem>
                    <SelectItem value="this_week">השבוע</SelectItem>
                    <SelectItem value="this_month">החודש</SelectItem>
                  </SelectContent>
                </Select>
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
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sr-only">
                  <DialogTitle>
                    {selectedCandidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCandidate ? "ערוך פרטי המועמד" : "הוסף מועמד חדש למאגר"}
                  </DialogDescription>
                </DialogHeader>
                <CandidateForm 
                  candidate={selectedCandidate || undefined}
                  onSuccess={() => {
                    // לא סוגר את הטופס - נשאר פתוח לפרטים נוספים
                    toast({
                      title: "הצלחה",
                      description: "המועמד נשמר בהצלחה. תוכל להוסיף פרטים נוספים",
                    });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {candidatesLoading ? (
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
              {candidatesData?.candidates && candidatesData.candidates.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto w-full">
                  <div className="w-full min-w-[1400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-900">
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[160px]">שם המועמד</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">עיר</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">עדכון אחרון</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[150px]">מתעניין במשרה אחרון</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">מקור גיוס נוכחי</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[130px]">טלפון</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">מס' מועמד</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[200px]">דוא״ל</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">אירוע ידני אחרון</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">הפניה אחרונה</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">שינוי סטטוס אחרון</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">סטטוס</TableHead>
                          <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {candidatesData.candidates.map((candidate: EnrichedCandidate) => (
                        <TableRow 
                          key={candidate.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" 
                          data-testid={`row-candidate-${candidate.id}`}
                          onClick={() => window.location.href = `/candidates/${candidate.id}`}
                        >
                          <TableCell className="font-medium">
                            <p className="text-secondary dark:text-white" data-testid={`text-candidate-name-${candidate.id}`}>
                              {candidate.firstName} {candidate.lastName}
                            </p>
                          </TableCell>
                          <TableCell>
                            {candidate.city || "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString('he-IL') : "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.lastJobTitle || "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.recruitmentSource || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-candidate-phone-${candidate.id}`}>
                            {candidate.phone ? (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 ml-1" />
                                {candidate.phone}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {candidate.id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-candidate-email-${candidate.id}`}>
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 ml-1" />
                              {candidate.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.lastReferralDate ? new Date(candidate.lastReferralDate).toLocaleDateString('he-IL') : "-"}
                          </TableCell>
                          <TableCell>
                            {candidate.lastStatusChange ? new Date(candidate.lastStatusChange).toLocaleDateString('he-IL') : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(candidate.status || 'available')}>
                              {getStatusText(candidate.status || 'available')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1 space-x-reverse" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailDialog({
                                    isOpen: true,
                                    type: "candidate",
                                    candidateId: candidate.id,
                                    candidateName: `${candidate.firstName} ${candidate.lastName}`,
                                  });
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                data-testid={`button-email-profile-${candidate.id}`}
                                title="שלח פרופיל במייל"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailDialog({
                                    isOpen: true,
                                    type: "interview",
                                    candidateId: candidate.id,
                                    candidateName: `${candidate.firstName} ${candidate.lastName}`,
                                  });
                                }}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                                data-testid={`button-interview-invite-${candidate.id}`}
                                title="שלח הזמנה לראיון"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCandidate(candidate);
                                }}
                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                data-testid={`button-edit-candidate-${candidate.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCandidate(candidate.id);
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                data-testid={`button-delete-candidate-${candidate.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
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

      <EmailDialog
        isOpen={emailDialog.isOpen}
        onClose={() => setEmailDialog({ ...emailDialog, isOpen: false })}
        type={emailDialog.type}
        candidateId={emailDialog.candidateId}
        candidateIds={emailDialog.candidateIds}
        candidateName={emailDialog.candidateName}
      />
    </div>
  );
}
