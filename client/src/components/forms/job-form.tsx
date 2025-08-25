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

interface JobFormProps {
  job?: JobWithClient | null;
  onSuccess: () => void;
}

export default function JobForm({ job, onSuccess }: JobFormProps) {
  const { toast } = useToast();

  const { data: clientsData } = useQuery({
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
    },
  });

  const createJob = useMutation({
    mutationFn: async (data: InsertJob) => {
      await apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
          window.location.href = "/api/login";
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
          window.location.href = "/api/login";
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
    };

    if (job) {
      updateJob.mutate(submitData);
    } else {
      createJob.mutate(submitData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>כותרת המשרה *</FormLabel>
              <FormControl>
                <Input placeholder="מפתח Full Stack Senior" {...field} data-testid="input-job-title" />
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
              <FormLabel>תיאור המשרה *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="תיאור מפורט של המשרה, האחריות והמטלות"
                  className="min-h-[120px]"
                  {...field}
                  data-testid="textarea-job-description"
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
              <FormLabel>דרישות המשרה</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="השכלה, ניסיון, כישורים טכניים נדרשים"
                  className="min-h-[100px]"
                  {...field}
                  data-testid="textarea-job-requirements"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מיקום</FormLabel>
                <FormControl>
                  <Input placeholder="תל אביב, רמת גן, וכו'" {...field} data-testid="input-job-location" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salaryRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>טווח שכר</FormLabel>
                <FormControl>
                  <Input placeholder="₪15,000-₪25,000" {...field} data-testid="input-salary-range" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jobType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>סוג משרה</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-job-type">
                      <SelectValue placeholder="בחר סוג משרה" />
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
                <FormLabel>מספר משרות פתוחות</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="1"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                    data-testid="input-positions"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isRemote"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-remote"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>עבודה מהבית</FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>סטטוס המשרה</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-job-status">
                      <SelectValue placeholder="בחר סטטוס" />
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>עדיפות</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-job-priority">
                      <SelectValue placeholder="בחר עדיפות" />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>לקוח</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="בחר לקוח" />
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
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>תאריך יעד</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    data-testid="input-deadline"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse">
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
            className="btn-primary"
            disabled={createJob.isPending || updateJob.isPending}
            data-testid="button-save-job"
          >
            {createJob.isPending || updateJob.isPending ? "שומר..." : job ? "עדכן" : "שמור"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
