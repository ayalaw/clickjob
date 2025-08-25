import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ClientForm from "@/components/forms/client-form";
import SearchFilter from "@/components/search-filter";
import { Plus, Search, Phone, Mail, Globe, Building2, Edit, Trash2 } from "lucide-react";
import type { Client } from "@shared/schema";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: clientsData, isLoading: clientsLoading } = useQuery<{ clients: Client[]; total: number }>({
    queryKey: ["/api/clients", { search }],
    enabled: isAuthenticated,
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "הצלחה",
        description: "הלקוח נמחק בהצלחה",
      });
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
        description: "שגיאה במחיקת הלקוח",
        variant: "destructive",
      });
    },
  });

  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm("האם אתה בטוח שברצונך למחוק את הלקוח?")) {
      deleteClient.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header title="מאגר לקוחות" />
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="חיפוש לקוחות..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                  data-testid="input-search-clients"
                />
              </div>
              <SearchFilter />
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAddClient}
                  className="btn-primary"
                  data-testid="button-add-client"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף לקוח
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="sr-only">
                  <DialogTitle>
                    {selectedClient ? "עריכת לקוח" : "הוספת לקוח חדש"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedClient ? "ערוך פרטי הלקוח" : "הוסף לקוח חדש למאגר"}
                  </DialogDescription>
                </DialogHeader>
                <ClientForm 
                  client={selectedClient}
                  onSuccess={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {clientsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {clientsData?.clients && clientsData.clients.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900">
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">מק"ח</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">שם</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">לחזור</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">תחום</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientsData.clients.map((client: Client) => (
                        <TableRow key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700" data-testid={`row-client-${client.id}`}>
                          <TableCell data-testid={`text-client-contact-${client.id}`}>
                            {client.contactName || "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-secondary dark:text-white" data-testid={`text-client-name-${client.id}`}>
                                {client.companyName}
                              </p>
                              {client.email && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {client.email}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={client.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}>
                              {client.isActive ? 'לחזור' : 'הושלם'}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-client-industry-${client.id}`}>
                            {client.industry || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClient(client)}
                                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                data-testid={`button-edit-client-${client.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClient(client.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                data-testid={`button-delete-client-${client.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">לא נמצאו לקוחות</p>
                  <Button 
                    onClick={handleAddClient}
                    className="mt-4 btn-primary"
                    data-testid="button-add-first-client"
                  >
                    הוסף לקוח ראשון
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
