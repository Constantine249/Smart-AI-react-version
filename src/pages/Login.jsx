import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ApiUrl from "../components/ApiUrl";

import "./Login.css";

const Login = ({
  loginSubtitle = "Login to your Smart Study Assistant",
  signupCaption = "Don't have an account?",
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const API_URL = ApiUrl();

  async function handleLogin(event) {
    event.preventDefault();

    if (!email || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Save login information
      localStorage.setItem("token", data.token);

      localStorage.setItem("user", JSON.stringify(data.user));

      localStorage.setItem("username", data.user.name);

      // Go to summary page
      navigate("/summary");
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setMessage("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Welcome Back 👋</h1>

        <p className="login-subtitle">{loginSubtitle}</p>

        <form onSubmit={handleLogin}>
          <div className="login-input-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              className="login-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Password</label>

            <div className="login-password-wrapper">
              <input
                id="password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && <p className="login-message">{message}</p>}

        <p className="signup-link">
          {signupCaption} <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
