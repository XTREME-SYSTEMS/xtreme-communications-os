import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Home from './pages/Home';
import ProviderAbstraction from './pages/ProviderAbstraction';
import WholesaleCore from './pages/WholesaleCore';
import NumberManagement from './pages/NumberManagement';
import DeveloperSettings from './pages/DeveloperSettings';
import BillingDashboard from './pages/BillingDashboard';
import RouteQuality from './pages/RouteQuality';
import CampaignAutomation from './pages/CampaignAutomation';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<Home />} />
      <Route path="/providers" element={<ProviderAbstraction />} />
      <Route path="/core" element={<WholesaleCore />} />
      <Route path="/numbers" element={<NumberManagement />} />
      <Route path="/developers" element={<DeveloperSettings />} />
      <Route path="/billing" element={<BillingDashboard />} />
      <Route path="/routes" element={<RouteQuality />} />
      <Route path="/campaigns" element={<CampaignAutomation />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App