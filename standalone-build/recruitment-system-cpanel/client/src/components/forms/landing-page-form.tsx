import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Upload, Image, Settings, Eye, Palette, FileText } from "lucide-react";
import type { JobWithClient } from "@shared/schema";

interface LandingPageFormProps {
  job: JobWithClient;
  onSuccess: () => void;
}

const defaultRequiredFields = ["firstName", "lastName", "email", "phone"];
const defaultOptionalFields = ["experience", "motivation", "cv"];

const landingPageSchema = z.object({
  benefits: z.string().optional(),
  companyDescription: z.string().optional(),
  requiredFields: z.array(z.string()).default(defaultRequiredFields),
  optionalFields: z.array(z.string()).default(defaultOptionalFields),
  showSalary: z.boolean().default(true),
  showCompanyName: z.boolean().default(true),
  landingPageActive: z.boolean().default(true),
});

const availableFields = [
  { id: "firstName", label: "שם פרטי", description: "שם פרטי של המועמד" },
  { id: "lastName", label: "שם משפחה", description: "שם משפחה של המועמד" },
  { id: "email", label: "אימייל", description: "כתובת אימייל ליצירת קשר" },
  { id: "phone", label: "טלפון", description: "מספר טלפון ליצירת קשר" },
  { id: "experience", label: "ניסיון רלוונטי", description: "תיאור הניסיון הרלוונטי למשרה" },
  { id: "motivation", label: "מוטיבציה", description: "מה מעניין במשרה הזו" },
  { id: "cv", label: "קורות חיים", description: "העלאת קובץ קורות חיים" },
  { id: "portfolio", label: "תיק עבודות", description: "קישור לתיק עבודות או אתר אישי" },
  { id: "availability", label: "זמינות", description: "מתי יכול להתחיל לעבוד" },
  { id: "expectedSalary", label: "ציפיות שכר", description: "ציפיות שכר חודשי" },
];

