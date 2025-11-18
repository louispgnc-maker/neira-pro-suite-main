import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import FullCalendar styles from the installed npm packages so Vite bundles them
import '@fullcalendar/common/main.css';
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';
import '@fullcalendar/list/main.css';

createRoot(document.getElementById("root")!).render(<App />);
