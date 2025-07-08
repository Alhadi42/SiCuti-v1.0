import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useRoutes,
} from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import Employees from "@/pages/Employees";
import UserManagement from "@/pages/UserManagement";
import LeaveRequests from "@/pages/LeaveRequests";
import LeaveHistoryPage from "@/pages/LeaveHistoryPage";
import Reports from "@/pages/Reports";
import DocxSuratKeterangan from "@/pages/DocxSuratKeterangan";
import DocxTemplateManagement from "@/pages/DocxTemplateManagement";
import Settings from "@/pages/Settings";
import PdfDemo from "@/pages/PdfDemo";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectionHealthChecker from "@/components/ConnectionHealthChecker";

function App() {
  return (
    <ErrorBoundary>
      <ConnectionHealthChecker>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Routes>
              {/* Public routes - no layout */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes - with layout */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Employees />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route
                          path="/user-management"
                          element={<UserManagement />}
                        />
                        <Route
                          path="/leave-requests"
                          element={<LeaveRequests />}
                        />
                        <Route
                          path="/leave-history"
                          element={<LeaveHistoryPage />}
                        />
                        <Route path="/reports" element={<Reports />} />
                        <Route
                          path="/surat-keterangan"
                          element={<DocxSuratKeterangan />}
                        />
                        <Route
                          path="/template-management"
                          element={<DocxTemplateManagement />}
                        />
                        <Route path="/settings" element={<Settings />} />
                        {import.meta.env.VITE_TEMPO && (
                          <Route path="/tempobook/*" />
                        )}
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </ConnectionHealthChecker>
    </ErrorBoundary>
  );
}

export default App;
