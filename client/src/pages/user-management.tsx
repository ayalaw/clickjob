import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePermissions, type UserWithRoles, type Role } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Shield, Users, Plus } from "lucide-react";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canManageUsers, canManageRoles, allRoles, isLoading: permissionsLoading } = usePermissions();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("");

  // Get all users with their roles
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['/api/users/all'],
    enabled: canManageUsers,
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await apiRequest('POST', `/api/users/${userId}/roles`, { roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      toast({
        title: "התפקיד נוסף בהצלחה",
        description: "התפקיד הוקצה למשתמש",
      });
    },
    onError: (error) => {
      console.error('Error assigning role:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן היה להקצות את התפקיד",
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await apiRequest('DELETE', `/api/users/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      toast({
        title: "התפקיד הוסר בהצלחה",
        description: "התפקיד הוסר מהמשתמש",
      });
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן היה להסיר את התפקיד",
        variant: "destructive",
      });
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: { email: string; firstName?: string; lastName?: string; roleId?: string }) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      setIsAddUserDialogOpen(false);
      resetAddUserForm();
      toast({
        title: "המשתמש נוסף בהצלחה",
        description: response.emailSent 
          ? "המשתמש החדש נוצר במערכת ומייל עם פרטי הכניסה נשלח"
          : "המשתמש החדש נוצר במערכת (שליחת המייל נכשלה)",
        variant: response.emailSent ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      console.error('Error adding user:', error);
      const errorMessage = error?.message?.includes('already exists') 
        ? "משתמש עם כתובת מייל זו כבר קיים במערכת"
        : "לא ניתן היה להוסיף את המשתמש";
      
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      toast({
        title: "המשתמש נמחק בהצלחה",
        description: "המשתמש והתפקידים שלו הוסרו מהמערכת",
      });
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      const errorMessage = error?.message?.includes('Cannot delete your own account') 
        ? "לא ניתן למחוק את החשבון שלך"
        : error?.message?.includes('Only Super Admin') 
        ? "רק מנהל מערכת יכול למחוק משתמשים עם תפקידי מנהל"
        : "לא ניתן היה למחוק את המשתמש";
      
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (!canManageUsers) {
    return (
      <div className="container mx-auto p-4" dir="rtl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">אין הרשאה</h3>
              <p className="text-muted-foreground">אין לך הרשאה לצפות בדף זה</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (permissionsLoading || usersLoading) {
    return (
      <div className="container mx-auto p-4" dir="rtl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">טוען...</p>
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadgeVariant = (roleType: string) => {
    switch (roleType) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleAssignRole = () => {
    if (!selectedUser || !selectedRole) return;
    assignRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: selectedRole,
    });
  };

  const handleRemoveRole = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({ userId, roleId });
  };

  const resetAddUserForm = () => {
    setNewUserEmail("");
    setNewUserFirstName("");
    setNewUserLastName("");
    setNewUserRole("");
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim()) return;
    
    const userData: { email: string; firstName?: string; lastName?: string; roleId?: string } = {
      email: newUserEmail.trim(),
    };
    
    if (newUserFirstName.trim()) userData.firstName = newUserFirstName.trim();
    if (newUserLastName.trim()) userData.lastName = newUserLastName.trim();
    if (newUserRole) userData.roleId = newUserRole;
    
    addUserMutation.mutate(userData);
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">ניהול משתמשים</h1>
          <p className="text-muted-foreground">נהל משתמשים ותפקידים במערכת</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <Plus className="h-4 w-4 ml-2" />
                הוסף משתמש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>הוספת משתמש חדש</DialogTitle>
                <DialogDescription>
                  הוסף משתמש חדש למערכת והקצה לו תפקיד
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">כתובת מייל (חובה)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="example@domain.com"
                    data-testid="input-new-user-email"
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">שם פרטי (אופציונלי)</Label>
                  <Input
                    id="firstName"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    placeholder="שם פרטי"
                    data-testid="input-new-user-firstname"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">שם משפחה (אופציונלי)</Label>
                  <Input
                    id="lastName"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="שם משפחה"
                    data-testid="input-new-user-lastname"
                  />
                </div>
                <div>
                  <Label htmlFor="role">תפקיד (חובה)</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger data-testid="select-new-user-role">
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setIsAddUserDialogOpen(false);
                    resetAddUserForm();
                  }}>
                    ביטול
                  </Button>
                  <Button 
                    onClick={handleAddUser}
                    disabled={!newUserEmail.trim() || !newUserRole || addUserMutation.isPending}
                    data-testid="button-confirm-add-user"
                  >
                    {addUserMutation.isPending ? "מוסיף..." : "הוסף משתמש"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <Card key={user.id} data-testid={`card-user-${user.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.email}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {canManageUsers && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}?`)) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      {deleteUserMutation.isPending ? "מוחק..." : "מחק"}
                    </Button>
                  )}
                  {canManageRoles && (
                    <Dialog open={isRoleDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                      setIsRoleDialogOpen(open);
                      if (open) setSelectedUser(user);
                      else {
                        setSelectedUser(null);
                        setSelectedRole("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid={`button-assign-role-${user.id}`}>
                          <UserPlus className="h-4 w-4 ml-2" />
                          הקצה תפקיד
                        </Button>
                      </DialogTrigger>
                      <DialogContent dir="rtl">
                        <DialogHeader>
                          <DialogTitle>הקצאת תפקיד</DialogTitle>
                          <DialogDescription>
                            בחר תפקיד להקצאה למשתמש {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.email}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="בחר תפקיד" />
                            </SelectTrigger>
                            <SelectContent>
                              {allRoles
                                .filter(role => !user.userRoles.some(ur => ur.role.id === role.id))
                                .map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                              ביטול
                            </Button>
                            <Button 
                              onClick={handleAssignRole}
                              disabled={!selectedRole || assignRoleMutation.isPending}
                              data-testid="button-confirm-assign-role"
                            >
                              {assignRoleMutation.isPending ? "מקצה..." : "הקצה תפקיד"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <h4 className="font-medium mb-3">תפקידים:</h4>
                {user.userRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.userRoles.map((userRole) => (
                      <div key={userRole.id} className="flex items-center gap-2">
                        <Badge 
                          variant={getRoleBadgeVariant(userRole.role.type)}
                          data-testid={`badge-role-${userRole.role.type}`}
                        >
                          {userRole.role.name}
                        </Badge>
                        {canManageRoles && userRole.role.type !== 'super_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(user.id, userRole.role.id)}
                            disabled={removeRoleMutation.isPending}
                            data-testid={`button-remove-role-${userRole.role.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">אין תפקידים מוקצים</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">אין משתמשים</h3>
                <p className="text-muted-foreground">לא נמצאו משתמשים במערכת</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}