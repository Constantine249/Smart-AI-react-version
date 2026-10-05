import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landingpage from "./pages/Landingpage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import SummaryDashboard from "./pages/SummaryDashboard.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Chatbot from "./pages/Chatbot.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/summary"
          element={
            <ProtectedRoute>
              <SummaryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <Chatbot />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
