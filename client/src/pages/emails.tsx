import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Send, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Email } from "@shared/schema";

export default function Emails() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: emailsData, isLoading: emailsLoading } = useQuery<{ emails: Email[] }>({
    queryKey: ["/api/emails"],
    enabled: isAuthenticated,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "delivered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "bounced":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "sent":
        return "נשלח";
      case "pending":
        return "ממתין";
      case "failed":
        return "נכשל";
      case "delivered":
        return "נמסר";
      case "bounced":
        return "הוחזר";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "failed":
      case "bounced":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <div>טוען...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <Sidebar />
      <div className="mr-64">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                היסטוריית מיילים
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              צפה בכל המיילים שנשלחו מהמערכת
            </p>
          </div>

          {emailsLoading ? (
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
              {emailsData?.emails && emailsData.emails.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900">
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">נושא</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">נמען</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">עותק</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">סטטוס</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">תאריך שליחה</TableHead>
                        <TableHead className="text-right font-medium text-gray-700 dark:text-gray-300">שגיאה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailsData.emails.map((email: Email) => (
                        <TableRow key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-700" data-testid={`row-email-${email.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4 text-blue-600" />
                              <span data-testid={`text-email-subject-${email.id}`}>
                                {email.subject}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-email-to-${email.id}`}>
                            {email.to}
                          </TableCell>
                          <TableCell>
                            {email.cc || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`flex items-center gap-1 ${getStatusColor(email.status)}`}>
                              {getStatusIcon(email.status)}
                              {getStatusText(email.status)}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-email-date-${email.id}`}>
                            {email.sentAt ? formatDate(email.sentAt) : 
                             email.createdAt ? formatDate(email.createdAt) : "-"}
                          </TableCell>
                          <TableCell>
                            {email.errorMessage ? (
                              <div className="text-red-600 text-sm max-w-xs truncate" title={email.errorMessage}>
                                {email.errorMessage}
                              </div>
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">עדיין לא נשלחו מיילים</p>
                  <p className="text-gray-400 text-sm mt-2">
                    כשתשלח מיילים למועמדים או לקוחות, הם יופיעו כאן
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}