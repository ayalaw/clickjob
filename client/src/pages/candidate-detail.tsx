import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  FileText, 
  Eye, 
  ArrowRight,
  Calendar,
  Briefcase,
  GraduationCap,
  Heart,
  Car,
  Baby,
  Download,
  Save,
  X
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

export default function CandidateDetail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Candidate>>({});

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

  const id = window.location.pathname.split('/').pop();
  const { data: candidate, isLoading: candidateLoading } = useQuery<Candidate>({
    queryKey: [`/api/candidates/${id}`],
    enabled: isAuthenticated && !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'employed': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמין';
      case 'employed': return 'מועסק';
      case 'inactive': return 'לא פעיל';
      case 'blacklisted': return 'ברשימה שחורה';
      default: return status;
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (updatedData: Partial<Candidate>) => {
      return apiRequest(`/api/candidates/${id}`, {
        method: 'PUT',
        body: updatedData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${id}`] });
      toast({
        title: "נשמר בהצלחה",
        description: "פרטי המועמד עודכנו",
      });
      setEditingField(null);
      setEditValues({});
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את פרטי המועמד",
        variant: "destructive",
      });
    }
  });

  const startEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveEdit = () => {
    if (editingField && editValues[editingField as keyof Candidate] !== undefined) {
      updateMutation.mutate(editValues);
    }
  };

  const EditableField = ({ 
    field, 
    label, 
    value, 
    type = "text",
    options = [] 
  }: { 
    field: string;
    label: string;
    value: any;
    type?: "text" | "number" | "select" | "textarea";
    options?: string[];
  }) => {
    const isEditing = editingField === field;
    
    if (isEditing) {
      return (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{label}:</span>
          <div className="flex items-center gap-2">
            {type === "select" ? (
              <Select
                value={editValues[field as keyof Candidate] as string || ""}
                onValueChange={(value) => setEditValues({ ...editValues, [field]: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === "textarea" ? (
              <Textarea
                value={editValues[field as keyof Candidate] as string || ""}
                onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            ) : (
              <Input
                type={type}
                value={editValues[field as keyof Candidate] as string || ""}
                onChange={(e) => setEditValues({ ...editValues, [field]: type === "number" ? Number(e.target.value) : e.target.value })}
                className="w-32 text-sm"
              />
            )}
            <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
              <Save className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
        onClick={() => startEdit(field, value)}
      >
        <span className="text-sm font-medium">{label}:</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{value || "לא צוין"}</span>
          <Edit className="w-3 h-3 text-gray-400" />
        </div>
      </div>
    );
  };

  if (isLoading || candidateLoading) {
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

  if (!candidate) {
    return (
      <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">מועמד לא נמצא</h2>
            <Button onClick={() => navigate("/candidates")}>חזור למועמדים</Button>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div dir="rtl" className="space-y-6">
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          {/* Navigation */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate("/candidates")}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              חזור לרשימת המועמדים
            </Button>
          </div>

          {/* Layout - 68% CV, 32% Details */}
          <div className="flex gap-6 h-[calc(100vh-12rem)]">
            {/* CV Display Card - 68% */}
            <div className="flex-[2] min-w-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    קורות חיים
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
                  {candidate.cvPath ? (
                    <div className="h-full flex flex-col">
                      {/* File info */}
                      <div className="flex justify-center p-3 bg-gray-50 rounded mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          קובץ קורות חיים - {candidate.cvPath?.split('/').pop()}
                        </div>
                      </div>
                      
                      {/* CV Display */}
                      <div className="flex-1 bg-white rounded border overflow-hidden">
                        {candidate.cvPath?.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={`/uploads/${candidate.cvPath?.replace('uploads/', '')}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : candidate.cvPath?.toLowerCase().includes('.doc') ? (
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + '/uploads/' + candidate.cvPath?.replace('uploads/', ''))}`}
                            className="w-full h-full border-0"
                            title="קורות חיים"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">תצוגה מקדימה לא זמינה</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">לא הועלה קובץ קורות חיים</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Candidate Details Card - 32% */}
            <div className="flex-1 min-w-0">
              <div className="h-full overflow-y-auto space-y-4">
                {/* Header with name */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {candidate.firstName} {candidate.lastName}
                      </CardTitle>
                      <Badge className={getStatusColor(candidate.status || 'available')}>
                        {getStatusText(candidate.status || 'available')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Rating */}
                    {candidate.rating && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">דירוג:</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className={`text-lg ${i <= candidate.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tags */}
                    {candidate.tags && candidate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {candidate.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      פרטי קשר
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EditableField 
                      field="email"
                      label="מייל"
                      value={candidate.email}
                    />
                    <EditableField 
                      field="mobile"
                      label="נייד"
                      value={candidate.mobile}
                    />
                    <EditableField 
                      field="phone"
                      label="טלפון בית"
                      value={candidate.phone}
                    />
                    <EditableField 
                      field="phone2"
                      label="טלפון נוסף"
                      value={candidate.phone2}
                    />
                  </CardContent>
                </Card>

                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      פרטים אישיים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EditableField 
                      field="nationalId"
                      label="תעודת זהות"
                      value={candidate.nationalId}
                    />
                    <EditableField 
                      field="gender"
                      label="מין"
                      value={candidate.gender}
                      type="select"
                      options={["זכר", "נקבה"]}
                    />
                    <EditableField 
                      field="maritalStatus"
                      label="מצב משפחתי"
                      value={candidate.maritalStatus}
                      type="select"
                      options={["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"]}
                    />
                    <EditableField 
                      field="drivingLicense"
                      label="רישיון נהיגה"
                      value={candidate.drivingLicense}
                      type="select"
                      options={["אין", "B", "A", "C", "D"]}
                    />
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      כתובת
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EditableField 
                      field="city"
                      label="עיר"
                      value={candidate.city}
                    />
                    <EditableField 
                      field="street"
                      label="רחוב"
                      value={candidate.street}
                    />
                    <EditableField 
                      field="houseNumber"
                      label="מס' בית"
                      value={candidate.houseNumber}
                    />
                    <EditableField 
                      field="zipCode"
                      label="מיקוד"
                      value={candidate.zipCode}
                    />
                    <EditableField 
                      field="receptionArea"
                      label="איזור קליטה"
                      value={candidate.receptionArea}
                    />
                  </CardContent>
                </Card>

                {/* Professional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      מידע מקצועי
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EditableField 
                      field="profession"
                      label="מקצוע"
                      value={candidate.profession}
                    />
                    <EditableField 
                      field="experience"
                      label="ניסיון (שנים)"
                      value={candidate.experience}
                      type="number"
                    />
                    <EditableField 
                      field="expectedSalary"
                      label="שכר צפוי"
                      value={candidate.expectedSalary}
                      type="number"
                    />
                    <EditableField 
                      field="recruitmentSource"
                      label="מקור גיוס"
                      value={candidate.recruitmentSource}
                    />
                    <EditableField 
                      field="achievements"
                      label="הישגים"
                      value={candidate.achievements}
                      type="textarea"
                    />
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      הערות
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EditableField 
                      field="notes"
                      label="הערות"
                      value={candidate.notes}
                      type="textarea"
                    />
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      מידע נוסף
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">נוצר בתאריך:</span>
                      <span className="text-sm">{candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('he-IL') : 'לא זמין'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">עודכן לאחרונה:</span>
                      <span className="text-sm">{candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleDateString('he-IL') : 'לא זמין'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }