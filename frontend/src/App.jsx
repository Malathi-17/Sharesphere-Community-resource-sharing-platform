import Login from './pages/Login'
import Signup from './pages/Signup'
import CreateCommunity from './pages/CreateCommunity'
import Communities from './pages/Communities'
import CommunityPage from './pages/CommunityPage'
import Profile from './pages/Profile'
import Resources from './pages/Resources'
import AddResource from './pages/AddResource'
import Bookings from './pages/Bookings'
import Fines from './pages/Fines'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import TransactionDetail from './pages/TransactionDetail'

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/create-community" element={<CreateCommunity />} />
        <Route path="/community/:id" element={<CommunityPage />} />
        <Route path="/community/:id/resources" element={<Resources />} />
        <Route path="/community/:id/add-resource" element={<AddResource />} />
        <Route path="/community/:id/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/fines" element={<Fines />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/transaction/:id" element={<TransactionDetail />} />
      </Routes>
    </Router>
  )
}

export default App