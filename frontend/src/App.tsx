import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import PropertyDetails from './pages/PropertyDetails';
import BuyerDashboard from './pages/BuyerDashboard';
import AgentDashboard from './pages/AgentDashboard';
import CreateListing from './pages/CreateListing';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import EditListing from './pages/EditListing';
import ModerationDashboard from './pages/ModerationDashboard';
import LiveChat from './pages/LiveChat';
import ProfileSettings from './pages/ProfileSettings';
import AdvancedSearch from './pages/AdvancedSearch';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
        <Route path="/dashboard/agent" element={<AgentDashboard />} />
        <Route path="/dashboard/admin" element={<ModerationDashboard />} />
        <Route path="/listings/new" element={<CreateListing />} />
        <Route path="/listings/edit/:id" element={<EditListing />} />
        <Route path="/chat/:inquiryId" element={<LiveChat />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/search" element={<AdvancedSearch />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;