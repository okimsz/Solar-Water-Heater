(() => {
  const status = document.getElementById("startupStatus");
  let rendered = false,
    failed = false;
  function fail(message) {
    if (failed) return;
    failed = true;
    status.hidden = true;
    const panel = document.createElement("div");
    panel.className = "startup-error";
    panel.id = "startupError";
    panel.setAttribute("role", "alert");
    const text = document.createElement("p");
    text.textContent = "3D startup problem: " + message;
    const button = document.createElement("button");
    button.textContent = "Reload";
    button.onclick = () => location.reload();
    panel.append(text, button);
    document.getElementById("stage").appendChild(panel);
  }
  window.__solarStartup = {
    fail,
    ready() {
      rendered = true;
      status.hidden = true;
    },
  };
  window.addEventListener(
    "error",
    (event) => {
      if (event.target?.src)
        fail(
          "A required script did not load. Use the local server or the complete offline HTML.",
        );
      else if (event.message) fail(event.message);
    },
    true,
  );
  window.addEventListener("unhandledrejection", (e) =>
    fail(String(e.reason?.message || e.reason)),
  );
  setTimeout(() => {
    if (!rendered && !failed)
      status.textContent =
        "The 3D view has not started. Reload the page, or open the complete offline HTML in a WebGL-enabled browser.";
  }, 8000);
})();
