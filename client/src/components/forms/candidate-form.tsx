import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, FileText, Briefcase, Home, Mail, Phone } from "lucide-react";
import FileUpload from "@/components/file-upload";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertCandidateSchema, type Candidate, type InsertCandidate, type JobWithClient } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

interface CandidateFormProps {
  candidate?: Candidate | null;
  onSuccess: () => void;
}

// Component to display text file content
function TextFileViewer({ file }: { file: File }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setLoading(false);
    };
    
    reader.onerror = () => {
      setError('שגיאה בקריאת הקובץ');
      setLoading(false);
    };
    
    reader.readAsText(file, 'UTF-8');
  }, [file]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">טוען קובץ...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [extractedData, setExtractedData] = useState<any>(null);

  // Fetch active jobs for selection
  const { data: jobsData } = useQuery<{ jobs: JobWithClient[] }>({
    queryKey: ["/api/jobs"],
    enabled: !candidate, // Only fetch for new candidates
  });

  const activeJobs = jobsData?.jobs.filter(job => job.status === 'active') || [];

  const form = useForm({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      firstName: candidate?.firstName || "",
      lastName: candidate?.lastName || "",
      email: candidate?.email || "",
      mobile: candidate?.mobile || "",
      phone: candidate?.phone || "",
      phone2: candidate?.phone2 || "",
      nationalId: candidate?.nationalId || "",
      city: candidate?.city || "",
      street: candidate?.street || "",
      houseNumber: candidate?.houseNumber || "",
      zipCode: candidate?.zipCode || "",
      gender: candidate?.gender || "",
      maritalStatus: candidate?.maritalStatus || "",
      drivingLicense: candidate?.drivingLicense || "",
      address: candidate?.address || "",
      profession: candidate?.profession || "",
      experience: candidate?.experience || undefined,
      expectedSalary: candidate?.expectedSalary || undefined,
      status: candidate?.status || "available",
      rating: candidate?.rating || undefined,
      notes: candidate?.notes || "",
      tags: candidate?.tags || [],
    },
  });

  const queryClient = useQueryClient();

  const createCandidate = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/candidates", {
        method: "POST",
        body: data,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create candidate");
      }
      return response.json();
    },
    onSuccess: () => {
      const hasSelectedJob = selectedJobId && !candidate;
      toast({
        title: "הצלחה!",
        description: hasSelectedJob 
          ? "המועמד נוסף ונשלח לראיונות בהצלחה! 🎯"
          : "המועמד נוסף בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      // חזרה לדף הבית אחרי שמירה מוצלחת
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור מועמד. אנא נסה שוב.",
        variant: "destructive",
      });
    },
  });

  const updateCandidate = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/candidates/${candidate!.id}`, {
        method: "PUT",
        body: data,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to update candidate");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "הצלחה!",
        description: "המועמד עודכן בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      // חזרה לדף הבית אחרי עדכון מוצלח
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן מועמד. אנא נסה שוב.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCandidate) => {
    const formData = new FormData();
    
    // Add all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add selected job for new candidates
    if (!candidate && selectedJobId) {
      formData.append('jobId', selectedJobId);
    }

    // Add uploaded file if present
    if (uploadedFile) {
      formData.append('cv', uploadedFile);
    }

    if (candidate) {
      updateCandidate.mutate(formData);
    } else {
      createCandidate.mutate(formData);
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    
    setUploadedFile(file);
    setIsProcessingCV(true);
    
    try {
      const formData = new FormData();
      formData.append('cv', file);
      
      console.log('🚀 About to call /api/extract-cv-data with file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      const response = await fetch('/api/extract-cv-data', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      console.log('🚀 Response status:', response.status, 'OK:', response.ok);
      
      if (response.ok) {
        const extractedData = await response.json();
        console.log('Received extracted data:', extractedData);
        
        // Auto-fill form fields with extracted data
        if (extractedData.firstName) {
          form.setValue('firstName', extractedData.firstName);
          console.log('Set firstName:', extractedData.firstName);
        }
        if (extractedData.lastName) {
          form.setValue('lastName', extractedData.lastName);
          console.log('Set lastName:', extractedData.lastName);
        }
        if (extractedData.email) {
          form.setValue('email', extractedData.email);
          console.log('Set email:', extractedData.email);
        }
        if (extractedData.mobile) {
          form.setValue('mobile', extractedData.mobile);
          console.log('Set mobile:', extractedData.mobile);
        }
        if (extractedData.phone) {
          form.setValue('phone', extractedData.phone);
          console.log('Set phone:', extractedData.phone);
        }
        if (extractedData.city) {
          form.setValue('city', extractedData.city);
          console.log('Set city:', extractedData.city);
        }
        if (extractedData.street) {
          form.setValue('street', extractedData.street);
          console.log('Set street:', extractedData.street);
        }
        if (extractedData.houseNumber) {
          form.setValue('houseNumber', extractedData.houseNumber);
          console.log('Set houseNumber:', extractedData.houseNumber);
        }
        if (extractedData.profession) {
          form.setValue('profession', extractedData.profession);
          console.log('Set profession:', extractedData.profession);
        }
        if (extractedData.experience) {
          form.setValue('experience', extractedData.experience);
          console.log('Set experience:', extractedData.experience);
        }
        if (extractedData.phone2) {
          form.setValue('phone2', extractedData.phone2);
          console.log('Set phone2:', extractedData.phone2);
        }
        if (extractedData.nationalId) {
          form.setValue('nationalId', extractedData.nationalId);
          console.log('Set nationalId:', extractedData.nationalId);
        }
        if (extractedData.zipCode) {
          form.setValue('zipCode', extractedData.zipCode);
          console.log('Set zipCode:', extractedData.zipCode);
        }
        if (extractedData.gender) {
          form.setValue('gender', extractedData.gender);
          console.log('Set gender:', extractedData.gender);
        }
        if (extractedData.maritalStatus) {
          form.setValue('maritalStatus', extractedData.maritalStatus);
          console.log('Set maritalStatus:', extractedData.maritalStatus);
        }
        if (extractedData.drivingLicense) {
          form.setValue('drivingLicense', extractedData.drivingLicense);
          console.log('Set drivingLicense:', extractedData.drivingLicense);
        }
        if (extractedData.achievements) {
          form.setValue('notes' as any, extractedData.achievements);
          console.log('Set achievements:', extractedData.achievements);
        }
        
        // בדיקה אם יש נתונים שנחלצו
        const hasExtractedData = extractedData.firstName || extractedData.lastName || extractedData.email;
        
        // שמירת הנתונים המחולצים להצגה
        setExtractedData(extractedData);
        
        // בדיקה אם נוצר מועמד אוטומטית
        if (extractedData.candidateCreated) {
          toast({
            title: "מועמד נוצר אוטומטית! 🎉",
            description: `${extractedData.candidateName} נוסף למערכת מקורות החיים`,
          });
          // רענון רשימת המועמדים
          queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
          // חזרה לדף הבית
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          toast({
            title: hasExtractedData ? "נתונים חולצו מהקובץ!" : "קובץ הועלה בהצלחה",
            description: hasExtractedData 
              ? `נמצאו פרטים בקובץ: ${extractedData.firstName} ${extractedData.lastName}`.trim()
              : "לא נמצאו נתונים בקובץ - מלא ידנית (PDF/DOC דורשים עיבוד מיוחד)",
          });
        }
      }
    } catch (error) {
      console.error('Error extracting CV data:', error);
    } finally {
      setIsProcessingCV(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {candidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
              </h1>
              <p className="text-gray-600">מלא את הפרטים לפי הטופס או העלה קורות חיים למילוי אוטומטי</p>
            </div>
            
            {/* Save Button - Top Right */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = "/"}
                data-testid="button-back-home"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                חזור לדף הבית
              </Button>
              
              <Button
                type="submit"
                form="candidate-form"
                disabled={createCandidate.isPending || updateCandidate.isPending}
                data-testid="button-save-candidate-top"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {createCandidate.isPending || updateCandidate.isPending ? (
                  <>שומר...</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {candidate ? "עדכן מועמד" : "שמור מועמד"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CV Upload & Display Section - Left Side */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-center text-gray-700">
                  {uploadedFile ? "קורות החיים שהועלה" : "העלאת קורות חיים"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!uploadedFile ? (
                  // Upload area when no file is uploaded
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                    <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">להעלאת קובץ לחץ כאן</p>
                    <p className="text-xs text-gray-500 mb-4">או</p>
                    <FileUpload 
                      onFileSelect={handleFileUpload} 
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                      maxSize={10 * 1024 * 1024}
                    />
                    <Button 
                      variant="outline" 
                      className="mt-4 w-full"
                      onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                    >
                      בחירת קובץ
                    </Button>
                    
                    {candidate?.cvPath && (
                      <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-700">
                        קורות חיים קיימים
                      </div>
                    )}
                  </div>
                ) : (
                  // File display when uploaded
                  <div className="space-y-4">
                    {/* File Header */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">{uploadedFile.name}</p>
                          <p className="text-sm text-green-600">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      {isProcessingCV && (
                        <div className="bg-blue-100 border border-blue-200 rounded p-3 text-sm text-blue-700">
                          מעבד קורות חיים...
                        </div>
                      )}
                    </div>

                    {/* File Viewer - Actual CV Content */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                        <h4 className="font-medium text-gray-800">תצוגת קורות החיים</h4>
                        <div className="flex gap-2">
                          <a 
                            href={URL.createObjectURL(uploadedFile)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            פתח בחלון חדש
                          </a>
                          <a 
                            href={URL.createObjectURL(uploadedFile)} 
                            download={uploadedFile.name}
                            className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                          >
                            הורד
                          </a>
                        </div>
                      </div>
                      
                      <div className="h-[600px] bg-white overflow-auto">
                        {uploadedFile.type === 'application/pdf' ? (
                          // PDF Embedded Viewer
                          <iframe
                            src={URL.createObjectURL(uploadedFile)}
                            className="w-full h-full border-0"
                            title="CV Preview"
                          />
                        ) : uploadedFile.type.includes('document') ? (
                          // DOC/DOCX - Use Google Docs Viewer
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(URL.createObjectURL(uploadedFile))}&embedded=true`}
                            className="w-full h-full border-0"
                            title="CV Preview"
                            onError={() => {
                              // Fallback to file download if viewer fails
                              console.log('Google Docs Viewer failed, falling back to download link');
                            }}
                          />
                        ) : uploadedFile.type.startsWith('image/') ? (
                          // Image Files Viewer
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
                            <img
                              src={URL.createObjectURL(uploadedFile)}
                              alt="CV Image"
                              className="max-w-full max-h-full object-contain"
                              style={{ maxHeight: '550px' }}
                            />
                          </div>
                        ) : uploadedFile.type === 'text/plain' ? (
                          // Text Files Viewer
                          <div className="w-full h-full p-4 overflow-auto">
                            <TextFileViewer file={uploadedFile} />
                          </div>
                        ) : (
                          // Fallback for unsupported file types
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600 text-lg font-medium mb-2">לא ניתן להציג קובץ זה</p>
                              <p className="text-gray-500 text-sm mb-4">{uploadedFile.name}</p>
                              <a 
                                href={URL.createObjectURL(uploadedFile)} 
                                download={uploadedFile.name}
                                className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                              >
                                הורד קובץ
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Summary of Extracted Data */}
                    {extractedData && !extractedData.candidateCreated && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          נתונים שחולצו מהקובץ
                        </h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {extractedData.firstName && extractedData.lastName && (
                            <div className="text-blue-700">
                              <span className="font-medium">שם:</span> {extractedData.firstName} {extractedData.lastName}
                            </div>
                          )}
                          {extractedData.email && (
                            <div className="text-blue-700">
                              <span className="font-medium">מייל:</span> {extractedData.email}
                            </div>
                          )}
                          {extractedData.mobile && (
                            <div className="text-blue-700">
                              <span className="font-medium">נייד:</span> {extractedData.mobile}
                            </div>
                          )}
                          {extractedData.profession && (
                            <div className="text-blue-700">
                              <span className="font-medium">מקצוע:</span> {extractedData.profession}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Option to upload different file */}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setUploadedFile(null);
                        setExtractedData(null);
                        (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
                      }}
                    >
                      העלה קובץ אחר
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Form Section - Right Side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>פרטים אישיים</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form id="candidate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Job Selection for new candidates */}
                    {!candidate && activeJobs.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="h-4 w-4 text-blue-600" />
                          <h3 className="font-medium text-blue-800">בחירת משרה</h3>
                        </div>
                        <p className="text-sm text-blue-600 mb-3">
                          בחר משרה כדי שהמועמד יופיע אוטומטית בעמוד הראיונות
                        </p>
                        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                          <SelectTrigger className="bg-white" data-testid="select-job">
                            <SelectValue placeholder="בחר משרה לצירוף המועמד..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeJobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                <div className="text-right">
                                  <div className="font-medium">{job.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {job.client.companyName} - {job.jobCode}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">
                            שם פרטי: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Name */}
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">
                            שם משפחה: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Mobile */}
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">נייד:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">
                            מאימיל: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone 1 */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">טלפון נ':</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone 2 */}
                    <FormField
                      control={form.control}
                      name="phone2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">טלפון נ' 2:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-phone2" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* National ID */}
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">תעודת זהות:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-national-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* City */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">
                            עיר: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Street */}
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">רחוב:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-street" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* House Number */}
                    <FormField
                      control={form.control}
                      name="houseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">מס' בית:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-house-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Zip Code */}
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">מיקוד:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-zip-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Gender */}
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">מין:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="זכר">זכר</SelectItem>
                              <SelectItem value="נקבה">נקבה</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Marital Status */}
                    <FormField
                      control={form.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">מצב משפחתי:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-marital-status">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="רווק/ה">רווק/ה</SelectItem>
                              <SelectItem value="נשוי/אה">נשוי/אה</SelectItem>
                              <SelectItem value="גרוש/ה">גרוש/ה</SelectItem>
                              <SelectItem value="אלמן/ה">אלמן/ה</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Achievements (נצחונות) */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">נצחונות:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="הישגים ונצחונות" data-testid="input-achievements" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recruitment Source */}
                    <FormField
                      control={form.control}
                      name={"notes" as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">מקור גיוס:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} placeholder="מקור הגיוס (מתמלא אוטומטית)" data-testid="input-recruitment-source" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Driving License */}
                    <FormField
                      control={form.control}
                      name="drivingLicense"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">רישיון נהיגה:</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-driving-license">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="כן">כן</SelectItem>
                              <SelectItem value="לא">לא</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onSuccess}
                        data-testid="button-cancel"
                      >
                        ביטול
                      </Button>

                      <Button
                        type="submit"
                        disabled={createCandidate.isPending || updateCandidate.isPending}
                        data-testid="button-save-candidate"
                        className="flex items-center gap-2"
                      >
                        {createCandidate.isPending || updateCandidate.isPending ? (
                          <>שומר...</>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            {candidate ? "עדכן מועמד" : "שמור מועמד"}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}