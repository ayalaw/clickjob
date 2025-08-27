import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  FileText, 
  Eye, 
  ArrowRight,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  Car,
  Baby,
  Download
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import CandidateForm from "@/components/forms/candidate-form";
import type { Candidate } from "@shared/schema";

export default function CandidateDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

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

  const id = window.location.pathname.split('/').pop();
  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${id}`],
    enabled: isAuthenticated && !!id,
  });

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

  if (isLoading || candidateLoading) {
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

  if (!candidate) {
    return (
      <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">מועמד לא נמצא</h2>
            <Button onClick={() => navigate("/candidates")}>חזור למועמדים</Button>
          </div>
        </main>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditMode(false)}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לפרטי המועמד
            </Button>
          </div>
          <CandidateForm 
            candidate={candidate}
            onSuccess={() => {
              setIsEditMode(false);
              queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}`] });
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          {/* Navigation */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate("/candidates")}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לרשימת המועמדים
            </Button>
          </div>

          {/* Layout - 67% CV, 33% Details */}
          <div className="flex gap-6 h-[calc(100vh-12rem)]">
            {/* CV Display Card - 67% */}
            <div className="flex-[2] min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    קורות חיים
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                  {candidate.cvPath ? (
                    <div className="h-full flex flex-col">
                      {/* File info */}
                      <div className="flex justify-center p-3 bg-gray-50 rounded mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          קובץ קורות חיים - {candidate.cvPath?.split('/').pop()}
                        </div>
                      </div>
                      
                      {/* CV Display */}
                      <div className="flex-1 bg-white rounded border overflow-hidden">
                        {candidate.cvPath?.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={`/uploads/${candidate.cvPath?.replace('uploads/', '')}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : candidate.cvPath?.toLowerCase().includes('.doc') ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/uploads/' + candidate.cvPath?.replace('uploads/', ''))}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">תצוגה מקדימה לא זמינה</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">לא הועלה קובץ קורות חיים</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Personal Details Card - 33% */}
            <div className="flex-1 min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      פרטים אישיים
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditMode(true)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        ערוך
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(`/candidates/${id}/advanced`)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        עריכה מתקדמת
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)] overflow-auto">
                  <div className="space-y-4">
                    {/* Name and Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold">{candidate.firstName} {candidate.lastName}</h2>
                        {candidate.profession && (
                          <p className="text-gray-600 text-sm">{candidate.profession}</p>
                        )}
                      </div>
                      <Badge className={getStatusColor(candidate.status || '')}>
                        {getStatusText(candidate.status || '')}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div className="space-y-3">
                      {candidate.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{candidate.email}</span>
                        </div>
                      )}
                      
                      {candidate.mobile && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{candidate.mobile}</span>
                        </div>
                      )}
                      
                      {candidate.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{candidate.phone}</span>
                        </div>
                      )}

                      {(candidate.city || candidate.street || candidate.houseNumber) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {[candidate.street, candidate.houseNumber, candidate.city].filter(Boolean).join(', ')}
                            {candidate.zipCode && ` (${candidate.zipCode})`}
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      {candidate.nationalId && (
                        <div>
                          <span className="text-gray-500 text-xs">תעודת זהות:</span>
                          <p className="font-medium">{candidate.nationalId}</p>
                        </div>
                      )}
                      
                      {candidate.gender && (
                        <div>
                          <span className="text-gray-500 text-xs">מין:</span>
                          <p className="font-medium">{candidate.gender}</p>
                        </div>
                      )}
                      
                      {candidate.maritalStatus && (
                        <div>
                          <span className="text-gray-500 text-xs">מצב משפחתי:</span>
                          <p className="font-medium">{candidate.maritalStatus}</p>
                        </div>
                      )}
                      
                      {candidate.drivingLicense && (
                        <div>
                          <span className="text-gray-500 text-xs">רישיון נהיגה:</span>
                          <p className="font-medium">{candidate.drivingLicense}</p>
                        </div>
                      )}
                      
                      {candidate.experience !== null && candidate.experience !== undefined && (
                        <div>
                          <span className="text-gray-500 text-xs">ניסיון (שנים):</span>
                          <p className="font-medium">{candidate.experience}</p>
                        </div>
                      )}
                    </div>

                    {candidate.achievements && (
                      <>
                        <Separator />
                        <div>
                          <span className="text-gray-500 text-xs">הישגים:</span>
                          <p className="mt-1 text-sm">{candidate.achievements}</p>
                        </div>
                      </>
                    )}

                    <Separator />
                    
                    <div className="text-xs text-gray-500">
                      נוצר: {new Date(candidate.createdAt || new Date()).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
    </div>
  );
}