import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertClientSchema, insertClientContactSchema, type InsertClient, type Client, type ClientContact, type InsertClientContact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface ClientFormProps {
  client?: Client | null;
  onSuccess: () => void;
}

export default function ClientForm({ client, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<InsertClientContact[]>([]);

  // Load existing contacts for edit mode
  const { data: existingContacts = [] } = useQuery({
    queryKey: ["/api/clients", client?.id, "contacts"],
    queryFn: async () => {
      if (client?.id) {
        const result = await apiRequest("GET", `/api/clients/${client.id}/contacts`);
        return result as ClientContact[];
      }
      return [];
    },
    enabled: !!client?.id,
  });

  // Initialize contacts when existing contacts are loaded
  useEffect(() => {
    if (existingContacts.length > 0) {
      setContacts(existingContacts.map(contact => ({
        name: contact.name,
        phone: contact.phone || "",
        email: contact.email || "",
        position: contact.position || "",
        clientId: contact.clientId,
      })));
    }
  }, [existingContacts]);

  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: client?.companyName || "",
      address: client?.address || "",
      documents: client?.documents || [],
      // Legacy fields for compatibility
      contactName: client?.contactName || "",
      email: client?.email || "",
      phone: client?.phone || "",
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
          window.location.href = "/api/login";
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
          window.location.href = "/api/login";
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

  // Contact management functions
  const addContact = () => {
    setContacts([...contacts, {
      name: "",
      phone: "",
      email: "",
      position: "",
      clientId: "", // Will be set after client creation
    }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof InsertClientContact, value: string) => {
    setContacts(contacts.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  // Save contacts after client is created/updated
  const saveContacts = async (clientId: string) => {
    try {
      // Delete existing contacts (for edit mode)
      if (client?.id) {
        for (const existingContact of existingContacts) {
          await apiRequest("DELETE", `/api/client-contacts/${existingContact.id}`);
        }
      }

      // Create new contacts
      for (const contact of contacts) {
        if (contact.name.trim()) { // Only save contacts with names
          await apiRequest("POST", `/api/clients/${clientId}/contacts`, {
            ...contact,
            clientId,
          });
        }
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשמירת אנשי הקשר",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: InsertClient) => {
    try {
      if (client) {
        await updateClient.mutateAsync(data);
        await saveContacts(client.id);
      } else {
        const newClient = await createClient.mutateAsync(data);
        if (newClient && typeof newClient === 'object' && 'id' in newClient) {
          await saveContacts(newClient.id as string);
        }
      }
    } catch (error) {
      // Error handling is already done in the mutations
      console.error("Error in form submission:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* שם החברה */}
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

        {/* כתובת */}
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

        {/* Client Contacts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">אנשי קשר</h3>
            <Button
              type="button"
              onClick={addContact}
              variant="outline"
              size="sm"
              data-testid="button-add-contact"
            >
              <Plus className="h-4 w-4 ml-2" />
              הוסף איש קשר
            </Button>
          </div>

          {contacts.map((contact, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4" data-testid={`contact-card-${index}`}>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">איש קשר {index + 1}</h4>
                <Button
                  type="button"
                  onClick={() => removeContact(index)}
                  variant="outline"
                  size="sm"
                  data-testid={`button-remove-contact-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">שם *</label>
                  <Input
                    placeholder="שם איש הקשר"
                    value={contact.name}
                    onChange={(e) => updateContact(index, "name", e.target.value)}
                    data-testid={`input-contact-name-${index}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">תפקיד</label>
                  <Input
                    placeholder="תפקיד (מנהל משאבי אנוש, מנכ״ל וכו')"
                    value={contact.position}
                    onChange={(e) => updateContact(index, "position", e.target.value)}
                    data-testid={`input-contact-position-${index}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">אימייל</label>
                  <Input
                    type="email"
                    placeholder="example@company.com"
                    value={contact.email}
                    onChange={(e) => updateContact(index, "email", e.target.value)}
                    data-testid={`input-contact-email-${index}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">טלפון</label>
                  <Input
                    placeholder="050-1234567"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    data-testid={`input-contact-phone-${index}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* הוספת מסמכים */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">הוספת מסמכים</h3>
          <p className="text-sm text-gray-600">העלה מסמכים רלוונטיים ללקוח כמו הסכם סרוק או מסמכים נוספים</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              id="documents-upload"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                console.log("קבצים נבחרו:", files.map(f => f.name));
                // כאן נוסיף לוגיקה להעלאת קבצים בעתיד
              }}
              data-testid="input-documents"
            />
            <label htmlFor="documents-upload" className="cursor-pointer">
              <div className="text-gray-500">
                <div className="text-lg mb-2">📄</div>
                <div>לחץ כאן להעלאת מסמכים</div>
                <div className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG</div>
              </div>
            </label>
          </div>
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
