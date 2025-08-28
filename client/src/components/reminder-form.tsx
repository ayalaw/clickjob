import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const reminderSchema = z.object({
  title: z.string().min(1, "כותרת נדרשת"),
  description: z.string().optional(),
  reminderDate: z.string().min(1, "תאריך תזכורת נדרש"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

type ReminderFormData = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  candidateId?: string;
  jobId?: string;
  clientId?: string;
  onSuccess?: () => void;
}

export function ReminderForm({ candidateId, jobId, clientId, onSuccess }: ReminderFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      description: "",
      reminderDate: "",
      priority: "medium",
    },
  });

  const onSubmit = async (data: ReminderFormData) => {
    setIsSubmitting(true);
    try {
      await apiRequest('POST', '/api/reminders', {
        ...data,
        candidateId,
        jobId,
        clientId,
      });

      toast({
        title: "הצלחה",
        description: "התזכורת נוצרה בהצלחה",
      });

      form.reset();
      setIsOpen(false);
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת התזכורת",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'נמוכה';
      case 'medium': return 'בינונית';
      case 'high': return 'גבוהה';
      default: return priority;
    }
  };

  // Format date for datetime-local input
  const formatDateForInput = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-create-reminder">
          <Bell className="w-4 h-4 ml-2" />
          יצירת תזכורת
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">יצירת תזכורת חדשה</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כותרת התזכורת *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="הזן כותרת לתזכורת"
                      dir="rtl"
                      data-testid="input-reminder-title"
                    />
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
                  <FormLabel>תיאור</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="תיאור נוסף (אופציונלי)"
                      dir="rtl"
                      rows={3}
                      data-testid="textarea-reminder-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>תאריך ושעת תזכורת *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      min={formatDateForInput()}
                      data-testid="input-reminder-date"
                    />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-reminder-priority">
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

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-submit-reminder"
              >
                {isSubmitting ? "יוצר..." : "יצירת תזכורת"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                data-testid="button-cancel-reminder"
              >
                ביטול
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}