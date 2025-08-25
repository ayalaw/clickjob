import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CandidateForm from "@/components/forms/candidate-form";

export default function AddCandidate() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">טוען...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSuccess = () => {
    // The form will handle navigation to home page
  };

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <CandidateForm onSuccess={handleSuccess} />
        </main>
      </div>
    </div>
  );
}