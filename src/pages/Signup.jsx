import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiUrl from "../components/ApiUrl";

import "./Signup.css";

const Signup = ({
  subtileCaption = "Create your account and start learning smarter with AI.",
  signupLoginText = "Already have an account?",
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const API_URL = ApiUrl();

  async function handleSignup(e) {
    e.preventDefault();

    if (!name || !email || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Signup failed.");
        setLoading(false);
        return;
      }

      setMessage("Account created successfully!");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("SIGNUP ERROR:", error);

      setMessage("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card">
        {/* LOGO */}

        <div className="signup-logo">🧾</div>

        {/* TITLE */}

        <h1>Create Account</h1>

        <p className="signup-subtitle">{subtileCaption}</p>

        {/* FORM */}

        <form onSubmit={handleSignup}>
          {/* NAME */}

          <div className="signup-input-group">
            <label htmlFor="name">Full Name</label>

            <input
              id="name"
              className="signup-input"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          {/* EMAIL */}

          <div className="signup-input-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              className="signup-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}

          <div className="signup-input-group">
            <label htmlFor="password">Password</label>

            <div className="signup-password-wrapper">
              <input
                id="password"
                className="signup-input"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          {/* SIGNUP BUTTON */}

          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* MESSAGE */}

        <p className="signup-message">{message}</p>

        {/* LOGIN */}

        <p className="signup-login-text">
          {signupLoginText}
          <button
            className="signup-login-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </p>
      </section>
    </main>
  );
};

export default Signup;
