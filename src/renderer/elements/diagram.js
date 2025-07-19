class Diagram {
  constructor(renderer = DiagramRenderer) {
    this.containerId = null;
    this.model = null;
    this.renderer = renderer;
  }

  /**
   * Renders the diagram component
   * @param {string} containerId - ID of container element
   * @param {Object} options - Render options
   */
  async render(containerId, options = {}) {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[Diagram] Container not found:', containerId);
      return;
    }

    try {
      const components = await window.api.getComponents();
      
      // Create diagram model from components
      this.model = new DiagramModel(components);
      
      // Generate UI container
      container.innerHTML = this.generateHTML();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Render diagram using selected renderer
      await this.renderDiagram();
    } catch (error) {
      console.error('[Diagram] Render error:', error);
      container.innerHTML = '<div class="alert alert-error">Failed to load diagram: ' + error.message + '</div>';
    }
  }

  /**
   * Generates HTML for the display
   * @returns {string} HTML string
   */
  generateHTML() {
    const instanceId = `diagram_${Date.now()}`;
    const rendererName = this.renderer.getRendererName();
    
    return `
      <div class="diagram-container" data-instance-id="${instanceId}">
        <div class="mb-4">
          <button class="btn btn-primary" style="display:none" data-action="open-external">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5"> <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" /> <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" /> </svg> Open in ${rendererName}
          </button>
          <button class="btn btn-secondary ml-2" data-action="copy-json">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /> </svg>
            Copy JSON
          </button>
        </div>
        <div id="diagram-viewer-${instanceId}" class="diagram-viewer mb-4" style="border: 1px solid #e5e7eb; border-radius: 8px; background: white; min-height: 400px; display: block;">
          <div class="p-2 text-center text-gray-500">Loading ${rendererName} diagram...</div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the diagram using the selected renderer
   */
  async renderDiagram() {
    const container = document.querySelector('[data-instance-id]');
    if (!container) return;
    
    const instanceId = container.getAttribute('data-instance-id');
    const viewerElement = document.getElementById(`diagram-viewer-${instanceId}`);
    const jsonTextarea = container.querySelector('textarea');
    
    if (!viewerElement || !this.model) return;
    
    try {
      // Render using the current renderer
      const renderResult = await this.renderer.render(this.model, viewerElement);
      
      if (!renderResult.success) {
        console.error('Diagram render failed:', renderResult.error);
      }
      
      // Populate JSON textarea with model export
      if (jsonTextarea) {
        const exportResult = await this.renderer.export(this.model, 'json');
        if (exportResult.success) {
          jsonTextarea.value = exportResult.data;
        }
      }
      
    } catch (error) {
      console.error('Error rendering diagram:', error);
      viewerElement.innerHTML = '<div class="p-4 text-center text-red-500">Error loading diagram: ' + error.message + '</div>';
    }
  }

  /**
   * Sets up event listeners for diagram controls
   */
  setupEventListeners() {
    const container = document.querySelector('[data-instance-id]');
    if (!container) return;
    
    container.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-action]')?.getAttribute('data-action');
      
      switch (action) {
        case 'open-external':
          await this.openExternal();
          break;
        case 'copy-json':
          await this.copyJSON(container);
          break;
      }
    });
  }
  
  /**
   * Opens the diagram in external application using current renderer
   */
  async openExternal() {
    if (!this.model || !this.renderer) {
      console.error('No model or renderer available for external opening');
      return;
    }

    if (!this.renderer.supportsExternalOpen()) {
      console.warn(`${this.renderer.getRendererName()} does not support external opening`);
      return;
    }

    try {
      const success = await this.renderer.openExternal(this.model);
      if (!success) {
        console.warn('Failed to open diagram externally');
      }
    } catch (error) {
      console.error('Error opening diagram externally:', error);
    }
  }
  
  /**
   * Copies JSON to clipboard
   * @param {HTMLElement} container - Container element
   */
  async copyJSON(container) {
    const textarea = container.querySelector('textarea');
    if (textarea) {
      await navigator.clipboard.writeText(textarea.value);
    }
  }
}

// Register with module registry
(function() {
  'use strict';
  window.moduleRegistry.register('Diagram', Diagram, ["DiagramRenderer"]);
})();