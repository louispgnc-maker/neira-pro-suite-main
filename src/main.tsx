import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// FullCalendar styles are loaded from CDN in index.html to avoid bundler resolution issues

createRoot(document.getElementById("root")!).render(<App />);
