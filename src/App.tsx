import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Colleges from './pages/Colleges';
import Specialties from './pages/Specialties';
import Events from './pages/Events';
import News from './pages/News';
import Shorts from './pages/Shorts';
import Quizzes from './pages/Quizzes';
import Professions from './pages/Professions';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />

              <Route element={<ProtectedRoute allowedRoles={['content_editor']} />}>
                <Route path="colleges" element={<Colleges />} />
                <Route path="specialties" element={<Specialties />} />
                <Route path="events" element={<Events />} />
                <Route path="shorts" element={<Shorts />} />
                <Route path="quizzes" element={<Quizzes />} />
                <Route path="professions" element={<Professions />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['news_editor']} />}>
                <Route path="news" element={<News />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
