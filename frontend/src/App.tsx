import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomeScreen from './screens/WelcomeScreen';
import GestationScreen from './screens/GestationScreen';
import MainConcernScreen from './screens/MainConcernScreen';
import QuestionsScreen from './screens/QuestionsScreen';
import ResultScreen from './screens/ResultScreen';
import ClinicianScreen from './screens/ClinicianScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/triage/gestation" element={<GestationScreen />} />
        <Route path="/triage" element={<MainConcernScreen />} />
        <Route path="/triage/questions" element={<QuestionsScreen />} />
        <Route path="/triage/result" element={<ResultScreen />} />
        {/* Clinician-only route. Intentionally separate from the patient flow
            and never linked from any patient screen. */}
        <Route path="/clinician" element={<ClinicianScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
