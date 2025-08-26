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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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
      <div className="min-h-screen flex" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="מועמד לא נמצא" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-600 mb-4">מועמד לא נמצא</h2>
              <Button onClick={() => navigate("/candidates")}>חזור למועמדים</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isEditMode) {
    return (
      <div className="min-h-screen flex" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="עריכת מועמד" />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header title={`${candidate.firstName} ${candidate.lastName}`} />
        
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

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Details Card */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      פרטים אישיים
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      ערוך
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name and Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{candidate.firstName} {candidate.lastName}</h2>
                      {candidate.profession && (
                        <p className="text-gray-600">{candidate.profession}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(candidate.status)}>
                      {getStatusText(candidate.status)}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-3">
                    {candidate.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{candidate.email}</span>
                      </div>
                    )}
                    
                    {candidate.mobile && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{candidate.mobile}</span>
                      </div>
                    )}
                    
                    {candidate.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}

                    {(candidate.city || candidate.street || candidate.houseNumber) && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>
                          {[candidate.street, candidate.houseNumber, candidate.city].filter(Boolean).join(', ')}
                          {candidate.zipCode && ` (${candidate.zipCode})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Additional Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {candidate.nationalId && (
                      <div>
                        <span className="text-gray-500">תעודת זהות:</span>
                        <p className="font-medium">{candidate.nationalId}</p>
                      </div>
                    )}
                    
                    {candidate.gender && (
                      <div>
                        <span className="text-gray-500">מין:</span>
                        <p className="font-medium">{candidate.gender}</p>
                      </div>
                    )}
                    
                    {candidate.maritalStatus && (
                      <div>
                        <span className="text-gray-500">מצב משפחתי:</span>
                        <p className="font-medium">{candidate.maritalStatus}</p>
                      </div>
                    )}
                    
                    {candidate.drivingLicense && (
                      <div>
                        <span className="text-gray-500">רישיון נהיגה:</span>
                        <p className="font-medium">{candidate.drivingLicense}</p>
                      </div>
                    )}
                    
                    {candidate.experience !== null && candidate.experience !== undefined && (
                      <div>
                        <span className="text-gray-500">ניסיון (שנים):</span>
                        <p className="font-medium">{candidate.experience}</p>
                      </div>
                    )}
                  </div>

                  {candidate.achievements && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-gray-500">הישגים:</span>
                        <p className="mt-1 text-sm">{candidate.achievements}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  
                  <div className="text-xs text-gray-500">
                    נוצר: {new Date(candidate.createdAt).toLocaleDateString('he-IL')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CV Display Card */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    קורות חיים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.cvPath ? (
                    <div className="space-y-4">
                      {/* Control buttons */}
                      <div className="flex gap-3 justify-center p-4 bg-gray-50 rounded">
                        <Button
                          onClick={() => window.open(`/${candidate.cvPath}`, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          פתח קובץ בחלון חדש
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/${candidate.cvPath}`;
                            link.download = `${candidate.firstName}_${candidate.lastName}_CV`;
                            link.click();
                          }}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          הורד קובץ
                        </Button>
                      </div>
                      
                      {/* File Display */}
                      <div className="w-full min-h-[500px] bg-gray-50 rounded border p-4">
                        {/* Try iframe first, fallback to preview image */}
                        <iframe
                          src={`/${candidate.cvPath}/preview`}
                          width="100%"
                          height="500px"
                          style={{ border: 'none', borderRadius: '4px' }}
                          title="CV Viewer"
                          onLoad={(e) => {
                            const iframe = e.target as HTMLIFrameElement;
                            try {
                              // Check if iframe loaded successfully
                              const doc = iframe.contentDocument || iframe.contentWindow?.document;
                              if (!doc || doc.body?.innerHTML.trim() === '') {
                                iframe.style.display = 'none';
                                const fallback = iframe.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }
                            } catch (err) {
                              // Cross-origin or other error, show fallback
                              iframe.style.display = 'none';
                              const fallback = iframe.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }
                          }}
                          onError={() => {
                            const iframe = document.querySelector('iframe[title="CV Viewer"]') as HTMLIFrameElement;
                            if (iframe) {
                              iframe.style.display = 'none';
                              const fallback = iframe.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'block';
                            }
                          }}
                        />
                        
                        {/* Fallback preview for non-PDF files */}
                        <div 
                          className="text-center p-8"
                          style={{ display: 'none' }}
                        >
                          <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-blue-800 mb-2">
                            קובץ קורות חיים
                          </h3>
                          <p className="text-gray-600 mb-6">
                            קובץ זה זמין להורדה. לחץ על הכפתור למעלה כדי להוריד ולפתוח בתוכנה המתאימה.
                          </p>
                          <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 mb-4">
                            נתיב קובץ: {candidate.cvPath}
                          </div>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/${candidate.cvPath}`;
                              link.download = `${candidate.firstName}_${candidate.lastName}_CV`;
                              link.click();
                            }}
                            className="flex items-center gap-2 mx-auto"
                          >
                            <Download className="w-4 h-4" />
                            הורד קובץ
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">לא הועלו קורות חיים עבור מועמד זה</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setIsEditMode(true)}
                      >
                        הוסף קורות חיים
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}