import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertClientSchema, type InsertClient, type Client } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ClientFormProps {
  client?: Client | null;
  onSuccess: () => void;
}

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: client?.companyName || "",
      contactName: client?.contactName || "",
      email: client?.email || "",
      phone: client?.phone || "",
      address: client?.address || "",
      website: client?.website || "",
      industry: client?.industry || "",
      commissionRate: client?.commissionRate || undefined,
      paymentTerms: client?.paymentTerms || "",
      notes: client?.notes || "",
      isActive: client?.isActive ?? true,
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: InsertClient) => {
      await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "הצלחה",
        description: "הלקוח נוצר בהצלחה",
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
        description: "שגיאה ביצירת הלקוח",
        variant: "destructive",
      });
    },
  });

  const updateClient = useMutation({
    mutationFn: async (data: InsertClient) => {
      await apiRequest("PUT", `/api/clients/${client!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates/enriched"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "הצלחה",
        description: "הלקוח עודכן בהצלחה",
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
        description: "שגיאה בעדכון הלקוח",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertClient) => {
    if (client) {
      updateClient.mutate(data);
    } else {
      createClient.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>שם החברה *</FormLabel>
                <FormControl>
                  <Input placeholder="הכנס שם החברה" {...field} data-testid="input-company-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>איש קשר *</FormLabel>
                <FormControl>
                  <Input placeholder="שם איש הקשר" {...field} data-testid="input-contact-name" />
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
                <FormLabel>אימייל *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="example@company.com" {...field} data-testid="input-email" />
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
                <FormLabel>טלפון</FormLabel>
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
              <FormLabel>כתובת</FormLabel>
              <FormControl>
                <Input placeholder="כתובת החברה" {...field} value={field.value || ""} data-testid="input-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>אתר אינטרנט</FormLabel>
                <FormControl>
                  <Input placeholder="https://company.com" {...field} value={field.value || ""} data-testid="input-website" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>תחום פעילות</FormLabel>
                <FormControl>
                  <Input placeholder="הייטק, פיננסים, וכו'" {...field} value={field.value || ""} data-testid="input-industry" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="commissionRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>אחוז עמלה (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="15"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    data-testid="input-commission-rate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>תנאי תשלום</FormLabel>
                <FormControl>
                  <Input placeholder="שוטף+30, מראש, וכו'" {...field} value={field.value || ""} data-testid="input-payment-terms" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>הערות</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="הערות נוספות על הלקוח"
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-is-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>לקוח פעיל</FormLabel>
              </div>
            </FormItem>
          )}
        />

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
            disabled={createClient.isPending || updateClient.isPending}
            data-testid="button-save-client"
          >
            {createClient.isPending || updateClient.isPending ? "שומר..." : client ? "עדכן" : "שמור"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
