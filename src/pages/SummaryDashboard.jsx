import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ApiUrl from "../components/ApiUrl";
import { authFetch } from "../components/authFetch";
import { useDialog } from "../components/DialogProvider";
import "./SummaryDashboard.css";

const SummaryDashboard = ({
  sidebarSmallCaption = "Your generated summaries will appear here.",
  summarySmallTitle_p = " Paste your study material or upload a PDF or image and let SmartAI summarize it for you. ",
  loadingContainer_p = "SmartAI is analyzing your material...",
  emptySummary_p = "Your generated summary will appear here.",
  uploadLabel = "Upload PDF or Image",
}) => {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // used to reset the file input

  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const [summaryHistory, setSummaryHistory] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const { confirm: confirmDialog, prompt: promptDialog, toast } = useDialog();

  const API_URL = ApiUrl();

  // Get logged-in user
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.name || localStorage.getItem("username");

  // =========================
  // GENERATE SUMMARY
  // =========================

  const generateSummary = async () => {
    if (!text.trim() && !file) {
      setSummary("Please enter some text or upload a file.");
      return;
    }

    setLoading(true);
    setSummary("");
    setSelectedSummary(null);

    try {
      let data; // declared here so it's available after the if/else

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject", subject);

        const response = await authFetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "File processing failed");
        }
      } else {
        const response = await authFetch(`${API_URL}/api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, subject }),
        });

        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Summary generation failed");
        }
      }

      setSummary(data.summary);
      await loadSummaryHistory();
    } catch (error) {
      console.error("SUMMARY ERROR:", error);
      setSummary(`❌ ${error.message || "Failed to generate summary."}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // COPY SUMMARY
  // =========================

  const copySummary = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      toast("Summary copied to clipboard");
    } catch (error) {
      console.error("COPY ERROR:", error);
      toast("Could not copy the summary", "error");
    }
  };

  // =========================
  // FILE SELECTION
  // =========================

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  // =========================
  // HISTORY
  // =========================

  const loadSummaryHistory = async () => {
    if (!username) return;

    try {
      const response = await authFetch(`${API_URL}/api/summary-history`);

      const data = await response.json();

      if (response.ok) {
        setSummaryHistory(data.history || []);
      } else {
        console.log("Failed to load summary history:", data);
      }
    } catch (error) {
      console.error("Summary history error:", error);
    }
  };

  useEffect(() => {
    loadSummaryHistory();
  }, []);

  const shorten = (value, max) => {
    const clean = (value || "").replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max) + "…" : clean;
  };

  // The name shown in the sidebar: custom title first, otherwise the input
  const getTitle = (item) =>
    item.title || shorten(item.input, 60) || "Untitled summary";

  // Newest first, filtered by the search box
  const filteredHistory = summaryHistory
    .slice()
    .reverse()
    .filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (item.title || "").toLowerCase().includes(q) ||
        (item.input || "").toLowerCase().includes(q) ||
        (item.output || "").toLowerCase().includes(q)
      );
    });

  const openHistoryItem = (item) => {
    setSelectedSummary(item);
    setSummary(item.output);
    setSidebarOpen(false); // close the drawer on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewSummary = () => {
    setSubject("");
    setText("");
    setFile(null);
    setFileInputKey((k) => k + 1);
    setSummary("");
    setSelectedSummary(null);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========================
  // RENAME SUMMARY
  // =========================

  const renameSummary = async (item) => {
    const currentTitle = getTitle(item);

    const newTitle = await promptDialog({
      title: "Rename summary",
      defaultValue: currentTitle,
      confirmText: "Save",
    });

    if (!newTitle || !newTitle.trim() || newTitle.trim() === currentTitle) {
      return;
    }

    try {
      const response = await authFetch(
        `${API_URL}/api/summary-history/${item._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle.trim() }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to rename summary");
      }

      await loadSummaryHistory();
      toast("Summary renamed");
    } catch (error) {
      console.error("RENAME ERROR:", error);
      toast("Could not rename the summary. Please try again.", "error");
    }
  };

  // Delete Summary
  const deleteSummary = async (item) => {
    const confirmed = await confirmDialog({
      title: "Delete this summary?",
      message: "This cannot be undone.",
      confirmText: "Delete",
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `${API_URL}/api/summary-history/${item._id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete summary");
      }

      // If the deleted summary is the one on screen, clear it
      if (selectedSummary && selectedSummary._id === item._id) {
        setSelectedSummary(null);
        setSummary("");
      }

      await loadSummaryHistory();
      toast("Summary deleted");
    } catch (error) {
      console.error("DELETE ERROR:", error);
      toast("Could not delete the summary. Please try again.", "error");
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };

  // Title used for the PDF heading and the suggested file name
  const pdfTitle = selectedSummary
    ? getTitle(selectedSummary)
    : subject.trim() || "SmartAI Summary";

  const downloadPdf = () => {
    if (!summary) return;

    const previousTitle = document.title;

    // The browser suggests the page title as the file name
    document.title = pdfTitle.replace(/[\\/:*?"<>|]/g, "");

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);

    window.print();
  };

  return (
    <div className="summary-dashboard">
      {/* =========================
          TOP BAR
      ========================= */}

      <header className="summary-topbar">
        <div className="summary-topbar-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open summary history"
          >
            ☰
          </button>

          <div className="summary-logo">
            <span>✦</span>
            SmartAI
          </div>
        </div>

        <div className="summary-user">
          <span>Welcome back, {username} 👋</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="summary-layout">
        {/* =========================
            HISTORY SIDEBAR
        ========================= */}

        <aside
          className={`history-sidebar ${sidebarOpen ? "open" : ""}`}
          aria-label="Summary history"
        >
          <div className="sidebar-header">
            <div className="sidebar-title">
              <h2>History</h2>
              <span className="sidebar-count">{summaryHistory.length}</span>
            </div>

            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close summary history"
            >
              ✕
            </button>
          </div>

          <button
            className="sidebar-menu-item"
            onClick={() => navigate("/chatbot")}
          >
            <span>🤖</span>
            <span>AI Chatbot</span>
          </button>

          <button className="new-summary-btn" onClick={startNewSummary}>
            <span>＋</span> New summary
          </button>

          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sidebar-list">
            {summaryHistory.length === 0 ? (
              <div className="sidebar-empty">
                <span>🗂️</span>
                <p>No summaries yet.</p>
                <small>{sidebarSmallCaption}</small>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="sidebar-empty">
                <span>🔍</span>
                <p>No matches found.</p>
              </div>
            ) : (
              filteredHistory.map((item, index) => {
                const isActive =
                  selectedSummary &&
                  (selectedSummary._id
                    ? selectedSummary._id === item._id
                    : selectedSummary === item);

                return (
                  <div
                    key={item._id || item.id || index}
                    className="history-row"
                  >
                    <button
                      className={`history-item ${isActive ? "active" : ""}`}
                      onClick={() => openHistoryItem(item)}
                    >
                      <span className="history-icon">📄</span>

                      <div className="history-text">
                        <strong>{getTitle(item)}</strong>
                        <p>{shorten(item.output, 90)}</p>
                        {item.subject && (
                          <em className="history-subject">{item.subject}</em>
                        )}
                      </div>
                    </button>

                    <div className="history-actions">
                      <button
                        title="Rename"
                        onClick={() => renameSummary(item)}
                      >
                        ✏️
                      </button>

                      <button
                        title="Delete"
                        onClick={() => deleteSummary(item)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Dark backdrop behind the drawer on mobile */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* =========================
            MAIN CONTENT
        ========================= */}

        <main className="summary-main">
          <section className="summary-header">
            <p className="summary-small-title">AI STUDY ASSISTANT</p>

            <h1>
              Turn your study material into
              <span> simple summaries.</span>
            </h1>

            <p>{summarySmallTitle_p}</p>
          </section>

          <section className="summary-card">
            <div className="input-group">
              <label>Subject</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Study Material</label>
              <textarea
                placeholder="Paste your study text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="upload-section">
              <label className="upload-label">{uploadLabel}</label>

              <input
                key={fileInputKey}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />

              {file && <p className="selected-file">📄 {file.name}</p>}
            </div>

            <button
              className="generate-button"
              onClick={generateSummary}
              disabled={loading}
            >
              {loading ? "Generating Summary..." : "Generate Summary"}
            </button>
          </section>

          <section className="result-card">
            <div className="result-header">
              <h2>Summary</h2>

              {summary && !loading && (
                <div className="result-actions">
                  <button className="copy-button" onClick={copySummary}>
                    📋 Copy
                  </button>

                  <button className="copy-button" onClick={downloadPdf}>
                    ⬇ PDF
                  </button>
                </div>
              )}
            </div>

            {/* Only visible in the printed PDF */}
            <div className="print-header">
              <h1>{pdfTitle}</h1>
              <p>Created with SmartAI</p>
            </div>

            <div className="summary-result">
              {loading ? (
                <div className="loading-container">
                  <div className="loader"></div>
                  <p>{loadingContainer_p}</p>
                </div>
              ) : summary ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summary}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="empty-summary">{emptySummary_p}</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SummaryDashboard;
