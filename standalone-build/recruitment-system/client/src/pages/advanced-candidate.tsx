import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdvancedCandidateForm from "@/components/forms/advanced-candidate-form";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdvancedCandidatePage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const candidateId = params?.id;

  // Load candidate data if editing
  const { data: candidate, isLoading } = useQuery({
    queryKey: [`/api/candidates/${candidateId}`],
    enabled: !!candidateId,
  });

  const handleSuccess = () => {
    setLocation("/candidates");
  };

  const handleCancel = () => {
    setLocation("/candidates");
  };

  if (candidateId && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">טוען פרטי מועמד...</p>
        </div>
      </div>
    );
  }

  return (
    <AdvancedCandidateForm
      candidate={candidate}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}