import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./Dialog.css";

const DialogContext = createContext(null);

// Pages call useDialog() to get confirm(), prompt() and toast()
export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null); // the box that is currently open
  const [inputValue, setInputValue] = useState("");
  const [toasts, setToasts] = useState([]);
  const resolveRef = useRef(null);

  // Opens a box and returns a Promise that finishes when the user answers
  const openDialog = useCallback((config) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setInputValue(config.defaultValue || "");
      setDialog(config);
    });
  }, []);

  const confirm = useCallback(
    (options) => openDialog({ type: "confirm", ...options }),
    [openDialog],
  );

  const prompt = useCallback(
    (options) => openDialog({ type: "prompt", ...options }),
    [openDialog],
  );

  const closeDialog = (result) => {
    if (resolveRef.current) resolveRef.current(result);
    resolveRef.current = null;
    setDialog(null);
  };

  // "Cancel" answer: false for confirm boxes, null for prompt boxes
  const cancelValue = dialog && dialog.type === "prompt" ? null : false;

  // Small message in the corner that disappears after 3 seconds
  const toast = useCallback((message, kind = "success") => {
    const id = Date.now() + Math.random();

    setToasts((previous) => [...previous, { id, message, kind }]);

    setTimeout(() => {
      setToasts((previous) => previous.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Escape key cancels the open box
  useEffect(() => {
    if (!dialog) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeDialog(cancelValue);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog]);

  return (
    <DialogContext.Provider value={{ confirm, prompt, toast }}>
      {children}

      {dialog && (
        <div
          className="dialog-backdrop"
          onClick={() => closeDialog(cancelValue)}
        >
          <div
            className="dialog-box"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{dialog.title}</h3>

            {dialog.message && <p>{dialog.message}</p>}

            {dialog.type === "prompt" && (
              <input
                className="dialog-input"
                autoFocus
                value={inputValue}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") closeDialog(inputValue);
                }}
              />
            )}

            <div className="dialog-buttons">
              <button
                className="dialog-cancel"
                onClick={() => closeDialog(cancelValue)}
              >
                Cancel
              </button>

              <button
                className={`dialog-confirm ${dialog.danger ? "danger" : ""}`}
                onClick={() =>
                  closeDialog(dialog.type === "prompt" ? inputValue : true)
                }
              >
                {dialog.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
};
