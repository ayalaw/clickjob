import { useState } from "react";
import { useLocation } from "wouter";
import AdvancedCandidateForm from "@/components/forms/advanced-candidate-form";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdvancedCandidatePage() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/candidates");
  };

  const handleCancel = () => {
    setLocation("/candidates");
  };

  return (
    <AdvancedCandidateForm
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}