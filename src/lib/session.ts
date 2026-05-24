export function getSessionId(): string {
  let sessionId = localStorage.getItem("dg_session_id");
  if (!sessionId) {
    // Fallback for non-HTTPS environments where crypto.randomUUID might be undefined
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem("dg_session_id", sessionId);
  }
  return sessionId;
}
