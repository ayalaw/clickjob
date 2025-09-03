import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertJobSchema, type InsertJob, type JobWithClient, type Client, type ClientContact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface JobFormProps {
  job?: JobWithClient | null;
  onSuccess: () => void;
}

export default function JobForm({ job, onSuccess }: JobFormProps) {
  const { toast } = useToast();
  const [additionalCodesInput, setAdditionalCodesInput] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(job?.clientId || "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(job?.selectedContactIds || []);

  const { data: clientsData } = useQuery<{ clients: Client[]; total: number }>({
    queryKey: ["/api/clients"],
  });

  // Load client contacts when a client is selected
  const { data: clientContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", selectedClientId, "contacts"],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const result = await apiRequest("GET", `/api/clients/${selectedClientId}/contacts`);
      return result as ClientContact[];
    },
    enabled: !!selectedClientId,
  });

  const form = useForm({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: job?.title || "",
      description: job?.description || "",
      requirements: job?.requirements || "",
      recruiterNotes: job?.recruiterNotes || "",
      additionalCode: job?.additionalCode || "",
      clientId: job?.clientId || "",
      selectedContactIds: job?.selectedContactIds || [],
      isUrgent: job?.isUrgent || false,
      isSuperUrgent: job?.isSuperUrgent || false,
      workMethod: job?.workMethod || "interview",
      status: job?.status || "active",
    },
  });

  // Update selected client when client changes
  useEffect(() => {
    const clientId = form.watch("clientId");
    if (clientId !== selectedClientId) {
      setSelectedClientId(clientId);
      setSelectedContactIds([]); // Reset selected contacts when client changes
      form.setValue("selectedContactIds", []);
    }
  }, [form.watch("clientId")]);

  // Update form when selectedContactIds change
  useEffect(() => {
    form.setValue("selectedContactIds", selectedContactIds);
  }, [selectedContactIds]);

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

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
    const submitData = {
      ...data,
      requirements: data.requirements || null,
      recruiterNotes: data.recruiterNotes || null,
      additionalCode: data.additionalCode || null,
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
                {/* בחירת לקוח */}
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">בחירת לקוח:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client" className="text-right">
                            <SelectValue placeholder="בחר לקוח מהרשימה" />
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

                {/* קוד משרה נוסף */}
                <FormField
                  control={form.control}
                  name="additionalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">קוד משרה נוסף (ידני):</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-additional-code" className="text-right" placeholder="קוד נוסף למשרה" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* כותרת המשרה */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">כותרת המשרה:</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-job-title" className="text-right" placeholder="הזן כותרת למשרה" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Contacts Selection */}
                {selectedClientId && clientContacts.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <FormLabel className="text-right">אנשי קשר לקבלת מועמדים:</FormLabel>
                      <p className="text-sm text-gray-600 mt-1">בחר את אנשי הקשר שיקבלו את המועמדים במייל</p>
                    </div>
                    <div className="space-y-2" data-testid="contacts-selection">
                      {clientContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={contact.id}
                            checked={selectedContactIds.includes(contact.id)}
                            onCheckedChange={() => handleContactToggle(contact.id)}
                            data-testid={`checkbox-contact-${contact.id}`}
                          />
                          <label 
                            htmlFor={contact.id} 
                            className="text-sm cursor-pointer flex-1"
                            data-testid={`label-contact-${contact.id}`}
                          >
                            <span className="font-medium">{contact.name}</span>
                            {contact.position && <span className=" text-gray-600"> - {contact.position}</span>}
                            {contact.email && <span className="text-gray-500 block text-xs">{contact.email}</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedContactIds.length === 0 && (
                      <p className="text-sm text-orange-600">לא נבחרו אנשי קשר - הודעות יישלחו לכתובת הלקוח הראשית</p>
                    )}
                  </div>
                )}

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

                {/* תיאור המשרה */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">תיאור המשרה:</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="textarea-job-description"
                          className="min-h-[120px] text-right"
                          placeholder="תאר את המשרה בפירוט"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* דרישות המשרה */}
                <FormField
                  control={form.control}
                  name="requirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">דרישות המשרה:</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="textarea-job-requirements"
                          className="min-h-[120px] text-right"
                          placeholder="פרט את הדרישות מהמועמד"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* הערות לרכזים */}
                <FormField
                  control={form.control}
                  name="recruiterNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-right">הערות לרכזים:</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          data-testid="textarea-recruiter-notes"
                          className="min-h-[120px] text-right"
                          placeholder="הערות פנימיות לרכזי הגיוס"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* רמת דחיפות */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">רמת דחיפות</h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* כפתור משרה דחופה */}
                  <FormField
                    control={form.control}
                    name="isUrgent"
                    render={({ field }) => (
                      <FormItem>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          className={`px-6 py-3 ${field.value ? 'bg-green-500 hover:bg-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                          onClick={() => {
                            field.onChange(!field.value);
                            if (!field.value) {
                              // אם בוחרים דחופה, מבטלים סופר דחופה
                              form.setValue("isSuperUrgent", false);
                            }
                          }}
                          data-testid="button-urgent"
                        >
                          {field.value ? "✓ " : ""}משרה דחופה
                        </Button>
                      </FormItem>
                    )}
                  />

                  {/* כפתור משרה סופר דחופה */}
                  <FormField
                    control={form.control}
                    name="isSuperUrgent"
                    render={({ field }) => (
                      <FormItem>
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          className={`px-6 py-3 ${field.value ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-500 text-red-600 hover:bg-red-50'}`}
                          onClick={() => {
                            field.onChange(!field.value);
                            if (!field.value) {
                              // אם בוחרים סופר דחופה, מבטלים דחופה רגילה
                              form.setValue("isUrgent", false);
                            }
                          }}
                          data-testid="button-super-urgent"
                        >
                          {field.value ? "✓ " : ""}משרה סופר דחופה!
                        </Button>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="text-sm text-gray-600">
                  {form.watch("isUrgent") && !form.watch("isSuperUrgent") && (
                    <p className="text-green-600">• משרה דחופה תופיע בירוק בהיר בראש הדף</p>
                  )}
                  {form.watch("isSuperUrgent") && (
                    <p className="text-red-600">• משרה סופר דחופה תופיע באדום בהיר בעמוד הראיונות</p>
                  )}
                  {!form.watch("isUrgent") && !form.watch("isSuperUrgent") && (
                    <p className="text-gray-500">• לחץ על כפתור לסימון רמת דחיפות</p>
                  )}
                </div>
              </div>
            </div>

            {/* שיטת עבודה עם הלקוח */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">שיטת עבודה עם הלקוח</h2>

              <FormField
                control={form.control}
                name="workMethod"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <input
                          type="radio"
                          id="interview"
                          value="interview"
                          checked={field.value === "interview"}
                          onChange={() => field.onChange("interview")}
                          className="w-4 h-4 text-blue-600"
                          data-testid="radio-interview"
                        />
                        <label htmlFor="interview" className="text-sm font-medium">
                          <span className="font-semibold">ראיון</span>
                          <span className="text-gray-600 block text-xs">המועמד יועבר לדף ראיונות כמו עכשיו ללא שינוי</span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-3 space-x-reverse">
                        <input
                          type="radio"
                          id="automatic"
                          value="automatic"
                          checked={field.value === "automatic"}
                          onChange={() => field.onChange("automatic")}
                          className="w-4 h-4 text-green-600"
                          data-testid="radio-automatic"
                        />
                        <label htmlFor="automatic" className="text-sm font-medium">
                          <span className="font-semibold">אוטומטי</span>
                          <span className="text-gray-600 block text-xs">נשלח ללקוח כל מועמד שמגיש מועמדות למשרה באופן אוטומטי</span>
                        </label>
                      </div>

                      <div className="flex items-center space-x-3 space-x-reverse opacity-50 cursor-not-allowed">
                        <input
                          type="radio"
                          id="bot"
                          value="bot"
                          disabled
                          className="w-4 h-4 text-gray-400"
                        />
                        <label htmlFor="bot" className="text-sm font-medium text-gray-400">
                          <span className="font-semibold">בוט ראיונות</span>
                          <span className="block text-xs">לא פעיל כרגע</span>
                        </label>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
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
