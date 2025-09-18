import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertJobSchema, type InsertJob, type JobWithClient, type Client } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { X } from "lucide-react";

interface JobFormProps {
  job?: JobWithClient | null;
  onSuccess: () => void;
}

export default function JobForm({ job, onSuccess }: JobFormProps) {
  const { toast } = useToast();
  const [additionalCodesInput, setAdditionalCodesInput] = useState("");

  const { data: clientsData } = useQuery<{ clients: Client[]; total: number }>({
    queryKey: ["/api/clients"],
  });

  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: job?.title || "",
      description: job?.description || "",
      requirements: job?.requirements || "",
      location: job?.location || "",
      salaryRange: job?.salaryRange || "",
      jobType: job?.jobType || "",
      isRemote: job?.isRemote || false,
      status: job?.status || "active",
      priority: job?.priority || "medium",
      deadline: job?.deadline ? new Date(job.deadline).toISOString().split('T')[0] : undefined,
      clientId: job?.clientId || "",
      positions: job?.positions || 1,
      additionalCodes: job?.additionalCodes || [],
    },
  });

  const createJob = useMutation({
    mutationFn: async (data: InsertJob) => {
      await apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "הצלחה",
        description: "המשרה נוצרה בהצלחה",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת המשרה",
        variant: "destructive",
      });
    },
  });

  const updateJob = useMutation({
    mutationFn: async (data: InsertJob) => {
      await apiRequest("PUT", `/api/jobs/${job!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "הצלחה",
        description: "המשרה עודכנה בהצלחה",
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
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "שגיאה",
        description: "שגיאה בעדכון המשרה",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Convert deadline to Date if provided
    const submitData = {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : null,
      requirements: data.requirements || null,
      location: data.location || null,
      salaryRange: data.salaryRange || null,
      jobType: data.jobType || null,
      priority: data.priority || "medium",
      additionalCodes: data.additionalCodes || [],
    };

    if (job) {
      updateJob.mutate(submitData);
    } else {
      createJob.mutate(submitData);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto pt-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
            <span>לקוחות</span>
            <span>›</span>
            <span>אימון פיתוח</span>
            <span>›</span>
            <span className="text-gray-600">משרה חדשה</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">פרסום משרה</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* פרטי משרה */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-3 border-b border-blue-600">
                פרטי משרה
                <span className="text-sm text-blue-600 font-normal mr-4">אימון פיתוח</span>
              </h2>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">שם תפקיד:</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-job-title" className="text-right" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">תאריך סיום:</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-deadline"
                            className="text-right"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">*לקוח נשרת ראשית:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client" className="text-right">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientsData?.clients?.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">סוג נשרת תפקידי:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-job-type" className="text-right">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full-time">משרה מלאה</SelectItem>
                          <SelectItem value="part-time">משרה חלקית</SelectItem>
                          <SelectItem value="contract">חוזה</SelectItem>
                          <SelectItem value="freelance">פרילנס</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="positions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">*מיועש קטני:</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          data-testid="input-positions"
                          className="text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">קודים נוספים (אופציונלי):</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              value={additionalCodesInput}
                              onChange={(e) => setAdditionalCodesInput(e.target.value)}
                              placeholder="הקלד קוד נוסף"
                              className="text-right"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && additionalCodesInput.trim()) {
                                  e.preventDefault();
                                  const currentCodes = field.value || [];
                                  if (!currentCodes.includes(additionalCodesInput.trim())) {
                                    field.onChange([...currentCodes, additionalCodesInput.trim()]);
                                    setAdditionalCodesInput("");
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                if (additionalCodesInput.trim()) {
                                  const currentCodes = field.value || [];
                                  if (!currentCodes.includes(additionalCodesInput.trim())) {
                                    field.onChange([...currentCodes, additionalCodesInput.trim()]);
                                    setAdditionalCodesInput("");
                                  }
                                }
                              }}
                            >
                              הוסף
                            </Button>
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {field.value.map((code: string, index: number) => (
                                <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                  <span>{code}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newCodes = field.value.filter((_: string, i: number) => i !== index);
                                      field.onChange(newCodes);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">*תיאור:</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="textarea-job-description"
                          className="min-h-[120px] text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">*תאור נשרת פנימיות:</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="textarea-job-requirements"
                          className="min-h-[120px] text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRemote"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-remote"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>האם נערכה פגישת בעלים ראשונים</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* עדות אדמיניסטרטיביים */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">עדות אדמיניסטרטיביים</h2>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">רמת צניון אנטיביו:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-job-priority" className="text-right">
                            <SelectValue placeholder="טלפוני" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">נמוכה</SelectItem>
                          <SelectItem value="medium">בינונית</SelectItem>
                          <SelectItem value="high">גבוהה</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">יסטת שלווה:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-job-status" className="text-right">
                            <SelectValue placeholder="האייל" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">פעילה</SelectItem>
                          <SelectItem value="paused">מושהית</SelectItem>
                          <SelectItem value="closed">סגורה</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">שילוח תחתותני:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="כן" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">כן</SelectItem>
                          <SelectItem value="no">לא</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">רכב עטמני:</FormLabel>
                      <Select>
                        <FormControl>
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="option1">אופציה 1</SelectItem>
                          <SelectItem value="option2">אופציה 2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1">
                  <FormItem>
                    <FormLabel className="text-right">רכב תוכן:</FormLabel>
                    <Select>
                      <FormControl>
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="option1">אופציה 1</SelectItem>
                        <SelectItem value="option2">אופציה 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                </div>

                <div>
                  <FormLabel className="text-right">תקים פתוחים:</FormLabel>
                  <Input className="mt-2 text-right" />
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox />
                    <span>נשרת רחוקה</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox />
                    <span>נשרת מופר טלפוני</span>
                  </div>
                </div>
              </div>
            </div>

            {/* כפתור שמירה */}
            <div className="flex justify-center">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg"
                disabled={createJob.isPending || updateJob.isPending}
                data-testid="button-save-job"
              >
                {createJob.isPending || updateJob.isPending ? "שומר..." : job ? "עדכן משרה" : "צור משרה המזל"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
