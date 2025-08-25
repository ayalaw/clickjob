import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, User, Users } from "lucide-react";

const candidateEmailSchema = z.object({
  to: z.string().email("כתובת אימייל לא תקינה"),
  cc: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
});

const interviewEmailSchema = z.object({
  jobTitle: z.string().min(1, "כותרת התפקיד נדרשת"),
  date: z.string().min(1, "תאריך נדרש"),
  time: z.string().min(1, "שעה נדרשת"),
  location: z.string().min(1, "מיקום נדרש"),
  interviewer: z.string().min(1, "שם המראיין נדרש"),
  notes: z.string().optional(),
});

const shortlistEmailSchema = z.object({
  to: z.string().email("כתובת אימייל לא תקינה"),
  cc: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  jobTitle: z.string().min(1, "כותרת התפקיד נדרשת"),
});

type EmailType = "candidate" | "interview" | "shortlist";

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: EmailType;
  candidateId?: string;
  candidateIds?: string[];
  candidateName?: string;
}

export function EmailDialog({
  isOpen,
  onClose,
  type,
  candidateId,
  candidateIds,
  candidateName,
}: EmailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms for different email types
  const candidateForm = useForm<z.infer<typeof candidateEmailSchema>>({
    resolver: zodResolver(candidateEmailSchema),
    defaultValues: {
      to: "",
      cc: "",
    },
  });

  const interviewForm = useForm<z.infer<typeof interviewEmailSchema>>({
    resolver: zodResolver(interviewEmailSchema),
    defaultValues: {
      jobTitle: "",
      date: "",
      time: "",
      location: "",
      interviewer: "",
      notes: "",
    },
  });

  const shortlistForm = useForm<z.infer<typeof shortlistEmailSchema>>({
    resolver: zodResolver(shortlistEmailSchema),
    defaultValues: {
      to: "",
      cc: "",
      jobTitle: "",
    },
  });

  // Mutations
  const sendCandidateProfileMutation = useMutation({
    mutationFn: async (data: { candidateId: string; to: string; cc?: string }) => {
      await apiRequest(`/api/emails/send-candidate-profile`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "נשלח בהצלחה! ✅",
        description: "פרופיל המועמד נשלח במייל",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחה",
        description: error.message || "לא ניתן לשלוח את המייל",
        variant: "destructive",
      });
    },
  });

  const sendInterviewInvitationMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest(`/api/emails/send-interview-invitation`, {
        method: "POST",
        body: JSON.stringify({ candidateId, ...data }),
      });
    },
    onSuccess: () => {
      toast({
        title: "הזמנה נשלחה! ✅",
        description: "הזמנה לראיון נשלחה למועמד",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחה",
        description: error.message || "לא ניתן לשלוח את ההזמנה",
        variant: "destructive",
      });
    },
  });

  const sendShortlistMutation = useMutation({
    mutationFn: async (data: { to: string; cc?: string; jobTitle: string }) => {
      await apiRequest(`/api/emails/send-candidate-shortlist`, {
        method: "POST",
        body: JSON.stringify({ candidateIds, ...data }),
      });
    },
    onSuccess: () => {
      toast({
        title: "רשימה נשלחה! ✅",
        description: "רשימת המועמדים נשלחה במייל",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחה",
        description: error.message || "לא ניתן לשלוח את הרשימה",
        variant: "destructive",
      });
    },
  });

  const handleCandidateSubmit = (data: z.infer<typeof candidateEmailSchema>) => {
    if (candidateId) {
      sendCandidateProfileMutation.mutate({
        candidateId,
        to: data.to,
        cc: data.cc || undefined,
      });
    }
  };

  const handleInterviewSubmit = (data: z.infer<typeof interviewEmailSchema>) => {
    sendInterviewInvitationMutation.mutate(data);
  };

  const handleShortlistSubmit = (data: z.infer<typeof shortlistEmailSchema>) => {
    sendShortlistMutation.mutate({
      to: data.to,
      cc: data.cc || undefined,
      jobTitle: data.jobTitle,
    });
  };

  const getTitle = () => {
    switch (type) {
      case "candidate":
        return `שליחת פרופיל מועמד: ${candidateName}`;
      case "interview":
        return `הזמנה לראיון: ${candidateName}`;
      case "shortlist":
        return `שליחת רשימת מועמדים (${candidateIds?.length || 0})`;
      default:
        return "שליחת מייל";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "candidate":
        return <User className="h-4 w-4" />;
      case "interview":
        return <Mail className="h-4 w-4" />;
      case "shortlist":
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {type === "candidate" && "שלח את פרופיל המועמד במייל"}
            {type === "interview" && "שלח הזמנה לראיון עבודה"}
            {type === "shortlist" && "שלח רשימת מועמדים מקוצרת"}
          </DialogDescription>
        </DialogHeader>

        {type === "candidate" && (
          <Form {...candidateForm}>
            <form onSubmit={candidateForm.handleSubmit(handleCandidateSubmit)} className="space-y-4">
              <FormField
                control={candidateForm.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אימייל נמען *</FormLabel>
                    <FormControl>
                      <Input placeholder="example@company.com" {...field} data-testid="input-email-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={candidateForm.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>עותק (CC)</FormLabel>
                    <FormControl>
                      <Input placeholder="manager@company.com" {...field} data-testid="input-email-cc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={sendCandidateProfileMutation.isPending}
                  data-testid="button-send-candidate-email"
                >
                  <Send className="h-4 w-4 ml-2" />
                  {sendCandidateProfileMutation.isPending ? "שולח..." : "שלח פרופיל"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {type === "interview" && (
          <Form {...interviewForm}>
            <form onSubmit={interviewForm.handleSubmit(handleInterviewSubmit)} className="space-y-4">
              <FormField
                control={interviewForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תפקיד *</FormLabel>
                    <FormControl>
                      <Input placeholder="מפתח תוכנה" {...field} data-testid="input-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={interviewForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תאריך *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-interview-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={interviewForm.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שעה *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-interview-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={interviewForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מיקום הראיון *</FormLabel>
                    <FormControl>
                      <Input placeholder="משרדי החברה, תל אביב" {...field} data-testid="input-interview-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={interviewForm.control}
                name="interviewer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מראיין *</FormLabel>
                    <FormControl>
                      <Input placeholder="שם המראיין" {...field} data-testid="input-interviewer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={interviewForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות נוספות</FormLabel>
                    <FormControl>
                      <Textarea placeholder="הערות או הנחיות מיוחדות..." {...field} data-testid="textarea-interview-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={sendInterviewInvitationMutation.isPending}
                  data-testid="button-send-interview-invitation"
                >
                  <Send className="h-4 w-4 ml-2" />
                  {sendInterviewInvitationMutation.isPending ? "שולח..." : "שלח הזמנה"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {type === "shortlist" && (
          <Form {...shortlistForm}>
            <form onSubmit={shortlistForm.handleSubmit(handleShortlistSubmit)} className="space-y-4">
              <FormField
                control={shortlistForm.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אימייל נמען *</FormLabel>
                    <FormControl>
                      <Input placeholder="example@company.com" {...field} data-testid="input-shortlist-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shortlistForm.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>עותק (CC)</FormLabel>
                    <FormControl>
                      <Input placeholder="manager@company.com" {...field} data-testid="input-shortlist-cc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shortlistForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כותרת התפקיד *</FormLabel>
                    <FormControl>
                      <Input placeholder="מפתח תוכנה" {...field} data-testid="input-shortlist-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={sendShortlistMutation.isPending}
                  data-testid="button-send-shortlist"
                >
                  <Send className="h-4 w-4 ml-2" />
                  {sendShortlistMutation.isPending ? "שולח..." : "שלח רשימה"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}