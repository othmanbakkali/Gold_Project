import { HashRouter, Routes, Route } from 'react-router-dom';
import TVDisplay from './pages/TVDisplay';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TVDisplay />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </HashRouter>
  );
}

export default App;