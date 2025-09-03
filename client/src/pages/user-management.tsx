import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { usePermissions, type UserWithRoles, type Role } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Shield, Users, Plus, Mail, Settings, Lock, Eye, Edit, UserCheck, UserX, RotateCcw } from "lucide-react";
import { LoginDetailsPopup } from "@/components/login-details-popup";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canManageUsers, canManageRoles, allRoles, userWithRoles, isLoading: permissionsLoading } = usePermissions();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("");
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<UserWithRoles | null>(null);
  const [loginDetailsPopup, setLoginDetailsPopup] = useState<{
    isOpen: boolean;
    loginDetails: any;
    title?: string;
  }>({ isOpen: false, loginDetails: null });

  // Get all users with their roles
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['/api/users/all'],
    enabled: canManageUsers,
  });

  // Get detailed permissions for selected user
  const { data: detailedPermissions, isLoading: permissionsLoadingDetail } = useQuery({
    queryKey: ['/api/permissions/detailed', selectedUserPermissions?.id],
    enabled: !!selectedUserPermissions?.id && permissionsDialogOpen,
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

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/users/${userId}/reset-password`);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      setLoginDetailsPopup({
        isOpen: true,
        loginDetails: data.loginDetails,
        title: "סיסמא חדשה נוצרה"
      });
      toast({
        title: "הסיסמא אופסה בהצלחה",
        description: "הסיסמא החדשה מוצגת בחלון",
      });
    },
    onError: (error: any) => {
      console.error('Error resetting password:', error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן היה לאפס את הסיסמא",
        variant: "destructive",
      });
    },
  });

  // Add user mutation with password
  const addUserMutation = useMutation({
    mutationFn: async (userData: { email: string; firstName?: string; lastName?: string; roleId?: string }) => {
      const response = await apiRequest('POST', '/api/users/create-with-password', userData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/all'] });
      setIsAddUserDialogOpen(false);
      resetAddUserForm();
      
      // הצגת פרטי הכניסה החדשים
      setLoginDetailsPopup({
        isOpen: true,
        loginDetails: data.loginDetails,
        title: "משתמש חדש נוצר בהצלחה"
      });
      
      toast({
        title: "המשתמש נוצר בהצלחה",
        description: "פרטי הכניסה מוצגים בחלון",
      });
    },
    onError: (error: any) => {
      console.error('Error adding user:', error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן היה ליצור את המשתמש",
        variant: "destructive",
      });
    },
  });

  // Legacy add user mutation (old method)
  const addUserLegacyMutation = useMutation({
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

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('POST', `/api/test-email/${userId}`);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "מייל בדיקה נשלח בהצלחה",
        description: `נשלח ל-${data.email}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחת מייל בדיקה",
        description: error.message || "אירעה שגיאה בעת שליחת המייל",
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

  // דיבוג מפורט
  console.log('🔍 User Management Debug:', { 
    canManageUsers, 
    canManageRoles, 
    userRoles: userWithRoles?.userRoles?.map(ur => ur.role.type),
    allUsers: users?.length,
    allRoles: allRoles?.length,
    isLoading: permissionsLoading
  });
  
  if (!canManageUsers && !canManageRoles) {
    return (
      <div className="container mx-auto p-4" dir="rtl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">אין הרשאה</h3>
              <p className="text-muted-foreground">אין לך הרשאה לצפות בדף זה</p>
              <p className="text-sm text-muted-foreground mt-2">
                נדרשות הרשאות ניהול משתמשים או תפקידים
              </p>
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
      case 'restricted_admin':
        return 'outline';
      case 'job_viewer':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getRoleDescription = (roleType: string) => {
    switch (roleType) {
      case 'super_admin':
        return 'אדמין ראשי - גישה מלאה לכל המערכת';
      case 'admin':
        return 'אדמין - גישה לניהול המערכת';
      case 'restricted_admin':
        return 'אדמין מוגבל - גישה מוגבלת לחלקים מסוימים';
      case 'job_viewer':
        return 'צופה משרות - גישה למשרות ספציפיות בלבד (ללא פרטי לקוחות)';
      case 'user':
        return 'משתמש רגיל - גישה בסיסית למערכת';
      default:
        return 'תפקיד לא מוגדר';
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

  const handleSendTestEmail = (userId: string) => {
    sendTestEmailMutation.mutate(userId);
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
          {(canManageUsers || canManageRoles) && (
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
          )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTestEmail(user.id)}
                    disabled={sendTestEmailMutation.isPending}
                    data-testid={`button-send-test-email-${user.id}`}
                  >
                    <Mail className="h-4 w-4 ml-2" />
                    {sendTestEmailMutation.isPending ? "שולח..." : "מייל בדיקה"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUserPermissions(user);
                      setPermissionsDialogOpen(true);
                    }}
                    data-testid={`button-view-permissions-${user.id}`}
                  >
                    <Lock className="h-4 w-4 ml-2" />
                    הרשאות מפורטות
                  </Button>
                  {canManageUsers && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`האם אתה בטוח שברצונך לאפס את הסיסמא של ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}?`)) {
                          resetPasswordMutation.mutate(user.id);
                        }
                      }}
                      disabled={resetPasswordMutation.isPending}
                      data-testid={`button-reset-password-${user.id}`}
                    >
                      <RotateCcw className="h-4 w-4 ml-2" />
                      {resetPasswordMutation.isPending ? "מאפס..." : "איפוס סיסמא"}
                    </Button>
                  )}
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
                          title={getRoleDescription(userRole.role.type)}
                        >
                          {userRole.role.name}
                        </Badge>
                        {canManageRoles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`האם אתה בטוח שברצונך להסיר את התפקיד "${userRole.role.name}" מהמשתמש?`)) {
                                handleRemoveRole(user.id, userRole.role.id);
                              }
                            }}
                            disabled={removeRoleMutation.isPending}
                            data-testid={`button-remove-role-${userRole.role.id}`}
                            title="הסר תפקיד"
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

        {/* חלון הרשאות מפורטות */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                הרשאות מפורטות - {selectedUserPermissions?.firstName && selectedUserPermissions?.lastName 
                  ? `${selectedUserPermissions.firstName} ${selectedUserPermissions.lastName}` 
                  : selectedUserPermissions?.email}
              </DialogTitle>
              <DialogDescription>
                צפה בכל ההרשאות הספציפיות של המשתמש למסכים, תפריטים וכפתורים
              </DialogDescription>
            </DialogHeader>
            
            {permissionsLoadingDetail ? (
              <div className="flex justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>טוען הרשאות...</p>
                </div>
              </div>
            ) : detailedPermissions ? (
              <Tabs defaultValue="pages" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pages">דפים</TabsTrigger>
                  <TabsTrigger value="menus">תפריטים</TabsTrigger>
                  <TabsTrigger value="components">רכיבים</TabsTrigger>
                  <TabsTrigger value="jobs">משרות</TabsTrigger>
                </TabsList>
                
                <TabsContent value="pages" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      גישה לדפים ({detailedPermissions.pages?.length || 0})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detailedPermissions.pages?.map((permission: string) => (
                        <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{getPermissionDisplayName(permission)}</span>
                        </div>
                      )) || <p className="text-muted-foreground">אין הרשאות דפים</p>}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="menus" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      הרשאות תפריטים וכפתורים ({detailedPermissions.menus?.length || 0})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detailedPermissions.menus?.map((permission: string) => (
                        <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{getPermissionDisplayName(permission)}</span>
                        </div>
                      )) || <p className="text-muted-foreground">אין הרשאות תפריטים</p>}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="components" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      רכיבי מערכת ({detailedPermissions.components?.length || 0})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detailedPermissions.components?.map((permission: string) => (
                        <div key={permission} className="flex items-center gap-2 p-2 border rounded">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{getPermissionDisplayName(permission)}</span>
                        </div>
                      )) || <p className="text-muted-foreground">אין הרשאות רכיבים</p>}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="jobs" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      הגבלות משרות וחשיפת מידע
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="font-medium">רואה שמות לקוחות:</Label>
                          {detailedPermissions.canViewClientNames ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 ml-1" />
                              כן
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <UserX className="h-3 w-3 ml-1" />
                              לא (*** מידע מוגבל ***)
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {detailedPermissions.allowedJobIds && detailedPermissions.allowedJobIds.length > 0 && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">משרות מותרות (צופה משרות):</h4>
                          <div className="space-y-1">
                            {detailedPermissions.allowedJobIds.map((jobId: string) => (
                              <div key={jobId} className="text-sm bg-blue-50 p-2 rounded">
                                קוד משרה: {jobId}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">לא ניתן לטעון הרשאות</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* פופ אפ פרטי כניסה */}
        <LoginDetailsPopup
          isOpen={loginDetailsPopup.isOpen}
          onClose={() => setLoginDetailsPopup({ isOpen: false, loginDetails: null })}
          loginDetails={loginDetailsPopup.loginDetails}
          title={loginDetailsPopup.title}
        />
      </div>
    </div>
  );
}

// פונקציה לתרגום שמות הרשאות לעברית
function getPermissionDisplayName(permission: string): string {
  const displayNames: Record<string, string> = {
    // הרשאות דפים
    'view_dashboard': 'צפייה בלוח מחוונים',
    'view_candidates': 'צפייה במועמדים',
    'view_jobs': 'צפייה במשרות',
    'view_clients': 'צפייה בלקוחות',
    'view_applications': 'צפייה בהגשות',
    'view_tasks': 'צפייה במשימות',
    'view_cv_search': 'חיפוש בקורות חיים',
    'view_calendar': 'יומן',
    'view_interviews': 'ראיונות',
    'view_emails': 'מערכת מיילים',
    'view_reports': 'דוחות ואנליטיקה',
    'create_candidates': 'יצירת מועמדים',
    'edit_candidates': 'עריכת מועמדים',
    'delete_candidates': 'מחיקת מועמדים',
    'create_jobs': 'יצירת משרות',
    'edit_jobs': 'עריכת משרות',
    'delete_jobs': 'מחיקת משרות',
    'create_clients': 'יצירת לקוחות',
    'edit_clients': 'עריכת לקוחות',
    'delete_clients': 'מחיקת לקוחות',
    'manage_applications': 'ניהול הגשות',
    'manage_tasks': 'ניהול משימות',
    'access_settings': 'גישה להגדרות',
    'manage_users': 'ניהול משתמשים',
    'manage_email_settings': 'הגדרות מייל',
    
    // הרשאות תפריטים
    'export_data': 'ייצוא נתונים',
    'import_data': 'יבוא נתונים',
    'send_emails': 'שליחת מיילים',
    'view_client_names': 'צפייה בשמות לקוחות',
    'quick_add_candidate': 'הוספה מהירה של מועמד',
    'quick_add_job': 'הוספה מהירה של משרה',
    'bulk_operations': 'פעולות מרובות',
    
    // הרשאות רכיבים
    'search_component': 'רכיב חיפוש',
    'filter_component': 'רכיב סינון',
    'export_component': 'רכיב ייצוא',
    'stats_component': 'רכיב סטטיסטיקות',
    
    // הרשאות נוספות שיכולות להופיע
    'read': 'קריאה',
    'create': 'יצירה',
    'update': 'עדכון',
    'delete': 'מחיקה',
    'manage': 'ניהול',
    'users': 'משתמשים',
    'candidates': 'מועמדים',
    'jobs': 'משרות',
    'clients': 'לקוחות',
    'tasks': 'משימות',
    'dashboard': 'לוח מחוונים',
    
    // תרגומים לכל מה שאני רואה בתמונה
    'view_candidate_details': 'צפייה בפרטי מועמד',
    'schedule_interviews': 'תזמון ראיונות',
    'manage_interviews': 'ניהול ראיונות',
    'view_analytics': 'צפייה באנליטיקה',
    'manage_system_settings': 'ניהול הגדרות מערכת',
    
    // הרשאות בסיסיות נפוצות
    'view': 'צפייה',
    'edit': 'עריכה',
    'add': 'הוספה',
    'remove': 'הסרה',
    'access': 'גישה',
    'modify': 'שינוי',
    'view_all': 'צפייה בכל',
    'create_all': 'יצירת כל',
    'edit_all': 'עריכת כל',
    'delete_all': 'מחיקת כל',
    
    // שילובים של הרשאות שיכולים להופיע
    'candidates_read': 'קריאת מועמדים',
    'candidates_create': 'יצירת מועמדים',
    'candidates_update': 'עדכון מועמדים',
    'candidates_delete': 'מחיקת מועמדים',
    'jobs_read': 'קריאת משרות',
    'jobs_create': 'יצירת משרות',
    'jobs_update': 'עדכון משרות',
    'jobs_delete': 'מחיקת משרות',
    'clients_read': 'קריאת לקוחות',
    'clients_create': 'יצירת לקוחות',
    'clients_update': 'עדכון לקוחות',
    'clients_delete': 'מחיקת לקוחות',
    'users_read': 'קריאת משתמשים',
    'users_create': 'יצירת משתמשים',
    'users_update': 'עדכון משתמשים',
    'users_delete': 'מחיקת משתמשים',
  };
  
  return displayNames[permission] || permission;
}