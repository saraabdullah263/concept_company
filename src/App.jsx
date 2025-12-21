import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Hospitals from './pages/contracts/Hospitals';
import Contracts from './pages/contracts/Contracts';
import RoutesPage from './pages/routes/Routes';
import RouteDetails from './pages/routes/RouteDetails';
import RepresentativeRoute from './pages/routes/RepresentativeRoute';
import Vehicles from './pages/routes/Vehicles';
import Incinerators from './pages/routes/Incinerators';
import Users from './pages/users/Users';
import Accounting from './pages/accounting/Accounting';
import Expenses from './pages/accounting/Expenses';
import Invoices from './pages/accounting/Invoices';
import InvoiceDetails from './pages/accounting/InvoiceDetails';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import Setup from './pages/Setup';
import MainLayout from './components/common/MainLayout';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

const NotFound = () => <div className="p-4">404 - Not Found</div>;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />

          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />

            <Route path="hospitals" element={
              <RoleProtectedRoute allowedRoles={['admin', 'logistics_manager', 'accountant']}>
                <Hospitals />
              </RoleProtectedRoute>
            } />
            <Route path="contracts" element={
              <RoleProtectedRoute allowedRoles={['admin', 'logistics_manager', 'accountant']}>
                <Contracts />
              </RoleProtectedRoute>
            } />
            <Route path="contracts/list" element={<Navigate to="/contracts" replace />} />

            <Route path="routes" element={<RoutesPage />} />
            <Route path="routes/:id" element={<RouteDetails />} />
            <Route path="routes/:routeId/execute" element={
              <RoleProtectedRoute allowedRoles={['representative']}>
                <RepresentativeRoute />
              </RoleProtectedRoute>
            } />

            <Route path="vehicles" element={
              <RoleProtectedRoute allowedRoles={['admin', 'logistics_manager']}>
                <Vehicles />
              </RoleProtectedRoute>
            } />
            <Route path="incinerators" element={
              <RoleProtectedRoute allowedRoles={['admin', 'logistics_manager']}>
                <Incinerators />
              </RoleProtectedRoute>
            } />
            <Route path="users" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <Users />
              </RoleProtectedRoute>
            } />

            <Route path="accounting" element={
              <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Accounting />
              </RoleProtectedRoute>
            } />
            <Route path="expenses" element={
              <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Expenses />
              </RoleProtectedRoute>
            } />
            <Route path="invoices" element={
              <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Invoices />
              </RoleProtectedRoute>
            } />
            <Route path="invoices/:id" element={
              <RoleProtectedRoute allowedRoles={['admin', 'accountant']}>
                <InvoiceDetails />
              </RoleProtectedRoute>
            } />

            <Route path="reports" element={
              <RoleProtectedRoute allowedRoles={['admin', 'logistics_manager', 'accountant']}>
                <Reports />
              </RoleProtectedRoute>
            } />
            <Route path="settings" element={
              <RoleProtectedRoute allowedRoles={['admin']}>
                <Settings />
              </RoleProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
