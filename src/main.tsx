import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// FullCalendar styles are loaded via CDN (v5) because the v6 npm packages don't include CSS files

createRoot(document.getElementById("root")!).render(<App />);
