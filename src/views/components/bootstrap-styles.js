class BootstrapStyle extends HTMLElement {
  constructor() {
    super();
    // Attach Shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });

    // Create the template structure
    const container = document.createElement('div');
    container.classList.add('container', 'mt-4'); // Standard Bootstrap classes

    // 1. Link Bootstrap CSS inside the Shadow DOM
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    linkElem.setAttribute('href', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');

    // 2. Add a Slot (where your HTML will go)
    const slot = document.createElement('slot');

    // Append everything
    container.appendChild(slot);
    shadow.appendChild(linkElem);
    shadow.appendChild(container);
  }
}

// Register the custom element
customElements.define('bootstrap-styles', BootstrapStyle);
