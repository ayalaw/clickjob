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
import { Upload, Check, FileText } from "lucide-react";
import FileUpload from "@/components/file-upload";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCandidateSchema, type Candidate, type InsertCandidate } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

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
      toast({
        title: "הצלחה!",
        description: "המועמד נוסף בהצלחה",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      onSuccess();
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
      onSuccess();
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
      
      const response = await fetch('/api/extract-cv-data', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
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
        
        // בדיקה אם יש נתונים שנחלצו
        const hasExtractedData = extractedData.firstName || extractedData.lastName || extractedData.email;
        
        toast({
          title: hasExtractedData ? "נתונים חולצו בהצלחה!" : "הועלה בהצלחה!",
          description: hasExtractedData 
            ? `נמצאו פרטים: ${extractedData.firstName} ${extractedData.lastName}`.trim()
            : "קורות החיים הועלו. השלם את הפרטים החסרים.",
        });
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {candidate ? "עריכת מועמד" : "הוספת מועמד חדש"}
          </h1>
          <p className="text-gray-600">מלא את הפרטים לפי הטופס או העלה קורות חיים למילוי אוטומטי</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CV Upload Section - Left Side */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-center text-gray-700">העלאת קורות חיים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                  <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">להעלאת קובץ לחץ כאן</p>
                  <p className="text-xs text-gray-500 mb-4">או</p>
                  <FileUpload 
                    onFileSelect={handleFileUpload} 
                    accept=".pdf,.doc,.docx"
                    maxSize={10 * 1024 * 1024}
                  />
                  <Button 
                    variant="outline" 
                    className="mt-4 w-full"
                    onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                  >
                    בחירת קובץ
                  </Button>
                  
                  {isProcessingCV && (
                    <div className="mt-4 p-3 bg-blue-100 rounded text-sm text-blue-700">
                      מעבד קורות חיים...
                    </div>
                  )}
                  {uploadedFile && !isProcessingCV && (
                    <div className="mt-4 p-3 bg-green-100 rounded text-sm text-green-700 flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      {uploadedFile.name}
                    </div>
                  )}
                  {candidate?.cvPath && !uploadedFile && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-700">
                      קורות חיים קיימים
                    </div>
                  )}
                </div>
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    

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