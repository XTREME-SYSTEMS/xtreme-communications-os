import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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
import ParityComparison from './pages/ParityComparison';
import PromptLibrary from './pages/PromptLibrary';
import Preflight from './pages/Preflight';
import DeepArchitecture from './pages/DeepArchitecture';
import CallDashboard from './pages/CallDashboard';
import PersonaStudio from './pages/PersonaStudio';
import CompanyOverview from './pages/CompanyOverview';
import CommunicationStudio from './pages/CommunicationStudio';
import TestLab from './pages/TestLab';
import DigitalTeam from './pages/DigitalTeam';
import CampaignConsole from './pages/CampaignConsole';
import MarketingHome from './pages/MarketingHome';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import PortalLayout from '@/components/portal/PortalLayout';
import Portal from './pages/Portal';
import PortalOnboarding from './pages/PortalOnboarding';
import PortalNumbers from './pages/PortalNumbers';
import PortalAgents from './pages/PortalAgents';
import PortalKeys from './pages/PortalKeys';
import PortalSettings from './pages/PortalSettings';
import PromoAdmin from './pages/PromoAdmin';
import NumberResale from './pages/NumberResale';
import AdminPortal from './pages/AdminPortal';
import TemplateGenerator from './pages/TemplateGenerator';
import MmsStudio from './pages/MmsStudio';
import TestingStudio from './pages/TestingStudio';
import BrandKit from './pages/BrandKit';
import AgentMemory from './pages/AgentMemory';
import WorkflowGenerator from './pages/WorkflowGenerator';
import ContentLibrary from './pages/ContentLibrary';
import GoogleWorkspace from './pages/GoogleWorkspace';
import XtremeSocial from './pages/XtremeSocial';
import LiveMonitoring from './pages/LiveMonitoring';
import CoreDocs from './pages/CoreDocs';
import WhatsAppSetup from './pages/WhatsAppSetup';
import WhatsAppOutreach from './pages/WhatsAppOutreach';
import AgentGenerator from './pages/AgentGenerator';
import VisionCortex from './pages/VisionCortex';
import DigitalTeamBuilder from './pages/DigitalTeamBuilder';
import AutonomousActionTest from './pages/AutonomousActionTest';
import NumberPorting from './pages/NumberPorting';
import NumberWorkflow from './pages/NumberWorkflow';
import WorkflowTestLab from './pages/WorkflowTestLab';
import XtremeCrm from './pages/XtremeCrm';
import LeadScraper from './pages/LeadScraper';
import CouponGenerator from './pages/CouponGenerator';
import BusinessCardGenerator from './pages/BusinessCardGenerator';
import CompanyShowcase from './pages/CompanyShowcase';
import LinkBuilder from './pages/LinkBuilder';
import ThankYou from './pages/ThankYou';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AcceptableUse from './pages/AcceptableUse';
import SmsOptIn from './pages/SmsOptIn';
import SystemAudit from './pages/SystemAudit';
import SmsInbox from './pages/SmsInbox';
import DocSpecialist from './pages/DocSpecialist';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/" element={<MarketingHome />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/ThankYou" element={<ThankYou />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            <Route path="/sms-optin" element={<SmsOptIn />} />

            {/* Protected routes — auth required */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              {/* Customer Portal */}
              <Route element={<PortalLayout />}>
                <Route path="/portal" element={<Portal />} />
                <Route path="/portal/onboarding" element={<PortalOnboarding />} />
                <Route path="/portal/numbers" element={<PortalNumbers />} />
                <Route path="/portal/number-workflow" element={<NumberWorkflow />} />
                <Route path="/portal/workflow-test-lab" element={<WorkflowTestLab />} />
                <Route path="/portal/agents" element={<PortalAgents />} />
                <Route path="/portal/keys" element={<PortalKeys />} />
                <Route path="/portal/settings" element={<PortalSettings />} />
                <Route path="/portal/testing-studio" element={<TestingStudio />} />
                <Route path="/portal/brand-kit" element={<BrandKit />} />
                <Route path="/portal/agent-memory" element={<AgentMemory />} />
                <Route path="/portal/workflow-generator" element={<WorkflowGenerator />} />
                <Route path="/portal/content-library" element={<ContentLibrary />} />
                <Route path="/portal/google-workspace" element={<GoogleWorkspace />} />
                <Route path="/portal/xtreme-social" element={<XtremeSocial />} />
                <Route path="/portal/live-monitoring" element={<LiveMonitoring />} />
                <Route path="/portal/core-docs" element={<CoreDocs />} />
                <Route path="/portal/crm" element={<XtremeCrm />} />
                <Route path="/portal/lead-scraper" element={<LeadScraper />} />
                <Route path="/portal/coupons" element={<CouponGenerator />} />
                <Route path="/portal/business-cards" element={<BusinessCardGenerator />} />
                <Route path="/portal/company-showcase" element={<CompanyShowcase />} />
                <Route path="/portal/link-builder" element={<LinkBuilder />} />
                <Route path="/portal/whatsapp-outreach" element={<WhatsAppOutreach />} />
                <Route path="/portal/agent-generator" element={<AgentGenerator />} />
                <Route path="/portal/vision-cortex" element={<VisionCortex />} />
                <Route path="/portal/digital-team-builder" element={<DigitalTeamBuilder />} />
                <Route path="/portal/action-test" element={<AutonomousActionTest />} />
                <Route path="/portal/sms-inbox" element={<SmsInbox />} />
                <Route path="/portal/doc-specialist" element={<DocSpecialist />} />
              </Route>
              {/* Admin */}
              <Route path="/promo-admin" element={<PromoAdmin />} />
              <Route path="/number-resale" element={<NumberResale />} />
              <Route path="/admin-portal" element={<AdminPortal />} />
              <Route path="/admin/system-audit" element={<SystemAudit />} />
              <Route path="/core-docs" element={<CoreDocs />} />
              {/* Portal Tools */}
              <Route path="/portal/templates" element={<TemplateGenerator />} />
              <Route path="/portal/mms-studio" element={<MmsStudio />} />
              <Route path="/portal/whatsapp" element={<WhatsAppSetup />} />
              <Route path="/portal/porting" element={<NumberPorting />} />
              {/* XTREME OS — internal dashboard */}
              <Route path="/os" element={<Home />} />
              <Route path="/providers" element={<ProviderAbstraction />} />
              <Route path="/core" element={<WholesaleCore />} />
              <Route path="/numbers" element={<NumberManagement />} />
              <Route path="/developers" element={<DeveloperSettings />} />
              <Route path="/billing" element={<BillingDashboard />} />
              <Route path="/routes" element={<RouteQuality />} />
              <Route path="/campaigns" element={<CampaignAutomation />} />
              <Route path="/parity-comparison" element={<ParityComparison />} />
              <Route path="/prompts" element={<PromptLibrary />} />
              <Route path="/preflight" element={<Preflight />} />
              <Route path="/deep" element={<DeepArchitecture />} />
              <Route path="/calls" element={<CallDashboard />} />
              <Route path="/personas" element={<PersonaStudio />} />
              <Route path="/company" element={<CompanyOverview />} />
              <Route path="/comm-studio" element={<CommunicationStudio />} />
              <Route path="/test-lab" element={<TestLab />} />
              <Route path="/digital-team" element={<DigitalTeam />} />
              <Route path="/campaign-console" element={<CampaignConsole />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App