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
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
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
            <i data-lucide="external-link"></i> Open in ${rendererName}
          </button>
          <button class="btn btn-secondary ml-2" data-action="copy-json">
            <i data-lucide="copy"></i>
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