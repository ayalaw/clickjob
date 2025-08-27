import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Plus, Edit, Trash2 } from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  icon: string;
  createdAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templateIcon, setTemplateIcon] = useState("");

  // Query for getting all templates
  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: ['/api/message-templates'],
    queryFn: () => apiRequest('GET', '/api/message-templates'),
  });

  const templates = Array.isArray(templatesResponse) ? templatesResponse : [];

  // Mutation for creating/updating templates
  const saveMutation = useMutation({
    mutationFn: async (templateData: { name: string; content: string; icon: string }) => {
      if (editingTemplate) {
        return apiRequest('PUT', `/api/message-templates/${editingTemplate.id}`, templateData);
      } else {
        return apiRequest('POST', '/api/message-templates', templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/message-templates'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "תבנית נשמרה",
        description: editingTemplate ? "התבנית עודכנה בהצלחה" : "תבנית חדשה נוצרה בהצלחה",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את התבנית",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting templates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/message-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/message-templates'] });
      toast({
        title: "תבנית נמחקה",
        description: "התבנית נמחקה בהצלחה",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את התבנית",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setTemplateName("");
    setTemplateContent("");
    setTemplateIcon("");
    setEditingTemplate(null);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setTemplateIcon(template.icon);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      name: templateName,
      content: templateContent,
      icon: templateIcon || "💬"
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("האם אתה בטוח שאתה רוצה למחוק תבנית זו?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-6 h-6" />
          <h1 className="text-2xl font-bold">הגדרות מערכת</h1>
        </div>
        <p className="text-gray-600">נהל תבניות הודעות למועמדים</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>תבניות הודעות וואטסאפ</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  תבנית חדשה
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "ערוך תבנית" : "תבנית חדשה"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">שם התבנית</Label>
                      <Input
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="לדוגמה: זימון לראיון"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="templateIcon">אימוג'י</Label>
                      <Input
                        id="templateIcon"
                        value={templateIcon}
                        onChange={(e) => setTemplateIcon(e.target.value)}
                        placeholder="📅"
                        className="text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="templateContent">תוכן ההודעה</Label>
                    <textarea
                      id="templateContent"
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      className="w-full h-60 p-3 border rounded-md resize-none text-sm leading-relaxed"
                      dir="rtl"
                      placeholder="שלום {שם המועמד} 👋

תוכן ההודעה כאן...

צוות הגיוס"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      השתמש ב-{"{שם המועמד}"} להכנסת שם המועמד אוטומטית
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      ביטול
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? "שומר..." : "שמור"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>אין תבניות עדיין</p>
                <p className="text-sm">לחץ על "תבנית חדשה" כדי ליצור תבנית ראשונה</p>
              </div>
            ) : (
              templates.map((template: MessageTemplate) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{template.icon}</span>
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-line max-h-32 overflow-y-auto">
                        {template.content}
                      </div>
                    </div>
                    <div className="flex gap-2 mr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}