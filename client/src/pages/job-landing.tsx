import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, DollarSign, Users, Building2, Clock, CheckCircle, Share2, Facebook, Twitter, Linkedin, Mail, Phone, User, FileText, Send, Briefcase, Star } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import type { JobWithClient } from "@shared/schema";

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience: string;
  motivation: string;
  cvFile?: File;
}

export default function JobLanding() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const [applicationData, setApplicationData] = useState<ApplicationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    experience: "",
    motivation: ""
  });

  // קבלת פרטי המשרה
  const { data: job, isLoading: jobLoading } = useQuery<JobWithClient>({
    queryKey: [`/api/jobs/${id}/public`],
    enabled: !!id,
  });

  // שליחת הגשת מועמדות
  const submitApplication = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/jobs/${id}/apply`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('שגיאה בשליחת המועמדות');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "מועמדות נשלחה בהצלחה!",
        description: "תודה על הגשת המועמדות. נחזור אליך בהקדם האפשרי.",
      });
      setIsApplicationOpen(false);
      setApplicationData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        experience: "",
        motivation: ""
      });
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת המועמדות. נסה שוב.",
        variant: "destructive",
      });
    },
  });

  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!applicationData.firstName || !applicationData.lastName || !applicationData.email || !applicationData.phone) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('firstName', applicationData.firstName);
    formData.append('lastName', applicationData.lastName);
    formData.append('email', applicationData.email);
    formData.append('phone', applicationData.phone);
    formData.append('experience', applicationData.experience);
    formData.append('motivation', applicationData.motivation);
    
    if (applicationData.cvFile) {
      formData.append('cv', applicationData.cvFile);
    }

    submitApplication.mutate(formData);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = `${job?.title} - ${job?.client?.companyName}`;
    const description = job?.description?.substring(0, 100) || "";

    let shareUrl = "";
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "הקישור הועתק!",
      description: "הקישור הועתק ללוח. תוכל לשתף אותו עכשיו.",
    });
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center" dir="rtl">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-center">משרה לא נמצאה</CardTitle>
            <CardDescription className="text-center">
              המשרה שחיפשת לא קיימת או הוסרה מהמערכת
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                מערכת גיוס מתקדמת
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                המקום שלך למצוא את המשרה הבאה
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="hidden sm:flex"
              >
                <Share2 className="h-4 w-4 ml-2" />
                העתק קישור
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* עמודה ראשית - פרטי המשרה */}
          <div className="lg:col-span-2 space-y-6">
            {/* תמונה ראשית למשרה */}
            {job.landingImage && (
              <Card className="overflow-hidden">
                <img
                  src={job.landingImage.startsWith('http') ? job.landingImage : `/uploads/${job.landingImage}`}
                  alt={job.title}
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </Card>
            )}

            {/* כותרת המשרה וחברה */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl sm:text-2xl mb-2 leading-tight">{job.title}</CardTitle>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-300">
                      {(job.showCompanyName ?? true) && job.client?.companyName && (
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 ml-1 flex-shrink-0" />
                          <span className="text-sm sm:text-base">{job.client.companyName}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 ml-1 flex-shrink-0" />
                          <span className="text-sm sm:text-base">
                            {job.location}
                            {job.isRemote && " (עבודה מהבית)"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 self-start">
                    <CheckCircle className="h-3 w-3 ml-1" />
                    פעילה
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* פרטי המשרה */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <Briefcase className="h-5 w-5 ml-2" />
                  פרטי המשרה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(job.showSalary ?? true) && job.salaryRange && (
                    <div className="flex items-center flex-wrap gap-2">
                      <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="font-medium">שכר:</span>
                      <span className="text-sm sm:text-base">{job.salaryRange}</span>
                    </div>
                  )}
                  {job.jobType && (
                    <div className="flex items-center flex-wrap gap-2">
                      <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="font-medium">סוג משרה:</span>
                      <span className="text-sm sm:text-base">{job.jobType}</span>
                    </div>
                  )}
                  <div className="flex items-center flex-wrap gap-2">
                    <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <span className="font-medium">מספר משרות:</span>
                    <span className="text-sm sm:text-base">{job.positions}</span>
                  </div>
                  {job.deadline && (
                    <div className="flex items-center flex-wrap gap-2">
                      <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <span className="font-medium">תאריך יעד:</span>
                      <span className="text-sm sm:text-base">{format(new Date(job.deadline.toString()), 'dd MMMM yyyy', { locale: he })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* תיאור החברה */}
            {job.companyDescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Building2 className="h-5 w-5 ml-2" />
                    אודות החברה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700 dark:text-gray-300">
                    {job.companyDescription.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 leading-relaxed text-sm sm:text-base">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* דרישות */}
            {job.benefits && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Star className="h-5 w-5 ml-2 text-yellow-500" />
                    דרישות המשרה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700 dark:text-gray-300">
                    {job.benefits.split('\n').map((benefit, index) => (
                      <div key={index} className="flex items-start mb-2">
                        <CheckCircle className="h-4 w-4 ml-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="leading-relaxed text-sm sm:text-base">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* תיאור המשרה */}
            {job.description && (
              <Card>
                <CardHeader>
                  <CardTitle>תיאור המשרה</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700 dark:text-gray-300">
                    {job.description.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* דרישות המשרה */}
            {job.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 ml-2 text-yellow-500" />
                    דרישות המשרה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700 dark:text-gray-300">
                    {job.requirements.split('\n').map((requirement, index) => (
                      <div key={index} className="flex items-start mb-2">
                        <CheckCircle className="h-4 w-4 ml-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="leading-relaxed">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* עמודה צדדית - פעולות ושיתוף */}
          <div className="space-y-6">
            {/* הגשת מועמדות */}
            {(job.landingPageActive ?? true) ? (
              <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200 text-lg sm:text-xl">
                    מעוניין במשרה?
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    הגש מועמדות עכשיו ונחזור אליך בהקדם
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={isApplicationOpen} onOpenChange={setIsApplicationOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base" size="lg">
                        <Send className="h-4 w-4 ml-2" />
                        הגש מועמדות
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>הגשת מועמדות - {job.title}</DialogTitle>
                      <DialogDescription>
                        מלא את הפרטים הבאים כדי להגיש מועמדות למשרה
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleApplicationSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">שם פרטי *</Label>
                          <Input
                            id="firstName"
                            value={applicationData.firstName}
                            onChange={(e) => setApplicationData(prev => ({ ...prev, firstName: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">שם משפחה *</Label>
                          <Input
                            id="lastName"
                            value={applicationData.lastName}
                            onChange={(e) => setApplicationData(prev => ({ ...prev, lastName: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">אימייל *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={applicationData.email}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">טלפון *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={applicationData.phone}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="experience">ניסיון רלוונטי</Label>
                        <Textarea
                          id="experience"
                          value={applicationData.experience}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, experience: e.target.value }))}
                          placeholder="ספר על הניסיון הרלוונטי שלך למשרה..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="motivation">מה מעניין אותך במשרה?</Label>
                        <Textarea
                          id="motivation"
                          value={applicationData.motivation}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, motivation: e.target.value }))}
                          placeholder="ספר מה מעניין אותך במשרה הזו..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cv">קורות חיים (אופציונלי)</Label>
                        <Input
                          id="cv"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setApplicationData(prev => ({ 
                            ...prev, 
                            cvFile: e.target.files?.[0] 
                          }))}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          פורמטים נתמכים: PDF, DOC, DOCX
                        </p>
                      </div>
                      <Separator />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsApplicationOpen(false)}
                        >
                          ביטול
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitApplication.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {submitApplication.isPending ? "שולח..." : "שלח מועמדות"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
            ) : (
              <Card className="border-2 border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-600 dark:text-gray-400">
                    הגשת מועמדויות סגורה
                  </CardTitle>
                  <CardDescription>
                    כרגע לא ניתן להגיש מועמדות למשרה זו
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* שיתוף ברשתות חברתיות */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">שתף את המשרה</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  עזור לחברים שלך למצוא את המשרה המושלמת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('facebook')}
                    className="text-blue-600 hover:bg-blue-50 text-xs sm:text-sm"
                  >
                    <Facebook className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('linkedin')}
                    className="text-blue-700 hover:bg-blue-50 text-xs sm:text-sm"
                  >
                    <Linkedin className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('twitter')}
                    className="text-blue-400 hover:bg-blue-50 text-xs sm:text-sm"
                  >
                    <Twitter className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare('whatsapp')}
                    className="text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                  >
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                    WhatsApp
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-sm sm:text-base"
                  onClick={copyToClipboard}
                >
                  <Share2 className="h-4 w-4 ml-2" />
                  העתק קישור
                </Button>
              </CardContent>
            </Card>

            {/* פרטי יצירת קשר */}
            {(job.showCompanyName ?? true) && job.client && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">פרטי החברה</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base">{job.client.companyName}</span>
                    </div>
                    {job.client.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <a 
                          href={`mailto:${job.client.contactEmail}`}
                          className="text-blue-600 hover:underline text-sm sm:text-base break-all"
                        >
                          {job.client.contactEmail}
                        </a>
                      </div>
                    )}
                    {job.client.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <a 
                          href={`tel:${job.client.contactPhone}`}
                          className="text-blue-600 hover:underline text-sm sm:text-base"
                        >
                          {job.client.contactPhone}
                        </a>
                      </div>
                    )}
                    {job.client.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <a 
                          href={job.client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm sm:text-base break-all"
                        >
                          אתר החברה
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center text-gray-600 dark:text-gray-300">
            <p>© 2024 מערכת גיוס מתקדמת. כל הזכויות שמורות.</p>
            <p className="text-sm mt-1">
              מערכת ניהול גיוס מתקדמת לחברות ומשרדי גיוס
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}