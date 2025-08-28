import { useState, useEffect, memo, useCallback } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  MessageCircle
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FileUpload from "@/components/file-upload";

import type { Candidate, Job } from "@shared/schema";

interface CandidateFormProps {
  candidate?: Candidate;
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
    <div className="h-full p-4 overflow-y-auto bg-white border rounded">
      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  );
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

interface ExtractedData {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  profession?: string;
  candidateCreated?: boolean;
}

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<(File & { serverPath?: string }) | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobOpinion, setJobOpinion] = useState<string>("");
  
  // Same states as candidate detail
  const [showEvents, setShowEvents] = useState(true);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedMessageType, setSelectedMessageType] = useState("");
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [editableTemplate, setEditableTemplate] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSendingReferral, setIsSendingReferral] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [referToJobDialogOpen, setReferToJobDialogOpen] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  
  // Field values for inline editing
  const [fieldValues, setFieldValues] = useState<any>({});

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
      gender: candidate?.gender || undefined,
      maritalStatus: candidate?.maritalStatus || undefined,
      drivingLicense: candidate?.drivingLicense || false,
      address: candidate?.address || "",
      profession: candidate?.profession || "",
      experience: candidate?.experience || "",
      expectedSalary: candidate?.expectedSalary || "",
      status: candidate?.status || "available",
      rating: candidate?.rating || undefined,
      notes: candidate?.notes || "",
      tags: candidate?.tags || "",
      recruitmentSource: candidate?.recruitmentSource || "",
    },
  });

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

  // Get status functions from candidate detail
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

  // Load templates from database
  const { data: templatesData } = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: () => apiRequest('GET', '/api/message-templates'),
  });

  const templates = Array.isArray(templatesData) ? templatesData : [];

  // Load jobs for referral
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<any>(null);

  // Fetch jobs when component loads
  useEffect(() => {
    if (isAuthenticated) {
      setJobsLoading(true);
      apiRequest('GET', '/api/jobs')
        .then(async (response: Response) => {
          const data = await response.json();
          console.log('Jobs API response:', data);
          if (data && data.jobs && Array.isArray(data.jobs)) {
            setJobsList(data.jobs);
            console.log('Set jobs list:', data.jobs);
          } else {
            console.log('Unexpected jobs data structure:', data);
            setJobsList([]);
          }
        })
        .catch((error) => {
          console.error('Error fetching jobs:', error);
          setJobsError(error);
          setJobsList([]);
        })
        .finally(() => {
          setJobsLoading(false);
        });
    }
  }, [isAuthenticated]);

  const jobs = jobsList;

  const filteredJobs = jobs.filter((job: any) =>
    jobSearchTerm === '' ||
    job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
    job.client?.name.toLowerCase().includes(jobSearchTerm.toLowerCase())
  );

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const getWhatsAppTemplate = (messageType: string, candidateName: string) => {
    // Find template from database
    const template = templates.find(t => t.name === messageType);
    if (template) {
      return template.content.replace(/\{שם המועמד\}/g, candidateName);
    }

    // Fallback to hardcoded templates
    const hardcodedTemplates: Record<string, string> = {
      "זימון לראיון עבודה": `שלום ${candidateName} 👋

קיבלנו את קורות החיים שלך והתרשמנו!

נשמח לזמן אותך לראיון עבודה:
📅 תאריך: [להשלים]
🕐 שעה: [להשלים]
📍 מיקום: [להשלים]

על מנת לוודא שהמועד מתאים לך, אנא אשר קבלת ההודעה.

בהצלחה!
צוות הגיוס`,
      
      "אין מענה בנייד": `שלום ${candidateName} 👋

ניסינו להגיע אליך טלפונית מספר פעמים ללא הצלחה.

נשמח לתאם איתך שיחה בזמן שנוח לך:
📞 אנא חזר אלינו בהודעה עם שעות נוחות לפנייה
📧 או כתוב לנו אימייל

נחכה לתגובתך
צוות הגיוס`,

      "בקשת עדכון פרטים": `שלום ${candidateName} 👋

נשמח לעדכן את פרטייך במערכת שלנו.

אנא שלח לנו:
📝 קורות חיים מעודכנות
📞 מספר טלפון נוסף (אם יש)
📧 כתובת אימייל נוספת (אם יש)

תודה על שיתוף הפעולה!
צוות הגיוס`,

      "הודעת תודה": `שלום ${candidateName} 👋

תודה רבה על הזמן שהקדשת לראיון!

התרשמנו מאוד ממך ונחזור אליך בהקדם עם עדכון.

המשך יום נעים!
צוות הגיוס`
    };
    
    return hardcodedTemplates[messageType] || `שלום ${candidateName}, צוות הגיוס פנה אליך.`;
  };

  const handleTemplateSelection = (messageType: string) => {
    if (!fieldValues?.mobile && !candidate?.mobile) return;
    
    const candidateName = `${fieldValues?.firstName || candidate?.firstName || ''} ${fieldValues?.lastName || candidate?.lastName || ''}`.trim();
    const messageTemplate = getWhatsAppTemplate(messageType, candidateName);
    
    setSelectedMessageType(messageType);
    setEditableTemplate(messageTemplate);
    setWhatsappDialogOpen(false);
    setEditTemplateDialogOpen(true);
  };

  const handleSendWhatsAppMessage = () => {
    const mobile = fieldValues?.mobile || candidate?.mobile;
    if (!mobile || !editableTemplate) return;
    
    const whatsappUrl = `https://wa.me/972${mobile.replace(/[^\d]/g, '').substring(1)}?text=${encodeURIComponent(editableTemplate)}`;
    window.open(whatsappUrl, '_blank');
    
    // Create event for the WhatsApp message (only if candidate exists)
    if (candidate?.id) {
      apiRequest('POST', `/api/candidates/${candidate.id}/events`, {
        eventType: 'whatsapp_message',
        description: `נשלחה הודעת וואטסאפ: ${selectedMessageType}`,
        metadata: {
          messageType: selectedMessageType,
          template: editableTemplate,
          timestamp: new Date().toISOString()
        }
      }).catch(console.error);
    }

    setEditTemplateDialogOpen(false);
    setEditableTemplate('');
    setSelectedMessageType('');
    
    toast({
      title: "הודעת וואטסאפ נשלחה",
      description: "הודעה נפתחה בוואטסאפ",
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !candidate?.id) return;
    
    setIsAddingNote(true);
    
    apiRequest('POST', `/api/candidates/${candidate.id}/events`, {
      eventType: 'note_added',
      description: newNote.trim(),
      metadata: {
        noteText: newNote.trim(),
        timestamp: new Date().toISOString()
      }
    }).then(() => {
      if (showEvents) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${candidate.id}/events`] });
      }
      
      toast({
        title: "הערה נשמרה",
        description: "ההערה נשמרה בהצלחה",
      });
      
      setNewNote("");
      setNotesDialogOpen(false);
    }).catch(() => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את ההערה",
        variant: "destructive",
      });
    }).finally(() => {
      setIsAddingNote(false);
    });
  };

  const handleJobReferral = async () => {
    if (selectedJobIds.length === 0 || !recommendation.trim()) {
      toast({
        title: "שגיאה",
        description: "יש לבחור לפחות משרה אחת ולכתוב חוות דעת",
        variant: "destructive",
      });
      return;
    }

    if (isSendingReferral || !candidate?.id) return; // Prevent double clicks
    setIsSendingReferral(true);

    try {
      // Process each selected job
      for (const jobId of selectedJobIds) {
        const selectedJob = jobs.find((job: any) => job.id === jobId);
        if (!selectedJob) continue;

        // Create event for the referral
        await apiRequest('POST', `/api/candidates/${candidate.id}/events`, {
          eventType: 'job_referral',
          description: `הופנה למשרה: ${selectedJob.title} אצל ${selectedJob.client?.name}`,
          metadata: {
            jobId: jobId,
            jobTitle: selectedJob.title,
            clientName: selectedJob.client?.name,
            recommendation: recommendation,
            timestamp: new Date().toISOString()
          }
        });

        // Send email to employer
        await apiRequest('POST', '/api/job-referrals', {
          candidateId: candidate.id,
          jobId: jobId,
          recommendation: recommendation
        });
      }

      if (showEvents) {
        queryClient.invalidateQueries({ queryKey: [`/api/candidates/${candidate.id}/events`] });
      }
      
      toast({
        title: "המועמד הופנה למשרות",
        description: `חוות הדעת נשלחה למעסיקים עבור ${selectedJobIds.length} משרות`,
      });
      
      setSelectedJobIds([]);
      setRecommendation("");
      setJobSearchTerm("");
      setReferToJobDialogOpen(false);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשלוח את ההפניה למעסיק",
        variant: "destructive",
      });
    } finally {
      setIsSendingReferral(false);
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

  // Load candidate events (only if candidate exists)
  const { data: candidateEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<any[]>({
    queryKey: [`/api/candidates/${candidate?.id}/events`],
    enabled: isAuthenticated && !!candidate?.id,
  });

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
                  
                  {candidate && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(candidate.status)}>
                        {getStatusText(candidate.status)}
                      </Badge>
                      {candidate.rating && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-1">דירוג:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Heart
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= candidate.rating! ? 'text-red-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-3">
                    {/* Mobile with WhatsApp */}
                    {(fieldValues?.mobile || candidate?.mobile) && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{fieldValues?.mobile || candidate?.mobile}</span>
                        
                        {/* WhatsApp Integration */}
                        <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
                          <DialogTrigger asChild>
                            <button
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="שלח הודעת וואטסאפ"
                            >
                              📱
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md" dir="rtl">
                            <DialogHeader>
                              <DialogTitle>בחר סוג הודעה</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              {templates.length > 0 ? (
                                templates.map((template: any) => (
                                  <Button
                                    key={template.id}
                                    variant="outline"
                                    className="w-full justify-start text-right"
                                    onClick={() => handleTemplateSelection(template.name)}
                                  >
                                    {template.icon} {template.name}
                                  </Button>
                                ))
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-right"
                                    onClick={() => handleTemplateSelection("זימון לראיון עבודה")}
                                  >
                                    📅 זימון לראיון עבודה
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-right"
                                    onClick={() => handleTemplateSelection("אין מענה בנייד")}
                                  >
                                    📞 אין מענה בנייד
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-right"
                                    onClick={() => handleTemplateSelection("בקשת עדכון פרטים")}
                                  >
                                    📝 בקשת עדכון פרטים
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full justify-start text-right"
                                    onClick={() => handleTemplateSelection("הודעת תודה")}
                                  >
                                    💐 הודעת תודה
                                  </Button>
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* WhatsApp Template Editor */}
                        <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>ערוך הודעה - {selectedMessageType}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">תוכן ההודעה:</label>
                                <textarea
                                  value={editableTemplate}
                                  onChange={(e) => setEditableTemplate(e.target.value)}
                                  className="w-full h-60 p-3 border rounded-md resize-none text-sm font-mono leading-relaxed"
                                  dir="rtl"
                                  placeholder="כתוב את תוכן ההודעה כאן..."
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => setEditTemplateDialogOpen(false)}
                                >
                                  ביטול
                                </Button>
                                <Button
                                  onClick={handleSendWhatsAppMessage}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  📱 שלח בוואטסאפ
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    
                    {/* Email with mailto */}
                    {(fieldValues?.email || candidate?.email) && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{fieldValues?.email || candidate?.email}</span>
                        <a
                          href={`mailto:${fieldValues?.email || candidate?.email}`}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                          title="שלח אימייל"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    
                    {/* City */}
                    {(fieldValues?.city || candidate?.city) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{fieldValues?.city || candidate?.city}</span>
                      </div>
                    )}
                  </div>
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
          
          <div className="flex gap-2">
            {candidate && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEvents(!showEvents)}
                  className="flex items-center gap-2"
                  data-testid="button-recent-events"
                >
                  <History className="w-4 h-4" />
                  אירועים אחרונים
                </Button>
                
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-purple-600 border-purple-200"
                    >
                      📝 הוסף הערה
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>הוסף הערה למועמד</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="w-full h-32 p-3 border rounded-md resize-none"
                        dir="rtl"
                        placeholder="כתוב הערה על המועמד..."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setNotesDialogOpen(false)}
                        >
                          ביטול
                        </Button>
                        <Button 
                          onClick={handleAddNote}
                          disabled={isAddingNote}
                        >
                          {isAddingNote ? "שומר..." : "💾 שמור הערה"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={referToJobDialogOpen} onOpenChange={(open) => {
                  setReferToJobDialogOpen(open);
                  if (!open) {
                    setSelectedJobIds([]);
                    setRecommendation('');
                    setJobSearchTerm('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-green-600 border-green-200"
                    >
                      📧 הפנה למשרה
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>הפנה מועמד למשרה</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">חיפוש משרות:</label>
                        <Input
                          value={jobSearchTerm}
                          onChange={(e) => setJobSearchTerm(e.target.value)}
                          className="w-full mt-1"
                          placeholder="חפש לפי שם משרה או חברה..."
                          dir="rtl"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">
                          בחר משרות ({selectedJobIds.length} נבחרו):
                        </label>
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2 mt-1">
                          {jobsLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                              <p className="text-sm text-gray-500 mt-2">טוען משרות...</p>
                            </div>
                          ) : jobsError ? (
                            <p className="text-red-500 text-sm text-center py-4">
                              שגיאה בטעינת המשרות: {(jobsError as any)?.message || 'שגיאה לא ידועה'}
                            </p>
                          ) : filteredJobs.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">
                              {jobSearchTerm ? 'לא נמצאו משרות התואמות לחיפוש' : 'אין משרות זמינות'}
                            </p>
                          ) : (
                            filteredJobs.map((job: any) => (
                              <div
                                key={job.id}
                                className={`p-2 border rounded cursor-pointer transition-colors ${
                                  selectedJobIds.includes(job.id)
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => toggleJobSelection(job.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{job.title}</p>
                                    <p className="text-xs text-gray-600">{job.client?.name}</p>
                                  </div>
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedJobIds.includes(job.id)}
                                      onChange={() => toggleJobSelection(job.id)}
                                      className="mr-2"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">חוות דעת על המועמד:</label>
                        <textarea
                          value={recommendation}
                          onChange={(e) => setRecommendation(e.target.value)}
                          className="w-full h-24 p-3 border rounded-md resize-none mt-1"
                          dir="rtl"
                          placeholder="כתוב חוות דעת על המועמד למעסיק..."
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setReferToJobDialogOpen(false)}
                        >
                          ביטול
                        </Button>
                        <Button
                          onClick={handleJobReferral}
                          disabled={isSendingReferral || selectedJobIds.length === 0 || !recommendation.trim()}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isSendingReferral ? "שולח..." : "📧 שלח למעסיק"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Events Panel (only show if candidate exists) */}
        {candidate && showEvents && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                אירועים אחרונים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : candidateEvents && candidateEvents.length > 0 ? (
                <div className="space-y-3">
                  {candidateEvents.map((event: any) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-base font-medium">
                              {event.eventType === 'email_received' ? 'התקבל מייל' :
                               event.eventType === 'email_reapplication' ? 'פנייה חוזרת דרך מייל' :
                               event.eventType === 'email_application' ? 'הגיע דרך מייל' :
                               event.eventType === 'created' ? 'נוצר במערכת' :
                               event.eventType === 'cv_uploaded' ? 'הועלה קורות חיים' :
                               event.eventType === 'job_application' ? 'הפניה למשרה' :
                               event.eventType === 'profile_updated' ? 'עדכון פרטים' :
                               event.eventType === 'sent_to_employer' ? 'נשלח למעסיק' :
                               event.eventType === 'interview_invited' ? 'הזמנה לראיון' :
                               event.eventType === 'status_change' ? 'שינוי סטטוס' :
                               event.eventType === 'task_created' ? 'נוצרה משימה' :
                               event.eventType === 'task_completed' ? 'הושלמה משימה' :
                               event.eventType === 'whatsapp_message' ? 'הודעת וואטסאפ' :
                               event.eventType === 'note_added' ? 'הערה נוספה' :
                               event.eventType === 'job_referral' ? 'הופנה למשרה' :
                               event.eventType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          {event.metadata && (
                            <div className="text-xs text-gray-500">
                              {event.metadata.source && <span>מקור: {event.metadata.source === 'manual_entry' ? 'הכנסה ידנית' : event.metadata.source === 'cv_upload' ? 'העלאת קורות חיים' : event.metadata.source}</span>}
                              {event.metadata.createdBy && <span> | נוצר על ידי: {event.metadata.createdBy}</span>}
                              {event.metadata.jobCode && <span> | קוד משרה: {event.metadata.jobCode}</span>}
                              {event.metadata.jobTitle && <span> | משרה: {event.metadata.jobTitle}</span>}
                              {event.metadata.emailSubject && <span> | נושא: {event.metadata.emailSubject}</span>}
                              {event.metadata.recipient && <span> | נשלח אל: {event.metadata.recipient}</span>}
                              {event.metadata.template && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-line">
                                  <strong>תבנית ההודעה:</strong>
                                  <br />
                                  {event.metadata.template}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.createdAt).toLocaleString('he-IL')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  אין אירועים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Layout - 68% CV, 32% Details */}
        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* CV Display Card - 68% */}
          <div className="flex-[2] min-w-0">
            <Card className="h-full">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        // Auto-fill form with extracted data
                        if (extractedData.firstName) form.setValue("firstName", extractedData.firstName);
                        if (extractedData.lastName) form.setValue("lastName", extractedData.lastName);
                        if (extractedData.email) form.setValue("email", extractedData.email);
                        if (extractedData.mobile) form.setValue("mobile", extractedData.mobile);
                        if (extractedData.profession) form.setValue("profession", extractedData.profession);
                        
                        setExtractedData(null);
                        
                        toast({
                          title: "נתונים הועברו לטופס",
                          description: "המידע מהקובץ הועבר לשדות הטופס",
                        });
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      מלא נתונים בטופס
                    </Button>
                  </div>
                )}

                {/* Remove uploaded file button */}
                {uploadedFile && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {
                      setUploadedFile(null);
                      setExtractedData(null);
                      (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    הסר קובץ
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Candidate Details Card - 32% */}
          <div className="flex-1 min-w-0">
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
                      {candidate ? "שמור הכל" : "שמור מועמד"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidate ? (
                    // Inline editing mode for existing candidate
                    <>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">שם פרטי:</span>
                        <Input
                          value={fieldValues.firstName || ''}
                          onChange={(e) => updateFieldValue('firstName', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס שם פרטי"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">שם משפחה:</span>
                        <Input
                          value={fieldValues.lastName || ''}
                          onChange={(e) => updateFieldValue('lastName', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס שם משפחה"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">דוא״ל:</span>
                        <Input
                          value={fieldValues.email || ''}
                          onChange={(e) => updateFieldValue('email', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס דוא״ל"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">טלפון נייד:</span>
                        <Input
                          value={fieldValues.mobile || ''}
                          onChange={(e) => updateFieldValue('mobile', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס טלפון נייד"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">טלפון 1:</span>
                        <Input
                          value={fieldValues.phone || ''}
                          onChange={(e) => updateFieldValue('phone', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס טלפון"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">טלפון 2:</span>
                        <Input
                          value={fieldValues.phone2 || ''}
                          onChange={(e) => updateFieldValue('phone2', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס טלפון 2"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">תעודת זהות:</span>
                        <Input
                          value={fieldValues.nationalId || ''}
                          onChange={(e) => updateFieldValue('nationalId', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס תעודת זהות"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">עיר:</span>
                        <Input
                          value={fieldValues.city || ''}
                          onChange={(e) => updateFieldValue('city', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס עיר"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">רחוב:</span>
                        <Input
                          value={fieldValues.street || ''}
                          onChange={(e) => updateFieldValue('street', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס רחוב"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">מספר בית:</span>
                        <Input
                          value={fieldValues.houseNumber || ''}
                          onChange={(e) => updateFieldValue('houseNumber', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס מספר בית"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">מיקוד:</span>
                        <Input
                          value={fieldValues.zipCode || ''}
                          onChange={(e) => updateFieldValue('zipCode', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס מיקוד"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">מקצוע:</span>
                        <Input
                          value={fieldValues.profession || ''}
                          onChange={(e) => updateFieldValue('profession', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס מקצוע"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">ניסיון:</span>
                        <Input
                          value={fieldValues.experience || ''}
                          onChange={(e) => updateFieldValue('experience', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס ניסיון"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">שכר צפוי:</span>
                        <Input
                          value={fieldValues.expectedSalary || ''}
                          onChange={(e) => updateFieldValue('expectedSalary', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס שכר צפוי"
                        />
                      </div>
                      <div className="flex flex-row-reverse justify-between items-center">
                        <span className="text-base font-medium">הערות:</span>
                        <Textarea
                          value={fieldValues.notes || ''}
                          onChange={(e) => updateFieldValue('notes', e.target.value)}
                          className="w-48 text-base"
                          placeholder="הכנס הערות"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    // Regular form for new candidate
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  שם פרטי
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס שם פרטי" {...field} />
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
                                <FormLabel className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  שם משפחה
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס שם משפחה" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  דוא״ל
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="הכנס כתובת דוא״ל"
                                    {...field}
                                  />
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
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  טלפון נייד
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס מספר נייד" {...field} />
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
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  טלפון בית
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס טלפון בית" {...field} />
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
                                <FormLabel className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  טלפון נוסף
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס טלפון נוסף" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Home className="w-4 h-4" />
                                  עיר
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס עיר מגורים" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="profession"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  מקצוע
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="הכנס מקצוע" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>סטטוס</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
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
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createCandidate.isPending || updateCandidate.isPending}
                        >
                          {createCandidate.isPending || updateCandidate.isPending ? (
                            "שומר..."
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              {candidate ? "עדכן מועמד" : "שמור מועמד"}
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Reset and Clear buttons - only for new candidates */}
        {!candidate && (
          <div className="flex justify-center gap-4 pt-4">
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
              <X className="w-5 h-5 mr-2" />
              נקה טופס
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}