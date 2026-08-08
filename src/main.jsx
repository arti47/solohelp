import React from "react";
import { createRoot } from "react-dom/client";
import SoloSessionRunner from "./SoloSessionRunner.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SoloSessionRunner />
  </React.StrictMode>
);

// The SW is skipWaiting + clientsClaim, but `autoUpdate` only looks for a new
// version on a fresh page load — an installed PWA that is never fully closed can
// sit on a stale build indefinitely. Poll for one, and reload when it takes over.
if ("serviceWorker" in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return; // first install claims the page; that is not an update
    reloading = true;
    location.reload();
  });
  const check = () => navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  setInterval(check, 60000);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
}
