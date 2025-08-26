import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Mail, Settings, CheckCircle, XCircle } from "lucide-react";

export default function EmailSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: false,
    emailUser: '',
    emailPass: '',
    imapHost: '',
    imapPort: '993',
    imapSecure: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setConnectionStatus('testing');

    try {
      const response = await fetch('/api/email/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailConfig),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "הגדרות מייל נשמרו",
          description: "ההגדרות נשמרו בהצלחה והחיבור נבדק",
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הגדרות המייל",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailConfig),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "החיבור תקין",
          description: "החיבור לשרת המייל פועל כראוי",
        });
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "בעיית חיבור",
        description: "לא ניתן להתחבר לשרת המייל",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header title="הגדרות מייל" />
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  חיבור לתיבת דואר cPanel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>להגדרת חיבור לתיבת הדואר שלך ב-cPanel, תזדקק לפרטים הבאים:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>כתובת שרת SMTP (לדוגמה: mail.yourdomain.com)</li>
                    <li>פורט SMTP (בדרך כלל 587 או 465)</li>
                    <li>כתובת שרת IMAP (לדוגמה: mail.yourdomain.com)</li>
                    <li>פורט IMAP (בדרך כלל 993)</li>
                    <li>כתובת המייל המלאה וסיסמה</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  הגדרות החיבור
                  {getStatusIcon()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* SMTP Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">הגדרות שליחה (SMTP)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">שרת SMTP</Label>
                        <Input
                          id="smtpHost"
                          type="text"
                          placeholder="mail.yourdomain.com"
                          value={emailConfig.smtpHost}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">פורט SMTP</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={emailConfig.smtpPort}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* IMAP Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">הגדרות קריאה (IMAP)</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="imapHost">שרת IMAP</Label>
                        <Input
                          id="imapHost"
                          type="text"
                          placeholder="mail.yourdomain.com"
                          value={emailConfig.imapHost}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, imapHost: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="imapPort">פורט IMAP</Label>
                        <Input
                          id="imapPort"
                          type="number"
                          value={emailConfig.imapPort}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, imapPort: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">פרטי זיהוי</h3>
                    
                    <div>
                      <Label htmlFor="emailUser">כתובת מייל</Label>
                      <Input
                        id="emailUser"
                        type="email"
                        placeholder="your-email@yourdomain.com"
                        value={emailConfig.emailUser}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, emailUser: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailPass">סיסמה</Label>
                      <Input
                        id="emailPass"
                        type="password"
                        value={emailConfig.emailPass}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, emailPass: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={testConnection}
                      disabled={isLoading}
                    >
                      בדוק חיבור
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                    >
                      {isLoading ? "שומר..." : "שמור הגדרות"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}