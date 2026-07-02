import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { NewProject } from "@/pages/NewProject";
import { ProjectWorkspace } from "@/pages/ProjectWorkspace";
import { Templates } from "@/pages/Templates";
import { Library } from "@/pages/Library";
import { LibraryPreview } from "@/pages/LibraryPreview";
import { Admin } from "@/pages/Admin";
import { CrmDashboard } from "@/pages/CrmDashboard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/library" component={Library} />
      <Route path="/library/:id" component={LibraryPreview} />
      <Route path="/projects/new" component={NewProject} />
      <Route path="/projects/:id" component={ProjectWorkspace} />
      <Route path="/templates" component={Templates} />
      <Route path="/admin" component={Admin} />
      <Route path="/crm" component={CrmDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
