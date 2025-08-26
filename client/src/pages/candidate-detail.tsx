import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CandidateForm from "@/components/forms/candidate-form";
import { 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  FileText, 
  ArrowRight,
  User,
  Download,
  Eye
} from "lucide-react";
import type { Candidate } from "@shared/schema";

export default function CandidateDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [cvContent, setCvContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);

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

  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${id}`],
    enabled: isAuthenticated && !!id,
  });

  // Load CV content if candidate has a CV
  useEffect(() => {
    if (candidate?.cvPath && candidate.cvPath.trim()) {
      setLoadingContent(true);
      // Try to extract text content using the CV extraction API
      const extractContent = async () => {
        try {
          // Create a FormData with the file
          const response = await fetch(`/uploads/${candidate.cvPath}`);
          if (response.ok) {
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('cv', blob, 'cv.pdf');
            
            const extractResponse = await fetch('/api/extract-cv-data', {
              method: 'POST',
              body: formData,
            });
            
            if (extractResponse.ok) {
              const data = await extractResponse.json();
              if (data.fileContent) {
                setCvContent(data.fileContent);
              }
            }
          }
        } catch (error) {
          console.log("Could not extract CV content:", error);
        } finally {
          setLoadingContent(false);
        }
      };
      
      extractContent();
    }
  }, [candidate?.cvPath]);

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
              className="flex items-center gap-2 mb-4"
            >
              <ArrowRight className="w-4 h-4" />
              חזור למועמדים
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Details - Left Side */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      פרטים אישיים
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-1"
                      data-testid="button-edit-candidate"
                    >
                      <Edit className="w-4 h-4" />
                      ערוך
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold">{candidate.firstName} {candidate.lastName}</h2>
                    <Badge className={getStatusColor(candidate.status || 'available')}>
                      {getStatusText(candidate.status || 'available')}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.email}</span>
                      </div>
                    )}

                    {candidate.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.mobile}</span>
                      </div>
                    )}

                    {candidate.phone && candidate.phone !== candidate.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.phone}</span>
                      </div>
                    )}

                    {candidate.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.city}</span>
                      </div>
                    )}

                    {candidate.profession && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.profession}</span>
                      </div>
                    )}

                    {candidate.experience && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{candidate.experience} שנות ניסיון</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              {candidate.achievements && (
                <Card>
                  <CardHeader>
                    <CardTitle>הישגים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{candidate.achievements}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* CV Display - Right Side */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      קורות חיים
                    </div>
                    {candidate.cvPath && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/uploads/${candidate.cvPath}`;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            link.click();
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          פתח
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/uploads/${candidate.cvPath}`;
                            link.download = `${candidate.firstName}_${candidate.lastName}_CV.pdf`;
                            link.click();
                          }}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          הורד
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.cvPath ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-red-50 p-4 border-b">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-red-600" />
                          <div>
                            <h3 className="font-medium text-red-800">קורות חיים</h3>
                            <p className="text-sm text-red-600">
                              {candidate.cvPath.toLowerCase().includes('.pdf') ? 'קובץ PDF' : 
                               candidate.cvPath.toLowerCase().includes('.doc') ? 'מסמך Word' : 
                               'קובץ'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white max-h-[600px] overflow-y-auto">
                        {/* PDF File Display */}
                        {candidate.cvPath.toLowerCase().includes('.pdf') ? (
                          <div className="space-y-4">
                            {/* PDF Embedded Viewer */}
                            <div className="w-full h-[400px] bg-gray-50 rounded border">
                              <iframe
                                src={`/uploads/${candidate.cvPath}#toolbar=0&navpanes=0&scrollbar=1`}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', borderRadius: '4px' }}
                                title="PDF Viewer"
                              />
                            </div>
                            
                            {/* Text content display */}
                            {loadingContent ? (
                              <div className="p-4 text-center border-t">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-sm text-gray-500">מחלץ תוכן הקובץ...</p>
                              </div>
                            ) : cvContent ? (
                              <div className="border-t">
                                <div className="bg-red-50 p-3 border-b">
                                  <h4 className="text-sm font-medium text-red-800">תוכן הקובץ (טקסט מחולץ)</h4>
                                </div>
                                <div className="p-4 max-h-[300px] overflow-y-auto">
                                  <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                                    {cvContent}
                                  </pre>
                                </div>
                              </div>
                            ) : null}
                            
                            {/* Fallback: Always show "Open in new tab" button */}
                            <div className="text-center py-4 border-t">
                              <Button
                                onClick={() => {
                                  window.open(`/uploads/${candidate.cvPath}`, '_blank');
                                }}
                                className="flex items-center gap-2 mx-auto"
                              >
                                <Eye className="w-4 h-4" />
                                פתח PDF בחלון חדש (תצוגה מלאה)
                              </Button>
                            </div>
                          </div>
                        ) : candidate.cvPath.toLowerCase().includes('.doc') ? (
                          /* Word Document Display */
                          <div className="p-8 text-center">
                            <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-blue-800 mb-2">מסמך Word</h3>
                            <p className="text-gray-600 mb-6">לא ניתן להציג מסמכי Word ישירות בדפדפן</p>
                            <div className="flex gap-3 justify-center">
                              <Button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `/uploads/${candidate.cvPath}`;
                                  link.target = '_blank';
                                  link.rel = 'noopener noreferrer';
                                  link.click();
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                פתח במערכת
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `/uploads/${candidate.cvPath}`;
                                  link.download = `${candidate.firstName}_${candidate.lastName}_CV.docx`;
                                  link.click();
                                }}
                                className="flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                הורד קובץ
                              </Button>
                            </div>
                          </div>
                        ) : candidate.cvPath.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          /* Image Display */
                          <div className="p-4">
                            <img
                              src={`/uploads/${candidate.cvPath}`}
                              alt="קורות חיים"
                              className="max-w-full max-h-[500px] object-contain mx-auto"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.innerHTML = `
                                  <div class="text-center p-8">
                                    <p class="text-gray-500">לא ניתן להציג תמונה</p>
                                  </div>
                                `;
                                target.parentNode?.insertBefore(errorDiv, target);
                              }}
                            />
                          </div>
                        ) : (
                          /* Generic File */
                          <div className="p-8 text-center">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">לא ניתן להציג קובץ זה ישירות</p>
                            <Button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/uploads/${candidate.cvPath}`;
                                link.target = '_blank';
                                link.rel = 'noopener noreferrer';
                                link.click();
                              }}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              פתח קובץ
                            </Button>
                          </div>
                        )}
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