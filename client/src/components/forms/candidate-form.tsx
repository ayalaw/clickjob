import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Upload,
  FileText,
  Check,
  X,
  Mail,
  Phone,
  Home,
  Briefcase,
  Edit, 
  MapPin, 
  User, 
  Eye, 
  ArrowRight,
  Calendar,
  GraduationCap,
  Heart,
  Car,
  Baby,
  Download,
  Save,
  Clock,
  History,
  MessageCircle,
  Trash2
} from "lucide-react";

import { FileViewer } from "@/components/file-viewer";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

import type { Candidate, Job } from "@shared/schema";

interface CandidateFormProps {
  candidate?: Candidate;
  onSuccess: () => void;
}

// File upload interface
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file?: File;
}

const formSchema = z.object({
  firstName: z.string().min(1, "שם פרטי הוא שדה חובה"),
  lastName: z.string().min(1, "שם משפחה הוא שדה חובה"),
  email: z.string().email("כתובת דוא״ל לא תקינה").optional().or(z.literal("")),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  nationalId: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  zipCode: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "other"]).optional(),
  drivingLicense: z.boolean().optional(),
  address: z.string().optional(),
  profession: z.string().optional(),
  experience: z.string().optional(),
  expectedSalary: z.string().optional(),
  status: z.enum(["available", "employed", "inactive", "blacklisted"]).default("available"),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  recruitmentSource: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // File handling
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    candidateData: any;
    existingCandidateId: string;
  }>({ open: false, candidateData: null, existingCandidateId: '' });
  
  // State for duplicate warnings
  const [duplicateWarning, setDuplicateWarning] = useState<{
    phone?: string;
    email?: string;
    nationalId?: string;
    existing?: any;
  }>({});
  
  // Field values for inline editing
  const [fieldValues, setFieldValues] = useState<any>({});
  
  // Function to check for duplicates
  const checkDuplicates = async (mobile?: string, email?: string, nationalId?: string) => {
    if (!mobile && !email && !nationalId) {
      setDuplicateWarning({});
      return;
    }
    
    try {
      const response = await fetch('/api/candidates/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, email, nationalId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          setDuplicateWarning({
            phone: mobile && result.candidate.mobile === mobile ? mobile : undefined,
            email: email && result.candidate.email === email ? email : undefined,
            nationalId: nationalId && result.candidate.nationalId === nationalId ? nationalId : undefined,
            existing: result.candidate
          });
        } else {
          setDuplicateWarning({});
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
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
      gender: candidate?.gender,
      maritalStatus: candidate?.maritalStatus,
      drivingLicense: candidate?.drivingLicense || false,
      address: candidate?.address || "",
      profession: candidate?.profession || "",
      experience: candidate?.experience || "",
      expectedSalary: candidate?.expectedSalary || "",
      status: candidate?.status || "available",
      rating: candidate?.rating,
      notes: candidate?.notes || "",
      tags: candidate?.tags || "",
      recruitmentSource: candidate?.recruitmentSource || "",
    },
  });

  // Load existing CV if candidate exists - BUT DON'T CLEAR if it's a new candidate
  useEffect(() => {
    if (candidate && candidate?.cvPath && candidate.cvPath.trim()) {
      let cvPath = candidate.cvPath.trim();
      
      // Build proper URL - handle both "uploads/file.pdf" and "file.pdf" formats
      let finalUrl;
      if (cvPath.startsWith('uploads/')) {
        finalUrl = `/${cvPath}`;
      } else if (cvPath.startsWith('/uploads/')) {
        finalUrl = cvPath;
      } else {
        finalUrl = `/uploads/${cvPath}`;
      }
      
      // Extract filename for display
      const fileName = cvPath.split('/').pop() || 'קורות חיים';
      
      const existingCvFile: UploadedFile = {
        id: 'existing-cv',
        name: fileName,
        size: 0,
        type: fileName.toLowerCase().includes('.pdf') ? 'application/pdf' : 
               fileName.toLowerCase().includes('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
               fileName.toLowerCase().includes('.doc') ? 'application/msword' : 
               fileName.toLowerCase().includes('.jpg') || fileName.toLowerCase().includes('.jpeg') ? 'image/jpeg' :
               fileName.toLowerCase().includes('.png') ? 'image/png' :
               fileName.toLowerCase().includes('.gif') ? 'image/gif' : 'application/octet-stream',
        url: finalUrl,
      };
      
      setUploadedFiles([existingCvFile]);
      setSelectedFile(existingCvFile);
    }
    // DON'T clear files if no candidate - this allows new file uploads to work
  }, [candidate]);

  // Watch for changes in duplicate-sensitive fields
  const watchedMobile = form.watch("mobile");
  const watchedEmail = form.watch("email");
  const watchedNationalId = form.watch("nationalId");

  useEffect(() => {
    // Only check for duplicates if we're not editing an existing candidate
    if (!candidate) {
      const timeoutId = setTimeout(() => {
        checkDuplicates(watchedMobile, watchedEmail, watchedNationalId);
      }, 500); // Debounce by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [watchedMobile, watchedEmail, watchedNationalId, candidate]);

  useEffect(() => {
    if (candidate) {
      setFieldValues({
        firstName: candidate.firstName || '',
        lastName: candidate.lastName || '',
        email: candidate.email || '',
        mobile: candidate.mobile || '',
        phone: candidate.phone || '',
        phone2: candidate.phone2 || '',
        nationalId: candidate.nationalId || '',
        city: candidate.city || '',
        street: candidate.street || '',
        houseNumber: candidate.houseNumber || '',
        zipCode: candidate.zipCode || '',
        gender: candidate.gender || '',
        maritalStatus: candidate.maritalStatus || '',
        drivingLicense: candidate.drivingLicense || false,
        address: candidate.address || '',
        profession: candidate.profession || '',
        experience: candidate.experience || '',
        expectedSalary: candidate.expectedSalary || '',
        status: candidate.status || 'available',
        rating: candidate.rating || '',
        notes: candidate.notes || '',
        tags: candidate.tags || '',
        recruitmentSource: candidate.recruitmentSource || ''
      });
    }
  }, [candidate]);

  const updateFieldValue = (field: string, value: any) => {
    setFieldValues((prev: any) => ({ ...prev, [field]: value }));
  };

  // File helper functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Take only the first file
    const newFile: UploadedFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      file,
    };
    
    // Replace existing files
    setUploadedFiles([newFile]);
    setSelectedFile(newFile);
    
    console.log('File uploaded:', newFile);
    console.log('Selected file set to:', newFile);
    
    // Extract data automatically
    try {
      const formData = new FormData();
      formData.append('cv', file);
      
      const response = await fetch('/api/extract-cv-data', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Extracted data:', result);
        
        // The actual data is inside extractedData
        const data = result.extractedData || result;
        
        // Check if there's an error indicating candidate already exists
        if ((result.error && (
          result.error.includes('duplicate key value violates unique constraint') ||
          result.error.includes('נתונים חולצו בהצלחה אך יצירת המועמד נכשלה')
        )) || (result.extractedData && result.extractedData.error && (
          result.extractedData.error.includes('duplicate key value violates unique constraint') ||
          result.extractedData.error.includes('נתונים חולצו בהצלחה אך יצירת המועמד נכשלה')
        ))) {
          // Find the existing candidate to get their ID
          try {
            const candidatesResponse = await fetch('/api/candidates');
            if (candidatesResponse.ok) {
              const candidatesData = await candidatesResponse.json();
              const existingCandidate = candidatesData.candidates?.find((c: any) => 
                (data.email && c.email === data.email) || 
                (data.mobile && c.mobile === data.mobile)
              );
              
              if (existingCandidate) {
                console.log('Found existing candidate:', existingCandidate);
                setDuplicateDialog({
                  open: true,
                  candidateData: data,
                  existingCandidateId: existingCandidate.id
                });
              } else {
                toast({
                  title: "מועמד קיים/דומה",
                  description: `המועמד ${data.firstName} ${data.lastName} כבר רשום במערכת`,
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error('Error finding existing candidate:', error);
            toast({
              title: "מועמד קיים/דומה",
              description: `המועמד ${data.firstName} ${data.lastName} כבר רשום במערכת`,
              variant: "destructive",
            });
          }
          return; // Don't fill the form if candidate exists
        }
        
        // Update form fields with extracted data
        if (data.firstName) form.setValue('firstName', data.firstName);
        if (data.lastName) form.setValue('lastName', data.lastName);
        if (data.email) form.setValue('email', data.email);
        if (data.mobile) form.setValue('mobile', data.mobile);
        if (data.phone) form.setValue('phone', data.phone);
        if (data.nationalId) form.setValue('nationalId', data.nationalId);
        if (data.city) form.setValue('city', data.city);
        if (data.street) form.setValue('street', data.street);
        if (data.houseNumber) form.setValue('houseNumber', data.houseNumber);
        if (data.zipCode) form.setValue('zipCode', data.zipCode);
        if (data.profession) form.setValue('profession', data.profession);
        
        toast({
          title: "נתונים חולצו בהצלחה!",
          description: "פרטי המועמד נוספו לטופס מקורות החיים",
        });
      } else {
        console.error('Failed to extract data');
        toast({
          title: "קובץ נבחר בהצלחה",
          description: "קובץ קורות החיים מוכן לצפייה במקור",
        });
      }
    } catch (error) {
      console.error('Error extracting data:', error);
      toast({
        title: "קובץ נבחר בהצלחה",
        description: "קובץ קורות החיים מוכן לצפייה במקור",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(uploadedFiles.find(f => f.id !== fileId) || null);
    }
  };

  const createCandidate = useMutation({
    mutationFn: async (data: FormData & { cvPath?: string }) => {
      const result = await apiRequest("POST", "/api/candidates", data);
      return await result.json();
    },
    onSuccess: (result) => {
      toast({
        title: "מועמד נוצר בהצלחה",
        description: `${result.candidate.firstName} ${result.candidate.lastName} נוסף למערכת`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
    },
    onSuccess: (result) => {
      toast({
        title: "מועמד עודכן בהצלחה",
        description: `${result.candidate.firstName} ${result.candidate.lastName} עודכן במערכת`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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

  const onSubmit = async (data: FormData) => {
    try {
      let cvPath: string | undefined;

      // Upload CV file if there's one selected
      if (selectedFile?.file) {
        const formData = new FormData();
        formData.append("cv", selectedFile.file);

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
      } else if (candidate?.cvPath) {
        // Keep existing CV if no new file uploaded
        cvPath = candidate.cvPath;
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

  const updateMutation = useMutation({
    mutationFn: async (updatedData: Record<string, string>) => {
      return apiRequest('PUT', `/api/candidates/${candidate?.id}`, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${candidate?.id}`] });
      toast({
        title: "פרטי המועמד עודכנו",
        description: "השינויים נשמרו בהצלחה",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בעדכון",
        description: "לא ניתן לעדכן את פרטי המועמד",
        variant: "destructive",
      });
    }
  });

  const saveAllChanges = async () => {
    if (!candidate?.id) return;
    updateMutation.mutate(fieldValues);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-8">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {candidate ? 
                      `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'מועמד ללא שם' :
                      'מועמד חדש'
                    }
                  </h1>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Navigation and Action Buttons */}
        <div className="mb-6 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/candidates")}
            className="flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזור לרשימת המועמדים
          </Button>
        </div>

        {/* Main Layout - 68% CV, 32% Details - EXACT COPY FROM CANDIDATE DETAIL */}
        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* CV Display Card - 68% */}
          <div className="w-[68%] min-w-0">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {selectedFile ? "קורות חיים" : "העלאת קורות חיים"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                {!selectedFile ? (
                  // Upload area when no file is uploaded
                  <div className="h-full">
                    <label className="cursor-pointer h-full w-full block">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors h-full flex flex-col items-center justify-center">
                        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg text-gray-600 mb-4">גרור קבצים או לחץ כאן לבחירה</p>
                        <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                          בחר קבצים
                        </div>
                        <p className="text-sm text-gray-500 mt-4">
                          PDF, DOC, DOCX, JPG, PNG (עד 10MB)
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* File info */}
                    <div className="flex justify-center p-3 bg-gray-50 rounded mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        קובץ קורות חיים - {selectedFile.name}
                      </div>
                    </div>
                    
                    {/* CV Display - Show actual file content using FileViewer */}
                    <div className="flex-1 bg-white rounded border overflow-hidden">
                      {selectedFile?.file ? (
                        <FileViewer file={selectedFile.file} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-600">{selectedFile?.name || 'קורות חיים'}</p>
                            <p className="text-xs text-gray-500 mt-1">תצוגה מקדימה לא זמינה</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Candidate Details Card - 32% - EXACT COPY FROM CANDIDATE DETAIL */}
          <div className="w-[32%] min-w-0">
            <div className="h-full overflow-y-auto">
              {/* Single Card with all candidate details */}
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex justify-end">
                    <Button 
                      onClick={candidate ? saveAllChanges : form.handleSubmit(onSubmit)} 
                      disabled={candidate ? updateMutation.isPending : (createCandidate.isPending || updateCandidate.isPending)}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      שמור הכל
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">שם פרטי:</span>
                    <Input
                      value={candidate ? fieldValues.firstName || '' : form.watch('firstName') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('firstName', e.target.value);
                        } else {
                          form.setValue('firstName', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס שם פרטי"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">שם משפחה:</span>
                    <Input
                      value={candidate ? fieldValues.lastName || '' : form.watch('lastName') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('lastName', e.target.value);
                        } else {
                          form.setValue('lastName', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס שם משפחה"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">דוא״ל:</span>
                    <Input
                      value={candidate ? fieldValues.email || '' : form.watch('email') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('email', e.target.value);
                        } else {
                          form.setValue('email', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס דוא״ל"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-base font-medium">טלפון נייד:</span>
                      <Input
                        value={candidate ? fieldValues.mobile || '' : form.watch('mobile') || ''}
                        onChange={(e) => {
                          if (candidate) {
                            updateFieldValue('mobile', e.target.value);
                          } else {
                            form.setValue('mobile', e.target.value);
                          }
                        }}
                        className={`w-48 text-base ${duplicateWarning.phone ? 'border-red-500 bg-red-50' : ''}`}
                        placeholder="הכנס טלפון נייד"
                      />
                    </div>
                    {duplicateWarning.phone && duplicateWarning.existing && (
                      <div className="text-red-600 text-sm font-bold bg-red-100 p-3 rounded border-2 border-red-400 shadow-lg">
                        ⚠️⚠️⚠️ מספר טלפון זה כבר קיים במערכת! ⚠️⚠️⚠️<br />
                        <strong>מועמד: {duplicateWarning.existing.firstName} {duplicateWarning.existing.lastName}</strong><br />
                        אימייל: {duplicateWarning.existing.email}<br />
                        <span className="text-red-800 font-bold">זהו כנראה מועמד משוכפל!</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">טלפון 1:</span>
                    <Input
                      value={candidate ? fieldValues.phone || '' : form.watch('phone') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('phone', e.target.value);
                        } else {
                          form.setValue('phone', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס טלפון"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">טלפון 2:</span>
                    <Input
                      value={candidate ? fieldValues.phone2 || '' : form.watch('phone2') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('phone2', e.target.value);
                        } else {
                          form.setValue('phone2', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס טלפון 2"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">תעודת זהות:</span>
                    <Input
                      value={candidate ? fieldValues.nationalId || '' : form.watch('nationalId') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('nationalId', e.target.value);
                        } else {
                          form.setValue('nationalId', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס ת.ז."
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">עיר:</span>
                    <Input
                      value={candidate ? fieldValues.city || '' : form.watch('city') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('city', e.target.value);
                        } else {
                          form.setValue('city', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס עיר"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">רחוב:</span>
                    <Input
                      value={candidate ? fieldValues.street || '' : form.watch('street') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('street', e.target.value);
                        } else {
                          form.setValue('street', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס רחוב"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">מספר בית:</span>
                    <Input
                      value={candidate ? fieldValues.houseNumber || '' : form.watch('houseNumber') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('houseNumber', e.target.value);
                        } else {
                          form.setValue('houseNumber', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס מספר בית"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">מיקוד:</span>
                    <Input
                      value={candidate ? fieldValues.zipCode || '' : form.watch('zipCode') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('zipCode', e.target.value);
                        } else {
                          form.setValue('zipCode', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס מיקוד"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">מקצוע:</span>
                    <Input
                      value={candidate ? fieldValues.profession || '' : form.watch('profession') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('profession', e.target.value);
                        } else {
                          form.setValue('profession', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס מקצוע"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">ניסיון:</span>
                    <Input
                      value={candidate ? fieldValues.experience || '' : form.watch('experience') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('experience', e.target.value);
                        } else {
                          form.setValue('experience', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס ניסיון"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">שכר צפוי:</span>
                    <Input
                      value={candidate ? fieldValues.expectedSalary || '' : form.watch('expectedSalary') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('expectedSalary', e.target.value);
                        } else {
                          form.setValue('expectedSalary', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס שכר צפוי"
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-start">
                    <span className="text-base font-medium mt-2">הערות:</span>
                    <Textarea
                      value={candidate ? fieldValues.notes || '' : form.watch('notes') || ''}
                      onChange={(e) => {
                        if (candidate) {
                          updateFieldValue('notes', e.target.value);
                        } else {
                          form.setValue('notes', e.target.value);
                        }
                      }}
                      className="w-48 text-base"
                      placeholder="הכנס הערות"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-row-reverse justify-between items-center">
                    <span className="text-base font-medium">סטטוס:</span>
                    <Select
                      value={candidate ? fieldValues.status || 'available' : form.watch('status') || 'available'}
                      onValueChange={(value) => {
                        if (candidate) {
                          updateFieldValue('status', value);
                        } else {
                          form.setValue('status', value as any);
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="בחר סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">חדש במערכת</SelectItem>
                        <SelectItem value="pending_initial_screening">ממתין לסינון ראשוני</SelectItem>
                        <SelectItem value="in_initial_screening">בסינון ראשוני</SelectItem>
                        <SelectItem value="passed_initial_screening">עבר סינון ראשוני</SelectItem>
                        <SelectItem value="rejected_initial_screening">נפסל בסינון ראשוני</SelectItem>
                        <SelectItem value="sent_to_employer">נשלח למעסיק</SelectItem>
                        <SelectItem value="whatsapp_sent">נשלחה הודעת ווצאפ</SelectItem>
                        <SelectItem value="phone_contacted">נוצר קשר טלפוני</SelectItem>
                        <SelectItem value="waiting_employer_response">מועמד ממתין לתשובת מעסיק</SelectItem>
                        <SelectItem value="invited_to_interview">זומן לראיון אצל מעסיק</SelectItem>
                        <SelectItem value="attended_interview">הגיע לראיון אצל מעסיק</SelectItem>
                        <SelectItem value="missed_interview">לא הגיע לראיון</SelectItem>
                        <SelectItem value="passed_interview">עבר ראיון אצל מעסיק</SelectItem>
                        <SelectItem value="rejected_by_employer">נפסל ע"י מעסיק</SelectItem>
                        <SelectItem value="hired">התקבל לעבודה</SelectItem>
                        <SelectItem value="employment_ended">סיים העסקה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Duplicate Candidate Dialog */}
      <Dialog open={duplicateDialog.open} onOpenChange={(open) => setDuplicateDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">מועמד קיים/דומה</DialogTitle>
            <DialogDescription className="text-right">
              המועמד {duplicateDialog.candidateData?.firstName} {duplicateDialog.candidateData?.lastName} כבר רשום במערכת
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button 
              onClick={() => window.location.href = `/candidates/${duplicateDialog.existingCandidateId}`}
              className="bg-blue-600 hover:bg-blue-700"
            >
              מעבר לכרטיס המועמד
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDuplicateDialog(prev => ({ ...prev, open: false }))}
            >
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}