import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import {
  PlaygroundPage,
  QueuePage,
  EvaluationPage,
  StatisticsPage,
  SettingsPage,
  ExpertsPage,
  DocumentationPage
} from '@/pages';
import { LoginPage } from '@/pages/LoginPage';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

function ProtectedRoute() {
  const { isAuthenticated, token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchMe();
    }
  }, [token, isAuthenticated, fetchMe]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  const { loadConfig } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [loadConfig, isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/queue" replace />} />
            <Route path="playground" element={<PlaygroundPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="evaluation" element={<EvaluationPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="experts" element={<ExpertsPage />} />
            <Route path="docs" element={<DocumentationPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
