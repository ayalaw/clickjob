import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Upload,
  FileText,
  Check,
  X,
  Mail,
  Phone,
  Home,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import FileUpload from "@/components/file-upload";

import type { Candidate, Job } from "@shared/schema";

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

const formSchema = z.object({
  firstName: z.string().min(1, "שם פרטי נדרש"),
  lastName: z.string().min(1, "שם משפחה נדרש"),
  email: z.string().email("כתובת מייל לא תקינה"),
  mobile: z.string().min(1, "מספר נייד נדרש"),
  phone: z.string().optional(),
  city: z.string().optional(),
  profession: z.string().optional(),
  experience: z.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExtractedData {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  profession?: string;
  candidateCreated?: boolean;
}

interface CandidateFormProps {
  candidate?: Candidate;
  onSuccess: () => void;
}

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  // Fetch active jobs for new candidates
  const { data: jobsData } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !candidate, // Only fetch for new candidates
  });

  const activeJobs = jobsData?.jobs?.filter((job: Job) => job.status === "active") || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: candidate?.firstName || "",
      lastName: candidate?.lastName || "",
      email: candidate?.email || "",
      mobile: candidate?.mobile || "",
      phone: candidate?.phone || "",
      city: candidate?.city || "",
      profession: candidate?.profession || "",
      experience: candidate?.experience || null,
    },
  });

  const createCandidate = useMutation({
    mutationFn: async (data: FormData & { cvPath?: string }) => {
      const result = await apiRequest("/api/candidates", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return result;
    },
    onSuccess: async (result) => {
      // If a job was selected, create application
      if (selectedJobId && result.candidate) {
        try {
          await apiRequest("/api/applications", {
            method: "POST",
            body: JSON.stringify({
              candidateId: result.candidate.id,
              jobId: selectedJobId,
              status: "applied",
            }),
          });
          toast({
            title: "מועמד נוצר בהצלחה",
            description: `המועמד נוצר ונוסף למשרה שנבחרה`,
          });
        } catch (error) {
          console.error("Error creating application:", error);
          toast({
            title: "מועמד נוצר בהצלחה",
            description: "אך הייתה בעיה בצירוף למשרה. תוכל לצרף ידנית בעמוד הראיונות.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "מועמד נוצר בהצלחה",
          description: `${result.candidate.firstName} ${result.candidate.lastName} נוסף למערכת`,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "שגיאה ביצירת מועמד",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCandidate = useMutation({
    mutationFn: async (data: FormData & { cvPath?: string }) => {
      const result = await apiRequest(`/api/candidates/${candidate!.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "מועמד עודכן בהצלחה",
        description: `${result.candidate.firstName} ${result.candidate.lastName} עודכן במערכת`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "שגיאה בעדכון מועמד",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsProcessingCV(true);

    try {
      const formData = new FormData();
      formData.append("cv", file);

      const result = await apiRequest("/api/candidates/extract-cv", {
        method: "POST",
        body: formData,
      });

      if (result.extractedData) {
        setExtractedData(result.extractedData);

        // Auto-fill form with extracted data
        if (result.extractedData.firstName) {
          form.setValue("firstName", result.extractedData.firstName);
        }
        if (result.extractedData.lastName) {
          form.setValue("lastName", result.extractedData.lastName);
        }
        if (result.extractedData.email) {
          form.setValue("email", result.extractedData.email);
        }
        if (result.extractedData.mobile) {
          form.setValue("mobile", result.extractedData.mobile);
        }
        if (result.extractedData.profession) {
          form.setValue("profession", result.extractedData.profession);
        }

        // Check if candidate was automatically created
        if (result.extractedData.candidateCreated) {
          toast({
            title: "מועמד נוצר אוטומטית!",
            description: "המערכת זיהתה פרטים מספיקים וצרה את המועמד אוטומטית",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
          onSuccess();
          return;
        }
      }
    } catch (error) {
      console.error("Error processing CV:", error);
      toast({
        title: "שגיאה בעיבוד קורות החיים",
        description: "לא ניתן היה לחלץ מידע מהקובץ",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCV(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      let cvPath: string | undefined;

      // Upload file if exists
      if (uploadedFile) {
        const formData = new FormData();
        formData.append("cv", uploadedFile);

        const uploadResult = await apiRequest("/api/candidates/upload-cv", {
          method: "POST",
          body: formData,
        });

        cvPath = uploadResult.cvPath;
      }

      const candidateData = {
        ...data,
        ...(cvPath && { cvPath }),
      };

      if (candidate) {
        updateCandidate.mutate(candidateData);
      } else {
        createCandidate.mutate(candidateData);
      }
    } catch (error) {
      toast({
        title: "שגיאה בשמירה",
        description: "אירעה שגיאה בשמירת המועמד",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {candidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
            </h1>
            <p className="text-gray-600 mt-2">
              {candidate ? "עדכן את פרטי המועמד" : "הוסף מועמד חדש למערכת"}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onSuccess}
              data-testid="button-cancel-top"
            >
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            
            <Button 
              form="candidate-form"
              type="submit"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section - Left Side */}
          <div className="lg:col-span-1">
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

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            דואר אלקטרוני: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
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
                          <FormLabel className="text-right flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            נייד: <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-mobile" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            טלפון בית:
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-phone" />
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
                          <FormLabel className="text-right flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            עיר מגורים:
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Profession */}
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            מקצוע:
                          </FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-profession" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Experience */}
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">שנות ניסיון:</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              value={field.value || ''}
                              data-testid="input-experience"
                            />
                          </FormControl>
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

          {/* CV Upload & Display Section - Right Side - BIGGER */}
          <div className="lg:col-span-2">
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
                      
                      <div className="h-[800px] bg-white overflow-auto">
                        {uploadedFile.type === 'application/pdf' ? (
                          // PDF Embedded Viewer
                          <iframe
                            src={URL.createObjectURL(uploadedFile)}
                            className="w-full h-full border-0"
                            title="CV Preview"
                          />
                        ) : uploadedFile.type.includes('document') ? (
                          // DOC/DOCX - Display file info and download options
                          <div className="w-full h-full flex items-center justify-center bg-blue-50 p-8">
                            <div className="text-center max-w-md">
                              <FileText className="w-20 h-20 text-blue-600 mx-auto mb-6" />
                              <h3 className="text-xl font-bold text-blue-800 mb-2">מסמך Word</h3>
                              <p className="text-blue-700 font-medium mb-4">{uploadedFile.name}</p>
                              <p className="text-blue-600 text-sm mb-6">
                                גודל הקובץ: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              
                              <div className="space-y-3">
                                <a 
                                  href={URL.createObjectURL(uploadedFile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                  פתח לצפייה מלאה
                                </a>
                                <a 
                                  href={URL.createObjectURL(uploadedFile)} 
                                  download={uploadedFile.name}
                                  className="block w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                                >
                                  הורד למחשב
                                </a>
                              </div>
                              
                              <p className="text-blue-500 text-xs mt-4">
                                קבצי Word מוצגים בחלון נפרד לצפייה מלאה
                              </p>
                            </div>
                          </div>
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
        </div>
      </div>
    </div>
  );
}