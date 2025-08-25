import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertCandidateSchema, type InsertCandidate, type Candidate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import FileUpload from "@/components/file-upload";
import { User, Mail, Phone, MapPin, Briefcase, Upload, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface CandidateFormProps {
  candidate?: Candidate | null;
  onSuccess: () => void;
}

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      firstName: candidate?.firstName || "",
      lastName: candidate?.lastName || "",
      email: candidate?.email || "",
      phone: candidate?.phone || "",
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

  const createCandidate = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/candidates", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-candidates"] });
      toast({
        title: "הצלחה",
        description: "המועמד נוצר בהצלחה",
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת המועמד",
        variant: "destructive",
      });
    },
  });

  const updateCandidate = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/candidates/${candidate!.id}`, {
        method: "PUT",
        body: data,
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-candidates"] });
      toast({
        title: "הצלחה",
        description: "המועמד עודכן בהצלחה",
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון המועמד",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCandidate) => {
    const formData = new FormData();
    
    // Add all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    // Add file if uploaded
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
      
      const response = await fetch('/api/extract-cv-data', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (response.ok) {
        const extractedData = await response.json();
        
        // Auto-fill form fields with extracted data
        if (extractedData.firstName) form.setValue('firstName', extractedData.firstName);
        if (extractedData.lastName) form.setValue('lastName', extractedData.lastName);
        if (extractedData.email) form.setValue('email', extractedData.email);
        if (extractedData.phone) form.setValue('phone', extractedData.phone);
        if (extractedData.address) form.setValue('address', extractedData.address);
        if (extractedData.profession) form.setValue('profession', extractedData.profession);
        if (extractedData.experience) form.setValue('experience', extractedData.experience);
        
        toast({
          title: "הצלחה",
          description: "פרטים חולצו מקורות החיים ומולאו אוטומטית",
        });
      }
    } catch (error) {
      console.error('Error extracting CV data:', error);
    } finally {
      setIsProcessingCV(false);
    }
  };

  return (
    <div className="w-full p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {candidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
        </h1>
        <p className="text-gray-600">מלא את כל הפרטים או העלה קורות חיים למילוי אוטומטי</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* File Upload Section - First */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                העלאת קורות חיים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">גרור קובץ או לחץ לבחירה</p>
                <p className="text-xs text-gray-500 mb-4">PDF, DOC, DOCX עד 10MB - הפרטים ימולאו אוטומטית</p>
                <FileUpload 
                  onFileSelect={handleFileUpload} 
                  accept=".pdf,.doc,.docx"
                  maxSize={10 * 1024 * 1024}
                />
                {isProcessingCV && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    מעבד קורות חיים...
                  </div>
                )}
                {uploadedFile && !isProcessingCV && (
                  <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                    נבחר: {uploadedFile.name}
                  </div>
                )}
                {candidate?.cvPath && !uploadedFile && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    קורות חיים קיימים מועלים
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                פרטים אישיים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם פרטי *</FormLabel>
                      <FormControl>
                        <Input placeholder="הכנס שם פרטי" {...field} data-testid="input-first-name" />
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
                        <Input placeholder="הכנס שם משפחה" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        כתובת אימייל *
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} data-testid="input-email" />
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
                        מספר טלפון נייד
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="05X-XXXXXXX" {...field} value={field.value || ""} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      כתובת מגורים
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="עיר, רחוב ומספר בית" {...field} value={field.value || ""} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                מידע מקצועי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תחום התמחות</FormLabel>
                    <FormControl>
                      <Input placeholder="למשל: מפתח תוכנה, מעצב גרפי" {...field} value={field.value || ""} data-testid="input-profession" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שנות ניסיון</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-experience">
                            <SelectValue placeholder="בחר מספר שנים" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">ללא ניסיון</SelectItem>
                          <SelectItem value="1">שנה אחת</SelectItem>
                          <SelectItem value="2">2-3 שנים</SelectItem>
                          <SelectItem value="5">4-6 שנים</SelectItem>
                          <SelectItem value="10">7+ שנים</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שכר צפוי (₪)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15000"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-expected-salary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סטטוס</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "available"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="בחר סטטוס" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">זמין לעבודה</SelectItem>
                        <SelectItem value="employed">מועסק כעת</SelectItem>
                        <SelectItem value="inactive">לא פעיל</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות נוספות על המועמד</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="הערות או מידע נוסף על המועמד - כישורים, התרשמות מראיון, וכו'"
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden compatibility fields */}
              <div style={{ display: 'none' }}>
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => <Input {...field} value={field.value || ""} />}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
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
    </div>
  );
}
