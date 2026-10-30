import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme"; // applies the saved theme before the first paint
import App from "./App";
import "./styles/tokens.css";
import "./styles.css";

// Pause infinite animations while the tab is hidden (brief §9).
const syncVisibility = () =>
  document.documentElement.classList.toggle("is-tab-hidden", document.visibilityState === "hidden");
document.addEventListener("visibilitychange", syncVisibility);
syncVisibility();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
