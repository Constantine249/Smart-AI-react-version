import { Link } from "react-router-dom";
import "./Landingpage.css";

const Landingpage = ({
  smallText_p = "YOUR AI SMART STUDY ASSISTANT",
  description_p = " Summarize your study materials, ask questions, and get intelligent AI assistance whenever you need it.",
  featureCaption = "PDF & Image Support",
  messageBotCaption = "Hi! 👋 I'm your Smart Study Assistant.",
  messageUser_Caption = "Summarize my study material for me.",
  messageBotCaption_2 = "Of course! Upload your PDF, image, or paste your text and I'll create a clear and easy-to-understand summary for you.",
  chatInput_span = "Ask SmartAI anything...",
  landingFooter_p = "Powered by AI • Built for smarter learning",
}) => {
  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <header className="landing-header">
        <nav className="navbar">
          <Link to="/" className="logo">
            <span>✦</span>
            SmartAI
          </Link>

          <div className="nav-buttons">
            <Link to="/login" className="login-btn">
              Login
            </Link>

            <Link to="/signup" className="signup-btn">
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <main className="hero">
        <section className="hero-content">
          <p className="small-text">{smallText_p}</p>

          <h1>
            Study smarter.
            <br />
            <span>Learn better.</span>
          </h1>

          <p className="description">{description_p}</p>

          <div className="hero-buttons">
            <Link to="/signup" className="signup-btn main-btn">
              Get Started →
            </Link>

            <Link to="/login" className="login-btn main-btn">
              Login
            </Link>
          </div>

          <div className="features">
            <div className="feature">
              <span>✦</span>
              AI Summaries
            </div>

            <div className="feature">
              <span>◉</span>
              {featureCaption}
            </div>

            <div className="feature">
              <span>✧</span>
              AI Chatbot
            </div>
          </div>
        </section>

        {/* AI PREVIEW CARD */}
        <section className="chat-card">
          <div className="chat-header">
            <div className="bot-icon">✦</div>

            <div>
              <h3>SmartAI</h3>
              <p>
                <span className="online-dot"></span>
                Online
              </p>
            </div>
          </div>

          <div className="chat-body">
            <div className="message bot">{messageBotCaption}</div>

            <div className="message user">{messageUser_Caption}</div>

            <div className="message bot">{messageBotCaption_2}</div>

            <div className="typing-preview">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="chat-input">
            <span>{chatInput_span}</span>

            <button type="button">↑</button>
          </div>
        </section>
      </main>

      {/* BOTTOM TEXT */}
      <div className="landing-footer">
        <p>{landingFooter_p}</p>
      </div>
    </div>
  );
};

export default Landingpage;
