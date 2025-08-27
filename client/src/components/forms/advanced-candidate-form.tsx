import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  User,
  Mail,
  Phone,
  Home,
  Briefcase,
  Star,
  Calendar,
  Settings,
  Activity,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  PhoneCall,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import type { Candidate, Job } from "@shared/schema";

// Enhanced form schema with all fields
const candidateFormSchema = z.object({
  firstName: z.string().min(1, "שם פרטי חובה"),
  lastName: z.string().min(1, "שם משפחה חובה"),
  middleName: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה"),
  mobile: z.string().min(1, "מספר נייד חובה"),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  nationalId: z.string().optional(),
  city: z.string().min(1, "עיר חובה"),
  street: z.string().optional(),
  houseNumber: z.string().optional(),
  zipCode: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  drivingLicense: z.string().optional(),
  profession: z.string().optional(),
  experience: z.number().optional(),
  expectedSalary: z.number().optional(),
  recruitmentSource: z.string().optional(),
  status: z.enum(['available', 'employed', 'inactive', 'blacklisted']).default('available'),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  achievements: z.string().optional(),
});

type CandidateFormData = z.infer<typeof candidateFormSchema>;

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file?: File;
}

interface AdvancedCandidateFormProps {
  candidate?: Candidate;
  jobId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AdvancedCandidateForm({
  candidate,
  jobId,
  onSuccess,
  onCancel,
}: AdvancedCandidateFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  // Load existing CV file if editing candidate
  useEffect(() => {
    if (candidate?.cvPath && candidate.cvPath.trim()) {
      // Handle both formats: "uploads/file.pdf" and "file.pdf"
      let cvPath = candidate.cvPath;
      if (cvPath.startsWith('uploads/')) {
        cvPath = cvPath.substring(8); // Remove "uploads/" prefix
      }
      
      const existingCvFile: UploadedFile = {
        id: 'existing-cv',
        name: cvPath.split('/').pop() || 'קורות חיים קיימים',
        size: 0, // We don't know the size
        type: cvPath.toLowerCase().includes('.pdf') ? 'application/pdf' : 
               cvPath.toLowerCase().includes('.doc') ? 'application/msword' : 
               cvPath.toLowerCase().includes('.jpg') || cvPath.toLowerCase().includes('.jpeg') ? 'image/jpeg' :
               cvPath.toLowerCase().includes('.png') ? 'image/png' :
               cvPath.toLowerCase().includes('.gif') ? 'image/gif' : 'application/octet-stream',
        url: `/uploads/${cvPath}`,
      };
      setUploadedFiles([existingCvFile]);
      setSelectedFile(existingCvFile);
      
      console.log('Loading existing CV:', {
        originalPath: candidate.cvPath,
        cleanPath: cvPath,
        finalUrl: existingCvFile.url,
        fileType: existingCvFile.type
      });
    } else {
      // Reset files if no CV path
      setUploadedFiles([]);
      setSelectedFile(null);
    }
  }, [candidate]);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: false,
    address: false,
    status: false,
    preferences: false,
    custom: false,
    timeline: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load jobs for job assignment
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    select: (data: any) => data.jobs || [],
  });

  const form = useForm<CandidateFormData>({
    resolver: zodResolver(candidateFormSchema),
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
      profession: candidate?.profession || "",
      experience: candidate?.experience || undefined,
      expectedSalary: candidate?.expectedSalary || undefined,
      recruitmentSource: candidate?.recruitmentSource || "",
      status: candidate?.status || 'available',
      rating: candidate?.rating || undefined,
      notes: candidate?.notes || "",
      tags: candidate?.tags || [],
      achievements: candidate?.achievements || "",
    },
  });

  // Create/Update candidate mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "הצלחה!",
        description: "המועמד נוצר בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "שגיאה ביצירת המועמד",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/candidates/${candidate?.id}`, {
        method: 'PUT',
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "הצלחה!",
        description: "פרטי המועמד עודכנו בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "שגיאה בעדכון המועמד",
      });
    },
  });

  const onSubmit = (data: CandidateFormData) => {
    const formData = new FormData();
    
    // Add form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add job ID if provided
    if (jobId) {
      formData.append('jobId', jobId);
    }

    // Add CV file if uploaded
    const cvFile = uploadedFiles.find(f => f.type.includes('pdf') || f.type.includes('word') || f.type.includes('document'));
    if (cvFile?.file) {
      formData.append('cv', cvFile.file);
    }

    if (candidate) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // File handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const newFile: UploadedFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        file,
      };
      setUploadedFiles(prev => [...prev, newFile]);
      if (!selectedFile) {
        setSelectedFile(newFile);
      }
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(uploadedFiles.find(f => f.id !== fileId) || null);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {candidate ? `עריכת מועמד: ${candidate.firstName} ${candidate.lastName}` : 'מועמד חדש'}
            </h1>
            {candidate && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">מזהה: {candidate.id}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <PhoneCall className="w-4 h-4" />
                    חייג
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    אימייל
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              form="candidate-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "שומר..." : "שמירה"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Column - Files (35%) */}
        <div className="w-[35%] p-6 bg-white border-l">
          <div className="h-full flex flex-col">
            {/* Upload Area */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">קבצים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">גרור קבצים או</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" type="button">
                      בחר קבצים
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, DOC, DOCX, JPG, PNG (עד 10MB)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Files List */}
            {uploadedFiles.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">קבצים שהועלו</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                          selectedFile?.id === file.id ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                        onClick={() => setSelectedFile(file)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(file.url, '_blank');
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = file.url;
                              link.download = file.name;
                              link.click();
                            }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Preview */}
            {selectedFile && (
              <Card className="flex-1 min-h-0">
                <CardHeader>
                  <CardTitle className="text-sm">תצוגה מקדימה</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] p-2">
                  <div className="h-full bg-gray-100 rounded border overflow-hidden">
                    {selectedFile.type.includes('image') || 
                     selectedFile.name.toLowerCase().includes('.jpg') ||
                     selectedFile.name.toLowerCase().includes('.jpeg') ||
                     selectedFile.name.toLowerCase().includes('.png') ||
                     selectedFile.name.toLowerCase().includes('.gif') ? (
                      <img
                        src={selectedFile.url}
                        alt={selectedFile.name}
                        className="w-full h-full object-contain"
                      />
                    ) : selectedFile.type.includes('pdf') || selectedFile.name.toLowerCase().includes('.pdf') ? (
                      <iframe
                        src={selectedFile.url}
                        className="w-full h-full border-0"
                        title={selectedFile.name}
                        onError={(e) => {
                          console.log('PDF loading error:', e);
                        }}
                      />
                    ) : selectedFile.type.includes('word') || 
                         selectedFile.name.toLowerCase().includes('.doc') ||
                         selectedFile.name.toLowerCase().includes('.docx') ? (
                      <div className="w-full h-full relative">
                        <iframe
                          src={`https://docs.google.com/gview?url=${encodeURIComponent(window.location.origin + selectedFile.url)}&embedded=true`}
                          className="w-full h-full border-0"
                          title={selectedFile.name}
                          onError={(e) => {
                            console.log('Google Docs viewer error:', e);
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
                          📄 {selectedFile.name}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mb-4">לא ניתן להציג תצוגה מקדימה</p>
                          <Button
                            size="sm"
                            onClick={() => window.open(selectedFile.url, '_blank')}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            פתח קובץ
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column - Form (65%) */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Form {...form}>
            <form id="candidate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal Details */}
              <Collapsible
                open={expandedSections.personal}
                onOpenChange={() => toggleSection('personal')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          פרטים אישיים
                        </div>
                        {expandedSections.personal ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם פרטי *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם משפחה *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם אמצעי</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nationalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ת.ז. / דרכון</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מגדר</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר מגדר" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="זכר">זכר</SelectItem>
                                <SelectItem value="נקבה">נקבה</SelectItem>
                                <SelectItem value="לא מצוין">לא מצוין</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maritalStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מצב משפחתי</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר מצב משפחתי" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="רווק/ה">רווק/ה</SelectItem>
                                <SelectItem value="נשוי/ה">נשוי/ה</SelectItem>
                                <SelectItem value="גרוש/ה">גרוש/ה</SelectItem>
                                <SelectItem value="אלמן/ה">אלמן/ה</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Contact Details */}
              <Collapsible
                open={expandedSections.contact}
                onOpenChange={() => toggleSection('contact')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          פרטי קשר
                        </div>
                        {expandedSections.contact ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>אימייל *</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>נייד *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>טלפון נוסף</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>טלפון נוסף 2</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Address */}
              <Collapsible
                open={expandedSections.address}
                onOpenChange={() => toggleSection('address')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5" />
                          כתובת
                        </div>
                        {expandedSections.address ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>עיר *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>רחוב</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="houseNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מספר בית</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מיקוד</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Status & Assignments */}
              <Collapsible
                open={expandedSections.status}
                onOpenChange={() => toggleSection('status')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          שיוכים וסטטוס
                        </div>
                        {expandedSections.status ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>סטטוס מועמד</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר סטטוס" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="available">זמין</SelectItem>
                                <SelectItem value="employed">מועסק</SelectItem>
                                <SelectItem value="inactive">לא פעיל</SelectItem>
                                <SelectItem value="blacklisted">ברשימה שחורה</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="recruitmentSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מקור הגעה</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="בחר מקור" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="דרושים">דרושים</SelectItem>
                                <SelectItem value="אתר קריירה">אתר קריירה</SelectItem>
                                <SelectItem value="הפניה">הפניה</SelectItem>
                                <SelectItem value="לינקדאין">לינקדאין</SelectItem>
                                <SelectItem value="פייסבוק">פייסבוק</SelectItem>
                                <SelectItem value="מייל נכנס">מייל נכנס</SelectItem>
                                <SelectItem value="אחר">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profession"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>מקצוע</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ניסיון (שנים)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Preferences */}
              <Collapsible
                open={expandedSections.preferences}
                onOpenChange={() => toggleSection('preferences')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5" />
                          העדפות
                        </div>
                        {expandedSections.preferences ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="expectedSalary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ציפיות שכר</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="₪"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>דירוג (1-5)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="5"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="achievements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>הישגים</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[100px]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>הערות פנימיות</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[100px]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}