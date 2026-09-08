import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DashboardHeader } from "./DashboardHeader";
import "./dashboard.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

document.documentElement.dataset.theme = "dark";

createRoot(root).render(
  <StrictMode>
    <DashboardHeader />
  </StrictMode>,
);
