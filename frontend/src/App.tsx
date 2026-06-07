import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomeScreen from './screens/WelcomeScreen';
import SignUpScreen from './screens/SignUpScreen';
import MainConcernScreen from './screens/MainConcernScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignUpScreen />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WelcomeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/triage"
          element={
            <ProtectedRoute>
              <MainConcernScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/triage/questions"
          element={
            <ProtectedRoute>
              <PlaceholderScreen name="Guided questions" />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-pearl)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
        opacity: 0.6,
      }}
    >
      {name} screen — coming soon
    </div>
  );
}

export default App;
