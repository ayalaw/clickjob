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
import FileUpload from "@/components/file-upload";

interface CandidateFormProps {
  candidate?: Candidate | null;
  onSuccess: () => void;
}

export default function CandidateForm({ candidate, onSuccess }: CandidateFormProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
            <span>מועמדים</span>
            <span>›</span>
            <span className="text-gray-600">מועמד חדש</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">פרטים אישיים</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex gap-8">
              {/* File Upload Section - Left Side */}
              <div className="w-80">
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center h-64 flex flex-col justify-center items-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-2">למעטף קח קל מאלה</p>
                  <p className="text-gray-400 text-sm mb-4">או</p>
                  <Button type="button" variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                    בחירת קובץ
                  </Button>
                  <FileUpload 
                    onFileSelect={setUploadedFile} 
                    accept=".pdf,.doc,.docx"
                    maxSize={10 * 1024 * 1024} // 10MB
                  />
                  {candidate?.cvPath && !uploadedFile && (
                    <p className="text-sm text-green-600 mt-2">קורות חיים קיימים מועלים</p>
                  )}
                </div>
              </div>

              {/* Form Fields - Right Side */}
              <div className="flex-1">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="space-y-6">
                    {/* Image Selection */}
                    <FormItem>
                      <FormLabel className="text-right">איזה תמונה התרשמת:</FormLabel>
                      <Select>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="עבר ברזח ירק האיחות" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="option1">אופציה 1</SelectItem>
                          <SelectItem value="option2">אופציה 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>

                    {/* Name Fields */}
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">*שם פרטי:</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" className="text-right" />
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
                          <FormLabel className="text-right">*שם משפחה:</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" className="text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nickname */}
                    <FormItem>
                      <FormLabel className="text-right">כינוי:</FormLabel>
                      <Input className="text-right" />
                    </FormItem>

                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">*דוא"ל:</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" className="text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone Numbers */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">*טלפון נ:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-phone" className="text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-right">טלפון ב:</FormLabel>
                      <Input className="text-right" />
                    </FormItem>

                    {/* Education */}
                    <FormItem>
                      <FormLabel className="text-right">השכלת חמור:</FormLabel>
                      <Input className="text-right" />
                    </FormItem>

                    {/* Address Fields */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">*עיר:</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-address" className="text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-right">רחוב:</FormLabel>
                      <Input className="text-right" />
                    </FormItem>

                    <FormItem>
                      <FormLabel className="text-right">מס' בית:</FormLabel>
                      <Input className="text-right" />
                    </FormItem>

                    {/* Dropdowns */}
                    <FormItem>
                      <FormLabel className="text-right">מין:</FormLabel>
                      <Select>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">זכר</SelectItem>
                          <SelectItem value="female">נקבה</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormItem>
                      <FormLabel className="text-right">מצב משפחתי:</FormLabel>
                      <Select>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">רווק/ה</SelectItem>
                          <SelectItem value="married">נשוי/אה</SelectItem>
                          <SelectItem value="divorced">גרוש/ה</SelectItem>
                          <SelectItem value="widowed">אלמן/ה</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-right">ניסיון:</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} defaultValue={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="text-right">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">ללא ניסיון</SelectItem>
                              <SelectItem value="1">שנה</SelectItem>
                              <SelectItem value="2">2 שנים</SelectItem>
                              <SelectItem value="3">3 שנים</SelectItem>
                              <SelectItem value="5">5+ שנים</SelectItem>
                              <SelectItem value="10">10+ שנים</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-right">רמיסות עדבר:</FormLabel>
                      <Select>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="option1">אופציה 1</SelectItem>
                          <SelectItem value="option2">אופציה 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>

                    {/* Hidden fields for compatibility */}
                    <div style={{ display: 'none' }}>
                      <FormField
                        control={form.control}
                        name="profession"
                        render={({ field }) => <Input {...field} value={field.value || ""} />}
                      />
                      <FormField
                        control={form.control}
                        name="expectedSalary"
                        render={({ field }) => <Input {...field} value={field.value || ""} />}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => <Input {...field} value={field.value || "available"} />}
                      />
                      <FormField
                        control={form.control}
                        name="rating"
                        render={({ field }) => <Input {...field} value={field.value || ""} />}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => <Input {...field} value={field.value || ""} />}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center mt-8">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg"
                disabled={createCandidate.isPending || updateCandidate.isPending}
                data-testid="button-save-candidate"
              >
                {createCandidate.isPending || updateCandidate.isPending ? "שומר..." : candidate ? "עדכן מועמד" : "צור מועמד חדש"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
