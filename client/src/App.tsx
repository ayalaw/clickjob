import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Candidates from "@/pages/candidates";
import AddCandidate from "@/pages/add-candidate";
import CandidateDetail from "@/pages/candidate-detail";
import Clients from "@/pages/clients";
import Jobs from "@/pages/jobs";
import Interviews from "@/pages/interviews";
import JobInterviews from "@/pages/job-interviews";
import Emails from "@/pages/emails";
import EmailSettings from "@/pages/email-settings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/candidates" component={Candidates} />
          <Route path="/candidates/new" component={AddCandidate} />
          <Route path="/candidates/add" component={AddCandidate} />
          <Route path="/candidates/:id" component={CandidateDetail} />
          <Route path="/clients" component={Clients} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/interviews" component={Interviews} />
          <Route path="/interviews/:jobId" component={JobInterviews} />
          <Route path="/emails" component={Emails} />
          <Route path="/email-settings" component={EmailSettings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
