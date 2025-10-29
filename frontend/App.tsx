import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { DashboardLayout } from "./components/DashboardLayout";
import { StudentDashboard } from "./pages/StudentDashboard";
import { SupervisorDashboard } from "./pages/SupervisorDashboard";
import { HodDashboard } from "./pages/HodDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TopicList } from "./pages/TopicList";
import { TopicDetail } from "./pages/TopicDetail";
import { GroupList } from "./pages/GroupList";
import { GroupDetail } from "./pages/GroupDetail";
import { RegistrationList } from "./pages/RegistrationList";
import { GradingPage } from "./pages/GradingPage";

const queryClient = new QueryClient();
const PUBLISHABLE_KEY = "pk_test_Y2l2aWwtY3JpY2tldC05MS5jbGVyay5hY2NvdW50cy5kZXYk";

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/student" replace />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route path="student" element={<StudentDashboard />} />
        <Route path="supervisor" element={<SupervisorDashboard />} />
        <Route path="hod" element={<HodDashboard />} />
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
      <Route path="/topics" element={<DashboardLayout />}>
        <Route index element={<TopicList />} />
        <Route path=":id" element={<TopicDetail />} />
      </Route>
      <Route path="/groups" element={<DashboardLayout />}>
        <Route index element={<GroupList />} />
        <Route path=":id" element={<GroupDetail />} />
      </Route>
      <Route path="/registrations" element={<DashboardLayout />}>
        <Route index element={<RegistrationList />} />
      </Route>
      <Route path="/grading/:registrationId" element={<DashboardLayout />}>
        <Route index element={<GradingPage />} />
      </Route>
    </Routes>
  );
}
