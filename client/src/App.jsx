import { Routes, Route } from 'react-router-dom';
import TVDisplay from './pages/TVDisplay';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<TVDisplay />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default App;
