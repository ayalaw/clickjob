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

          {/* Layout - 68% CV, 32% Details */}
          <div className="flex gap-6 h-[calc(100vh-12rem)]">
            {/* CV Display Card - 68% */}
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

            {/* Candidate Details Card - 32% */}
            <div className="flex-1 min-w-0">
              <div className="h-full overflow-y-auto space-y-4">
                {isEditMode ? (
                  /* Edit Mode */
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Edit className="w-5 h-5" />
                          עריכת פרטי המועמד
                        </CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditMode(false)}
                          className="flex items-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          ביטול
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[calc(100%-4rem)] overflow-auto">
                      <CandidateForm 
                        candidate={candidate}
                        onSuccess={() => {
                          setIsEditMode(false);
                          queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}`] });
                        }}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  /* View Mode */
                  <>
                {/* Header with name and edit button */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {candidate.firstName} {candidate.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(candidate.status || 'available')}>
                          {getStatusText(candidate.status || 'available')}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditMode(true)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          עריכה
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    {candidate.rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">דירוג:</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className={`text-lg ${i <= candidate.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tags */}
                    {candidate.tags && candidate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {candidate.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      פרטי קשר
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{candidate.email}</span>
                    </div>
                    {candidate.mobile && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.mobile}</span>
                        <span className="text-xs text-gray-400">(נייד)</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.phone}</span>
                        <span className="text-xs text-gray-400">(בית)</span>
                      </div>
                    )}
                    {candidate.phone2 && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.phone2}</span>
                        <span className="text-xs text-gray-400">(נוסף)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      פרטים אישיים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.nationalId && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">תעודת זהות:</span>
                        <span className="text-sm">{candidate.nationalId}</span>
                      </div>
                    )}
                    {candidate.gender && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מין:</span>
                        <span className="text-sm">{candidate.gender}</span>
                      </div>
                    )}
                    {candidate.maritalStatus && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מצב משפחתי:</span>
                        <span className="text-sm">{candidate.maritalStatus}</span>
                      </div>
                    )}
                    {candidate.drivingLicense && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">רישיון נהיגה:</span>
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{candidate.drivingLicense}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      כתובת
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">עיר:</span>
                      <span className="text-sm">{candidate.city}</span>
                    </div>
                    {candidate.street && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">רחוב:</span>
                        <span className="text-sm">{candidate.street}</span>
                      </div>
                    )}
                    {candidate.houseNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מס' בית:</span>
                        <span className="text-sm">{candidate.houseNumber}</span>
                      </div>
                    )}
                    {candidate.zipCode && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מיקוד:</span>
                        <span className="text-sm">{candidate.zipCode}</span>
                      </div>
                    )}
                    {candidate.receptionArea && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">איזור קליטה:</span>
                        <span className="text-sm">{candidate.receptionArea}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      מידע מקצועי
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.profession && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מקצוע:</span>
                        <span className="text-sm">{candidate.profession}</span>
                      </div>
                    )}
                    {candidate.experience && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">ניסיון:</span>
                        <span className="text-sm">{candidate.experience} שנים</span>
                      </div>
                    )}
                    {candidate.expectedSalary && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">שכר צפוי:</span>
                        <span className="text-sm">₪{candidate.expectedSalary.toLocaleString()}</span>
                      </div>
                    )}
                    {candidate.recruitmentSource && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">מקור גיוס:</span>
                        <span className="text-sm">{candidate.recruitmentSource}</span>
                      </div>
                    )}
                    {candidate.achievements && (
                      <div>
                        <span className="text-sm font-medium">הישגים:</span>
                        <p className="text-sm mt-1 text-gray-600">{candidate.achievements}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      הערות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.notes ? (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.notes}</p>
                    ) : (
                      <p className="text-sm text-gray-400">אין הערות</p>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      מידע נוסף
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">נוצר בתאריך:</span>
                      <span className="text-sm">{candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('he-IL') : 'לא זמין'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">עודכן לאחרונה:</span>
                      <span className="text-sm">{candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString('he-IL') : 'לא זמין'}</span>
                    </div>
                  </CardContent>
                </Card>
                </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }