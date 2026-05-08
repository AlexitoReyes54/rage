class HtmxLib extends HTMLElement {
  connectedCallback() {
    // 1. Inject the Meta Config if it doesn't exist
    if (!document.querySelector('meta[name="htmx-config"]')) {
      const meta = document.createElement('meta');
      meta.name = "htmx-config";
      meta.content = JSON.stringify({ selfRequestsOnly: false });
      document.head.appendChild(meta);
    }

    // 2. Inject the HTMX Script if it doesn't exist
    if (!document.querySelector('script[src*="htmx.org"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js";
      script.integrity = "sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  }
}

// Register the custom element
customElements.define('htmx-lib', HtmxLib);
