import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Briefcase, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            מערכת ניהול גיוס מתקדמת
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            פלטפורמה מקצועית לניהול מועמדים, לקוחות ומשרות עם כלים חכמים להשמה מוצלחת
          </p>
          <Button 
            size="lg" 
            className="btn-primary px-8 py-4 text-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            התחבר למערכת
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">מאגר מועמדים</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                ניהול מתקדם של מועמדים עם חיפוש חכם וסינון מדויק
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                <Building2 className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">מאגר לקוחות</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                ניהול קשרי לקוחות וחברות עם מעקב אחר הזדמנויות עסקיות
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-orange-600 dark:text-orange-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">מאגר משרות</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                פרסום וניהול משרות עם התאמה אוטומטית למועמדים מתאימים
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">דוחות ואנליטיקה</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                מעקב ביצועים ודוחות מפורטים לשיפור תהליכי הגיוס
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              למה לבחור במערכת שלנו?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h4 className="text-xl font-semibold mb-3">ממשק בעברית</h4>
              <p className="text-gray-600 dark:text-gray-300">
                מערכת מותאמת במלואה לשוק הישראלי עם תמיכה מלאה בעברית ו-RTL
              </p>
            </div>
            
            <div className="text-center">
              <h4 className="text-xl font-semibold mb-3">אוטומציה חכמה</h4>
              <p className="text-gray-600 dark:text-gray-300">
                כלים אוטומטיים לזיהוי מועמדים מתאימים, תזכורות ומעקב תהליכים
              </p>
            </div>
            
            <div className="text-center">
              <h4 className="text-xl font-semibold mb-3">דוחות מתקדמים</h4>
              <p className="text-gray-600 dark:text-gray-300">
                אנליטיקה מתקדמת לשיפור ביצועים ותובנות עסקיות חשובות
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            מוכנים להתחיל?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            הצטרפו לאלפי מגייסים שכבר משתמשים במערכת המתקדמת שלנו
          </p>
          <Button 
            size="lg" 
            className="btn-primary px-8 py-3"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-start"
          >
            התחל עכשיו
          </Button>
        </div>
      </div>
    </div>
  );
}
