import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, Eye, EyeOff, CheckCircle, User, Lock, Mail, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  loginDetails: {
    username: string;
    password: string;
    email: string;
    loginUrl: string;
  } | null;
  title?: string;
}

export function LoginDetailsPopup({ isOpen, onClose, loginDetails, title = "פרטי כניסה חדשים" }: LoginDetailsPopupProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "הועתק!",
        description: `${fieldName} הועתק ללוח`,
      });
      
      // איפוס הסטטוס אחרי 2 שניות
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן להעתיק ללוח",
        variant: "destructive",
      });
    }
  };

  const openLoginPage = () => {
    if (loginDetails?.loginUrl) {
      window.open(loginDetails.loginUrl, '_blank');
    }
  };

  if (!loginDetails) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium mb-2">
              ✅ המשתמש נוצר בהצלחה!
            </p>
            <p className="text-xs text-green-700">
              שמור את הפרטים הבאים - הסיסמא תוצג פעם אחת בלבד
            </p>
          </div>

          {/* שם משתמש */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <User className="h-4 w-4" />
              שם משתמש
            </Label>
            <div className="flex gap-2">
              <Input 
                value={loginDetails.username} 
                readOnly 
                className="bg-gray-50 text-lg font-mono"
                data-testid="input-username"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(loginDetails.username, "שם המשתמש")}
                className="px-3"
                data-testid="button-copy-username"
              >
                {copiedField === "שם המשתמש" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* סיסמא */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <Lock className="h-4 w-4" />
              סיסמא
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type={showPassword ? "text" : "password"}
                  value={loginDetails.password} 
                  readOnly 
                  className="bg-gray-50 text-lg font-mono pr-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(loginDetails.password, "הסיסמא")}
                className="px-3"
                data-testid="button-copy-password"
              >
                {copiedField === "הסיסמא" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* מייל */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4" />
              כתובת מייל
            </Label>
            <div className="flex gap-2">
              <Input 
                value={loginDetails.email} 
                readOnly 
                className="bg-gray-50"
                data-testid="input-email"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(loginDetails.email, "כתובת המייל")}
                className="px-3"
                data-testid="button-copy-email"
              >
                {copiedField === "כתובת המייל" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* קישור כניסה */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-medium">
              <LinkIcon className="h-4 w-4" />
              דף כניסה למערכת
            </Label>
            <div className="flex gap-2">
              <Input 
                value={loginDetails.loginUrl} 
                readOnly 
                className="bg-gray-50 text-sm"
                data-testid="input-login-url"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(loginDetails.loginUrl, "קישור הכניסה")}
                className="px-3"
                data-testid="button-copy-url"
              >
                {copiedField === "קישור הכניסה" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* כפתורי פעולה */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={openLoginPage}
              className="flex-1"
              data-testid="button-open-login"
            >
              <ExternalLink className="h-4 w-4 ml-2" />
              פתח דף כניסה
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-close-popup"
            >
              סגור
            </Button>
          </div>

          {/* אזהרה */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              ⚠️ <strong>חשוב:</strong> הסיסמא מוצגת פעם אחת בלבד. 
              שמור את הפרטים במקום בטוח לפני סגירת החלון.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}