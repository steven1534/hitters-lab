import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import AthletePortal from "./pages/AthletePortal";
import DrillDetail from "./pages/DrillDetail";
import AcceptInvite from "./pages/AcceptInvite";
import DrillGeneratorPage from "./pages/DrillGeneratorPage";
import { ManageDrillVideos } from "./pages/ManageDrillVideos";
import CreateDrillDetails from "./pages/CreateDrillDetails";
import SubmissionsDashboard from "./pages/SubmissionsDashboard";
import CoachMessaging from "./pages/CoachMessaging";
import AthleteMessaging from "./pages/AthleteMessaging";
import VerifyEmail from "./pages/VerifyEmail";
import UserManagement from "./pages/UserManagement";
import DrillsDirectory from "./pages/DrillsDirectory";
import Pathways from "./pages/Pathways";
import MyProgress from "./pages/MyProgress";
import ParentDashboard from "./pages/ParentDashboard";
import ActivityFeed from "./pages/ActivityFeed";
import DrillComparison from "./pages/DrillComparison";
import AthleteAssessment from "./pages/AthleteAssessment";
import MyProfile from "./pages/MyProfile";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastContainer } from "./components/ToastContainer";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { ImpersonationBanner } from "./components/ImpersonationBanner";
import { useEffect } from "react";

// Register service worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });
    });
  }
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={DrillsDirectory} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Login} />
      <Route path={"/drills"} component={DrillsDirectory} />
      <Route path={"/pathways"} component={Pathways} />
      <Route path={"/progress"} component={MyProgress} />
      <Route path={"/accept-invite/:token"} component={AcceptInvite} />
      <Route path={"/verify-email/:token"} component={VerifyEmail} />
      <Route path={"/drill/:id"} component={DrillDetail} />
      
      {/* Protected Routes - Admin Only */}
      <Route path={"/admin"}>
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected Routes - Coach Only */}
      <Route path={"/coach-dashboard"}>
        <ProtectedRoute requiredRole="coach">
          <CoachDashboard />
        </ProtectedRoute>
      </Route>
           <Route path={"/drill-generator"}>
        <ProtectedRoute requiredRole="admin">
          <DrillGeneratorPage />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/manage-drill-videos"}>
        <ProtectedRoute requiredRole="coach">
          <ManageDrillVideos />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/create-drill-details"}>
        <ProtectedRoute requiredRole="coach">
          <CreateDrillDetails />
        </ProtectedRoute>
      </Route>
      <Route path={"/submissions"}>
        <ProtectedRoute requiredRole="admin">
          <SubmissionsDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/user-management"}>
        <ProtectedRoute requiredRole="admin">
          <UserManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/coach-messaging"}>
        <ProtectedRoute requiredRole="admin">
          <CoachMessaging />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/activity-feed"}>
        <ProtectedRoute requiredRole="admin">
          <ActivityFeed />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/drill-comparison"}>
        <ProtectedRoute requiredRole="admin">
          <DrillComparison />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/athlete-assessment"}>
        <ProtectedRoute requiredRole="admin">
          <AthleteAssessment />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/athlete-messaging"}>
        <ProtectedRoute requiredRole="athlete">
          <AthleteMessaging />
        </ProtectedRoute>
      </Route>
      
      {/* Protected Routes - Parent Dashboard */}
      <Route path={"/parent-dashboard"}>
        <ProtectedRoute requiredRole="parent">
          <ParentDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected Routes - Athlete Only */}
      <Route path={"/athlete-portal"}>
        <ProtectedRoute requiredRole="athlete">
          <AthletePortal />
        </ProtectedRoute>
      </Route>

      <Route path={"/my-profile"}>
        <ProtectedRoute requiredRole="athlete">
          <MyProfile />
        </ProtectedRoute>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const [location] = useLocation();

  return (
    <ErrorBoundary resetKey={location}>
      <NotificationProvider>
        <ThemeProvider
          defaultTheme="light"
          // switchable
        >
          <TooltipProvider>
            <ImpersonationBanner />
            <Toaster />
            <ToastContainer />
            <Router />
            <PWAInstallBanner />
          </TooltipProvider>
        </ThemeProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
