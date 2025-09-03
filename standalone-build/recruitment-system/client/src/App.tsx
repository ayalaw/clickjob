import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/navbar";
import { ReminderPopup } from "@/components/reminder-popup";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import JobLanding from "@/pages/job-landing";
import Dashboard from "@/pages/dashboard";
import Candidates from "@/pages/candidates";
import AddCandidate from "@/pages/add-candidate";
import AdvancedCandidate from "@/pages/advanced-candidate";
import CandidateDetail from "@/pages/candidate-detail";
import Clients from "@/pages/clients";
import Jobs from "@/pages/jobs";
import Interviews from "@/pages/interviews";
import JobInterviews from "@/pages/job-interviews";
import Emails from "@/pages/emails";
import EmailSettings from "@/pages/email-settings";
import SystemSettings from "@/pages/system-settings";
import Settings from "@/pages/settings";
import CVSearch from "@/pages/cv-search";
import Calendar from "@/pages/calendar";
import UserManagement from "@/pages/user-management";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/jobs/:id/landing" component={JobLanding} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <ReminderPopup />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/candidates" component={Candidates} />
          <Route path="/candidates/new" component={AddCandidate} />
          <Route path="/candidates/add" component={AddCandidate} />
          <Route path="/candidates/advanced" component={AdvancedCandidate} />
          <Route path="/candidates/:id/advanced" component={AdvancedCandidate} />
          <Route path="/candidates/:id" component={CandidateDetail} />
          <Route path="/cv-search" component={CVSearch} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/clients" component={Clients} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/jobs/:id/landing" component={JobLanding} />
          <Route path="/interviews" component={Interviews} />
          <Route path="/interviews/:jobId" component={JobInterviews} />
          <Route path="/emails" component={Emails} />
          <Route path="/email-settings" component={EmailSettings} />
          <Route path="/system-settings" component={SystemSettings} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
