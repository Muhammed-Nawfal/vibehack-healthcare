import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import MainConcernScreen from './screens/MainConcernScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/triage" element={<MainConcernScreen />} />
        <Route
          path="/triage/questions"
          element={<PlaceholderScreen name="Guided questions" />}
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
