// frontend/desktop/src/scripts/componentLoader.js
export async function loadComponent(selector, path) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(path);
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.error("Error loading component", path, err);
  }
}

// Use this to init menu and topbar and then dispatch an event so other scripts can run after.
// Example in pages: call initPage() then other scripts should wait for 'componentsLoaded' event.
export async function initLayout() {
  await loadComponent("#menu-container", "../components/menu.html");
  await loadComponent("#topbar-container", "../components/topbar.html");
  // dispatch event so page-specific scripts can setup listeners after components exist
  document.dispatchEvent(new Event("componentsLoaded"));
}