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
  const [uploadedFile, setUploadedFile] = useState<(File & { serverPath?: string }) | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobOpinion, setJobOpinion] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  // Fetch active jobs for new candidates
  const { data: jobsData } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !candidate, // Only fetch for new candidates
  });

  const activeJobs = Array.isArray(jobsData) ? jobsData.filter((job: Job) => job.status === "active") : [];

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
      const result = await apiRequest("POST", "/api/candidates", data);
      return await result.json();
    },
    onSuccess: async (result) => {
      // If a job was selected, create application
      if (selectedJobId && result.candidate) {
        try {
          await apiRequest("POST", "/api/applications", {
            candidateId: result.candidate.id,
            jobId: selectedJobId,
            status: "applied",
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
      const result = await apiRequest("PUT", `/api/candidates/${candidate!.id}`, data);
      return await result.json();
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
    setIsProcessingCV(false);
    
    toast({
      title: "קובץ נבחר בהצלחה",
      description: "קובץ קורות החיים מוכן לצפייה",
    });

    // Upload file immediately to server for display
    try {
      const formData = new FormData();
      formData.append("cv", file);

      const uploadResult = await fetch("/api/candidates/upload-cv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (uploadResult.ok) {
        const result = await uploadResult.json();
        // Set the server path for immediate display
        setUploadedFile(Object.assign(file, { serverPath: result.cvPath }));
        
        toast({
          title: "קובץ הועלה לשרת",
          description: "התצוגה המלאה כעת זמינה",
        });
      }
    } catch (error) {
      console.log("Upload for preview failed, will upload on save");
      // File will still display locally for PDFs and images
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      let cvPath: string | undefined;

      // Use existing server path if available, otherwise upload
      if (uploadedFile) {
        if ((uploadedFile as any).serverPath) {
          // File already uploaded to server
          cvPath = (uploadedFile as any).serverPath;
        } else {
          // Upload file now
          const formData = new FormData();
          formData.append("cv", uploadedFile);

          const uploadResult = await fetch("/api/candidates/upload-cv", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadResult.ok) {
            throw new Error("Failed to upload CV");
          }

          const result = await uploadResult.json();
          cvPath = result.cvPath;
        }
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
          <div className="lg:col-span-1 lg:order-1">
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
                            {activeJobs.map((job: Job) => (
                              <SelectItem key={job.id} value={job.id}>
                                <div className="text-right">
                                  <div className="font-medium">{job.title}</div>
                                  <div className="text-sm text-gray-500">
                                    קוד משרה: {job.jobCode}
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

                    {/* Notes */}
                    <div>
                      <label className="text-sm font-medium text-right">הערות:</label>
                      <textarea 
                        value={candidate?.notes || ''}
                        onChange={(e) => {
                          // עדכון הערות בעצם במעמד עצמו אם זה עריכה
                          if (candidate) {
                            // זה יתעדכן בעת שמירה
                          }
                        }}
                        className="min-h-[100px] w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical mt-1"
                        placeholder="הערות כלליות על המועמד..."
                        data-testid="textarea-notes"
                      />
                    </div>

                    {/* Job Assignment with Opinion */}
                    {candidate && activeJobs.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="h-4 w-4 text-green-600" />
                          <h3 className="font-medium text-green-800">הפנייה למשרה עם חוות דעת</h3>
                        </div>
                        <div className="space-y-3">
                          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                            <SelectTrigger className="bg-white" data-testid="select-job-assignment">
                              <SelectValue placeholder="בחר משרה להפנייה..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeJobs.map((job: Job) => (
                                <SelectItem key={job.id} value={job.id}>
                                  <div className="text-right">
                                    <div className="font-medium">{job.title}</div>
                                    <div className="text-sm text-gray-500">
                                      קוד משרה: {job.jobCode}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedJobId && (
                            <div>
                              <label className="block text-sm font-medium text-green-700 mb-1">
                                חוות דעת והמלצה:
                              </label>
                              <textarea 
                                value={jobOpinion}
                                onChange={(e) => setJobOpinion(e.target.value)}
                                className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-vertical"
                                placeholder="כתוב את חוות דעתך על התאמת המועמד למשרה..."
                                data-testid="textarea-job-opinion"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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

          {/* CV Display Card - EXACTLY like candidate detail */}
          <div className="lg:col-span-2 lg:order-2">
            <Card className="h-[calc(100vh-8rem)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {uploadedFile ? "קורות חיים" : "העלאת קורות חיים"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                {!uploadedFile ? (
                  // Upload area when no file is uploaded
                  <FileUpload 
                    onFileSelect={(file: File | null) => file && handleFileUpload(file)} 
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    maxSize={10 * 1024 * 1024}
                  />
                ) : (
                  // EXACT COPY from candidate-detail.tsx
                  <div className="h-full flex flex-col">
                    {/* File info */}
                    <div className="flex justify-center p-3 bg-gray-50 rounded mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        קובץ קורות חיים - {uploadedFile.name}
                      </div>
                    </div>
                    
                    {/* CV Display */}
                    <div className="flex-1 bg-white rounded border overflow-hidden">
                      {(uploadedFile as any).serverPath ? (
                        // Display from server after upload
                        uploadedFile.name.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={`/uploads/${(uploadedFile as any).serverPath?.replace('uploads/', '')}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : uploadedFile.name.toLowerCase().includes('.doc') ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/uploads/' + (uploadedFile as any).serverPath?.replace('uploads/', ''))}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <img
                              src={`/uploads/${(uploadedFile as any).serverPath?.replace('uploads/', '')}`}
                              alt="קורות חיים"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )
                      ) : (
                        // Display from local file before upload
                        uploadedFile.name.toLowerCase().endsWith('.pdf') ? (
                          <iframe
                            src={URL.createObjectURL(uploadedFile)}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : uploadedFile.type.startsWith('image/') ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img
                              src={URL.createObjectURL(uploadedFile)}
                              alt="קורות חיים"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 max-w-md">
                              <FileText className="w-20 h-20 text-blue-600 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-blue-800 mb-2">{uploadedFile.name}</h3>
                              <p className="text-sm text-blue-600 mb-4">
                                גודל: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                <p className="text-green-800 font-medium">קובץ נשמר בהצלחה!</p>
                                <p className="text-sm text-green-600 mt-1">
                                  התצוגה המלאה תהיה זמינה בעמוד המועמד
                                </p>
                              </div>
                              
                              <p className="text-xs text-blue-500">
                                💾 הקובץ מוכן לשמירה עם פרטי המועמד
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                
                {/* Quick Summary of Extracted Data */}
                {extractedData && !extractedData.candidateCreated && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
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
                  className="w-full mt-4"
                  onClick={() => {
                    setUploadedFile(null);
                    setExtractedData(null);
                    (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
                  }}
                >
                  העלה קובץ אחר
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
          <Button 
            type="submit" 
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-medium"
            disabled={createCandidate.isPending || updateCandidate.isPending}
            data-testid="button-submit-candidate"
          >
            {(createCandidate.isPending || updateCandidate.isPending) ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {candidate ? "מעדכן מועמד..." : "שומר מועמד..."}
              </>
            ) : (
              candidate ? "עדכן מועמד" : "הוסף מועמד חדש"
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="px-8 py-3 text-lg"
            onClick={() => {
              form.reset();
              setUploadedFile(null);
              setExtractedData(null);
            }}
            data-testid="button-reset-form"
          >
            נקה טופס
          </Button>
        </div>
      </div>
    </div>
  );
}