export default function LandingPageForm({ job, onSuccess }: LandingPageFormProps) {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(landingPageSchema),
    defaultValues: {
      benefits: job.benefits || "",
      companyDescription: job.companyDescription || "",
      requiredFields: job.requiredFields || defaultRequiredFields,
      optionalFields: job.optionalFields || defaultOptionalFields,
      showSalary: job.showSalary ?? true,
      showCompanyName: job.showCompanyName ?? true,
      landingPageActive: job.landingPageActive ?? true,
    },
  });

  const updateLandingPage = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
      
      // Add image if selected
      if (imageFile) {
        formData.append('landingImage', imageFile);
      }
      
      const response = await fetch(`/api/jobs/${job.id}/landing-settings`, {
        method: 'PUT',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to update landing page');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Clear all job-related caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}/public`] });
      
      // Force refetch of current job data
      queryClient.refetchQueries({ queryKey: ["/api/jobs"] });
      
      toast({
        title: "הצלחה",
        description: "דף הפרסום עודכן בהצלחה",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון דף הפרסום",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addField = (fieldId: string, toRequired: boolean = true) => {
    const currentRequired = form.getValues("requiredFields");
    const currentOptional = form.getValues("optionalFields");
    
    if (toRequired) {
      if (!currentRequired.includes(fieldId)) {
        form.setValue("requiredFields", [...currentRequired, fieldId]);
      }
      // Remove from optional if exists
      form.setValue("optionalFields", currentOptional.filter(id => id !== fieldId));
    } else {
      if (!currentOptional.includes(fieldId)) {
        form.setValue("optionalFields", [...currentOptional, fieldId]);
      }
      // Remove from required if exists
      form.setValue("requiredFields", currentRequired.filter(id => id !== fieldId));
    }
  };

  const removeField = (fieldId: string, fromRequired: boolean = true) => {
    if (fromRequired) {
      const currentRequired = form.getValues("requiredFields");
      form.setValue("requiredFields", currentRequired.filter(id => id !== fieldId));
    } else {
      const currentOptional = form.getValues("optionalFields");
      form.setValue("optionalFields", currentOptional.filter(id => id !== fieldId));
    }
  };

  const onSubmit = (data: any) => {
    updateLandingPage.mutate(data);
  };

  const requiredFields = form.watch("requiredFields");
  const optionalFields = form.watch("optionalFields");

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          עריכת דף פרסום - {job.title}
        </DialogTitle>
        <DialogDescription>
          התאם את דף הנחיתה שלך לקבלת מועמדות מקצועיות ומותאמות
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                תוכן
              </TabsTrigger>
              <TabsTrigger value="fields" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                שדות
              </TabsTrigger>
              <TabsTrigger value="design" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                עיצוב
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                📊
                סטטיסטיקות
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                תצוגה מקדימה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>תמונה לדף הפרסום</CardTitle>
                  <CardDescription>
                    העלה תמונה אטרקטיבית שתייצג את המשרה או החברה
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label htmlFor="landing-image" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>בחר תמונה</span>
                        </div>
                      </Label>
                      <Input
                        id="landing-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    
                    {(imagePreview || job.landingImage) && (
                      <div className="relative w-full max-w-md">
                        <img
                          src={imagePreview || (job.landingImage?.startsWith('http') ? job.landingImage : `/uploads/${job.landingImage}`)}
                          alt="תצוגה מקדימה"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setImagePreview(null);
                              setImageFile(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>תיאור החברה</CardTitle>
                  <CardDescription>
                    הוסף מידע על החברה שיעזור למועמדים להבין את הסביבה
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="companyDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="ספר על החברה, התרבות הארגונית, המשימה והחזון..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>דרישות המשרה</CardTitle>
                  <CardDescription>
                    פרט את הדרישות והכישורים הנדרשים למשרה
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="benefits"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="למשל: תואר ראשון במדעי המחשב, ניסיון של 3 שנים, ידע ב-React..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>שדות חובה</CardTitle>
                  <CardDescription>
                    שדות שהמועמד חייב למלא כדי להגיש מועמדות
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {requiredFields.map((fieldId) => {
                      const field = availableFields.find(f => f.id === fieldId);
                      return field ? (
                        <Badge key={fieldId} variant="destructive" className="flex items-center gap-1">
                          {field.label}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeField(fieldId, true)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>הוסף שדה חובה:</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableFields
                        .filter(field => !requiredFields.includes(field.id) && !optionalFields.includes(field.id))
                        .map((field) => (
                          <Button
                            key={field.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addField(field.id, true)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 ml-1" />
                            {field.label}
                          </Button>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>שדות אופציונליים</CardTitle>
                  <CardDescription>
                    שדות שהמועמד יכול למלא אבל לא חובה
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {optionalFields.map((fieldId) => {
                      const field = availableFields.find(f => f.id === fieldId);
                      return field ? (
                        <Badge key={fieldId} variant="secondary" className="flex items-center gap-1">
                          {field.label}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeField(fieldId, false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>הוסף שדה אופציונלי:</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableFields
                        .filter(field => !requiredFields.includes(field.id) && !optionalFields.includes(field.id))
                        .map((field) => (
                          <Button
                            key={field.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addField(field.id, false)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 ml-1" />
                            {field.label}
                          </Button>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>הגדרות תצוגה</CardTitle>
                  <CardDescription>
                    קבע איזה מידע להציג בדף הנחיתה
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="showSalary"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>הצג שכר</FormLabel>
                          <FormDescription>
                            האם להציג את טווח השכר בדף הנחיתה
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showCompanyName"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>הצג שם החברה</FormLabel>
                          <FormDescription>
                            האם להציג את שם החברה בדף הנחיתה
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="landingPageActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>דף נחיתה פעיל</FormLabel>
                          <FormDescription>
                            האם דף הנחיתה פתוח לקבלת מועמדויות
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📊
                    סטטיסטיקות דף הפרסום
                  </CardTitle>
                  <CardDescription>
                    צפה בנתונים על הביצועים של דף הנחיתה שלך
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">צפיות בדף</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {job.landingViews || 0}
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                          👁️
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">הגשות מועמדות</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {job.landingApplications || 0}
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                          📝
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">שיעור המרה</p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {job.landingViews > 0 ? 
                              Math.round(((job.landingApplications || 0) / job.landingViews) * 100) : 0}%
                          </p>
                        </div>
                        <div className="h-8 w-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                          📈
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">טיפים לשיפור הביצועים:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• הוסף תמונה אטרקטיבית לדף הנחיתה</li>
                      <li>• כתב תיאור חברה מעניין ומפורט</li>
                      <li>• הגדר דרישות ברורות ומדויקות</li>
                      <li>• שתף את הדף ברשתות חברתיות</li>
                      <li>• בדק את הדף במכשירים שונים</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    תצוגה מקדימה
                  </CardTitle>
                  <CardDescription>
                    כך דף הנחיתה ייראה למועמדים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-center mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(`/jobs/${job.id}/landing`, '_blank')}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        פתח בטאב חדש
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      לחץ על הכפתור לעיל כדי לראות את דף הנחיתה המלא במסך חדש
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={updateLandingPage.isPending}
            >
              {updateLandingPage.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}