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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedClient ? "עריכת לקוח" : "הוספת לקוח חדש"}
                  </DialogTitle>
                </DialogHeader>
                <ClientForm 
                  client={selectedClient}
                  onSuccess={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {clientsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientsData?.clients?.map((client: Client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-client-name-${client.id}`}>
                            {client.companyName}
                          </h3>
                          <p className="text-sm text-gray-600" data-testid={`text-client-contact-${client.id}`}>
                            איש קשר: {client.contactName}
                          </p>
                        </div>
                        <Badge className={client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {client.isActive ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="h-4 w-4 ml-2" />
                          <span data-testid={`text-client-email-${client.id}`}>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 ml-2" />
                            <span data-testid={`text-client-phone-${client.id}`}>{client.phone}</span>
                          </div>
                        )}
                        {client.industry && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building2 className="h-4 w-4 ml-2" />
                            <span data-testid={`text-client-industry-${client.id}`}>{client.industry}</span>
                          </div>
                        )}
                        {client.website && (
                          <div className="flex items-center text-sm text-blue-600">
                            <Globe className="h-4 w-4 ml-2" />
                            <a 
                              href={client.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                              data-testid={`link-client-website-${client.id}`}
                            >
                              אתר האינטרנט
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 space-x-reverse">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          data-testid={`button-edit-client-${client.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-client-${client.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {clientsData?.clients?.length === 0 && (
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
