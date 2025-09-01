import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Settings, CheckCircle, XCircle } from "lucide-react";

export default function EmailSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  
  const [incomingConfig, setIncomingConfig] = useState({
    host: '',
    port: '143',
    secure: false,
    user: '',
    pass: ''
  });

  const [outgoingConfig, setOutgoingConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: ''
  });

  // טעינת הגדרות קיימות
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/system-settings/email-separated');
        if (response.ok) {
          const settings = await response.json();
          setIncomingConfig({
            host: settings.incomingHost || '',
            port: settings.incomingPort || '143',
            secure: settings.incomingSecure === 'true',
            user: settings.incomingUser || '',
            pass: settings.incomingPass || ''
          });
          setOutgoingConfig({
            host: settings.outgoingHost || '',
            port: settings.outgoingPort || '587',
            secure: settings.outgoingSecure === 'true',
            user: settings.outgoingUser || '',
            pass: settings.outgoingPass || ''
          });
        }
      } catch (error) {
        console.error('Error loading email settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setConnectionStatus('testing');

    try {
      const response = await fetch('/api/email/configure-separated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incoming: incomingConfig,
          outgoing: outgoingConfig
        }),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "הגדרות מייל נשמרו",
          description: "הגדרות תיבות הדואר הנכנס והיוצא נשמרו בהצלחה",
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
      const response = await fetch('/api/email/test-separated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incoming: incomingConfig,
          outgoing: outgoingConfig
        }),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "החיבורים תקינים",
          description: "החיבור לתיבות הדואר הנכנס והיוצא פועל כראוי",
        });
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "בעיית חיבור",
        description: "לא ניתן להתחבר לאחת מתיבות הדואר",
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
    <div dir="rtl" className="space-y-6">
        
        <main className="flex-1 p-6 overflow-y-auto bg-background-light">
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  הגדרות תיבות דואר נפרדות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-gray-600">
                  <p>המערכת תומכת בהפרדה בין תיבת דואר נכנס ותיבת דואר יוצא:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>תיבת דואר נכנס:</strong> רק לקבלת מיילים ועיבוד קורות חיים</li>
                    <li><strong>תיבת דואר יוצא:</strong> לשליחת מיילים עם חתימת המשתמש</li>
                    <li>ניתן להגדיר כתובות שרת שונות עבור כל תיבה</li>
                    <li>כל תיבה יכולה לעבוד עם פורטים והגדרות אבטחה שונות</li>
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Incoming Email Settings */}
                  <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                    <h3 className="font-medium text-lg text-blue-900">📥 תיבת דואר נכנס (IMAP)</h3>
                    <p className="text-sm text-blue-700">לקבלת מיילים ועיבוד קורות חיים אוטומטי</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="incomingHost">שרת IMAP</Label>
                        <Input
                          id="incomingHost"
                          type="text"
                          placeholder="mail.h-group.org.il"
                          value={incomingConfig.host}
                          onChange={(e) => setIncomingConfig(prev => ({ ...prev, host: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="incomingPort">פורט IMAP</Label>
                        <Input
                          id="incomingPort"
                          type="number"
                          value={incomingConfig.port}
                          onChange={(e) => setIncomingConfig(prev => ({ ...prev, port: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="incomingUser">כתובת מייל נכנס</Label>
                        <Input
                          id="incomingUser"
                          type="email"
                          placeholder="incoming@h-group.org.il"
                          value={incomingConfig.user}
                          onChange={(e) => setIncomingConfig(prev => ({ ...prev, user: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="incomingPass">סיסמה</Label>
                        <Input
                          id="incomingPass"
                          type="password"
                          value={incomingConfig.pass}
                          onChange={(e) => setIncomingConfig(prev => ({ ...prev, pass: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Outgoing Email Settings */}
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                    <h3 className="font-medium text-lg text-green-900">📤 תיבת דואר יוצא (SMTP)</h3>
                    <p className="text-sm text-green-700">לשליחת מיילים עם חתימת המשתמש</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="outgoingHost">שרת SMTP</Label>
                        <Input
                          id="outgoingHost"
                          type="text"
                          placeholder="mail.h-group.org.il"
                          value={outgoingConfig.host}
                          onChange={(e) => setOutgoingConfig(prev => ({ ...prev, host: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="outgoingPort">פורט SMTP</Label>
                        <Input
                          id="outgoingPort"
                          type="number"
                          value={outgoingConfig.port}
                          onChange={(e) => setOutgoingConfig(prev => ({ ...prev, port: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="outgoingUser">כתובת מייל יוצא</Label>
                        <Input
                          id="outgoingUser"
                          type="email"
                          placeholder="outgoing@h-group.org.il"
                          value={outgoingConfig.user}
                          onChange={(e) => setOutgoingConfig(prev => ({ ...prev, user: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="outgoingPass">סיסמה</Label>
                        <Input
                          id="outgoingPass"
                          type="password"
                          value={outgoingConfig.pass}
                          onChange={(e) => setOutgoingConfig(prev => ({ ...prev, pass: e.target.value }))}
                          required
                        />
                      </div>
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
  );
}