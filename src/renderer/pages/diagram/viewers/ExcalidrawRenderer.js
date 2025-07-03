/**
 * Excalidraw-specific implementation of DiagramRenderer
 * Converts DiagramModel into Excalidraw format and handles rendering
 * 
 * Dependencies:
 * - React v19 (https://esm.sh/react@19.0.0)
 * - ReactDOM v19 (https://esm.sh/react-dom@19.0.0)
 * - Excalidraw v0.18.0 (https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/dev/index.js)
 */
class ExcalidrawRenderer extends DiagramRenderer {
  constructor(options = {}) {
    super({
      viewBackgroundColor: '#ffffff',
      ...options
    });
  }

  /**
   * Gets the name of this renderer
   * @returns {string} Renderer name
   */
  getRendererName() {
    return 'Excalidraw';
  }

  /**
   * Gets supported export formats
   * @returns {Array<string>} Array of supported formats
   */
  getSupportedFormats() {
    return ['json', 'excalidraw'];
  }

  /**
   * Checks if external opening is supported
   * @returns {boolean} True if supported
   */
  supportsExternalOpen() {
    return true;
  }

  /**
   * Renders diagram model with embedded Excalidraw component
   * @param {DiagramModel} model - Diagram model to render
   * @param {HTMLElement} container - Target container
   * @returns {Promise<RenderResult>} Render result
   */
  async render(model, container) {
    const validation = this.validateModel(model);
    if (!validation.isValid) {
      throw new Error(`Model validation failed: ${validation.errors.join(', ')}`);
    }

    const excalidrawData = this.convertToExcalidraw(model);
    
    // Load and render embedded Excalidraw
    await this.loadExcalidrawLibrary();
    await this.renderEmbeddedExcalidraw(container, excalidrawData);
    
    return new RenderResult(true, container.firstChild, null, {
      renderer: this.getRendererName(),
      nodeCount: model.nodes.length,
      connectionCount: model.connections.length,
      dataSize: JSON.stringify(excalidrawData).length
    });
  }

  /**
   * Exports diagram model to specified format
   * @param {DiagramModel} model - Diagram model to export
   * @param {string} format - Export format
   * @param {Object} exportOptions - Export options
   * @returns {Promise<ExportResult>} Export result
   */
  async export(model, format, exportOptions = {}) {
    try {
      const validation = this.validateModel(model);
      if (!validation.isValid) {
        throw new Error(`Model validation failed: ${validation.errors.join(', ')}`);
      }

      let data, mimeType;
      
      switch (format.toLowerCase()) {
        case 'json':
        case 'excalidraw':
          const excalidrawData = this.convertToExcalidraw(model);
          data = JSON.stringify(excalidrawData, null, 2);
          mimeType = 'application/json';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return new ExportResult(true, data, mimeType, null, {
        format: format,
        renderer: this.getRendererName(),
        originalSize: data.length
      });

    } catch (error) {
      console.error('ExcalidrawRenderer export error:', error);
      return new ExportResult(false, null, null, error.message);
    }
  }

  /**
   * Opens diagram in external Excalidraw application
   * @param {DiagramModel} model - Diagram model to open
   * @param {Object} openOptions - Open options
   * @returns {Promise<boolean>} Success status
   */
  async openExternal(model, openOptions = {}) {
    return false;
  }

  /**
   * Converts DiagramModel to Excalidraw format
   * @param {DiagramModel} model - Input diagram model
   * @returns {Object} Excalidraw-compatible data structure
   */
  convertToExcalidraw(model) {
    const skeletonElements = [];
    
    // Convert nodes to skeleton elements
    model.nodes.forEach((node) => {
      const position = model.layout.getNodePosition(node.componentId);
      if (position) {
        // Header rectangle
        skeletonElements.push({
          type: "rectangle",
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          strokeColor: node.getColorScheme().stroke,
          backgroundColor: node.getColorScheme().fill,
          fillStyle: "dashed",
          label: {
            text: node.name,
            textAlign: "center",
            verticalAlign: "middle",
            fontSize: 16,
            fontFamily: 1
          }
        });
        
        // Lifeline (dashed vertical line)
        skeletonElements.push({
          type: "line",
          x: position.x + position.width/2,
          y: position.y + position.height + 20,
          points: [[0, 0], [0, 580]],
          strokeColor: node.getColorScheme().stroke,
          strokeStyle: "dashed"
        });
        
        // Activation box (if configured)
        if (position.activation) {
          skeletonElements.push({
            type: "rectangle",
            x: position.x + position.width/2 - 5,
            y: position.activation.y,
            width: 10,
            height: position.activation.height,
            strokeColor: node.getColorScheme().stroke,
            backgroundColor: node.getColorScheme().fill
          });
        }
        
        // Detail box
        skeletonElements.push({
          type: "rectangle",
          x: position.detailX,
          y: position.detailY,
          width: 150,
          height: 120,
          strokeColor: "#1e1e1e",
          backgroundColor: "#ffffff",
          autoResize: true,
          label: {
            text: node.fields?.join('\n'),
            textAlign: "center",
            verticalAlign: "middle",
            fontSize: 14,
            fontFamily: 3
          }
        });
        

      }
    });
    
    // Add connection arrows
    model.connections.forEach((connection) => {
      if (connection.sourceId === 'external') {
        // External trigger arrow
        const targetPosition = model.layout.getNodePosition(connection.targetId);
        
        if (targetPosition) {
          const arrowStartX = Math.max(20, targetPosition.x - 60);
          const arrowEndX = targetPosition.x + targetPosition.width/2;
          const arrowWidth = arrowEndX - arrowStartX;
          
          skeletonElements.push({
            type: "arrow",
            x: arrowStartX,
            y: 360,
            points: [[0, 0], [arrowWidth, 0]],
            endArrowhead: "arrow"
          });
        }
      } else {
        // Internal dependency arrows
        const sourcePosition = model.layout.getNodePosition(connection.sourceId);
        const targetPosition = model.layout.getNodePosition(connection.targetId);
        
        if (sourcePosition && targetPosition) {
          const arrowY = 399 + connection.order * 40;
          const startX = sourcePosition.x + sourcePosition.width/2;
          const endX = targetPosition.x + targetPosition.width/2;
          
          skeletonElements.push({
            type: "arrow",
            x: startX,
            y: arrowY,
            points: [[0, 0], [endX - startX, 0]],
            endArrowhead: "arrow"
          });
        }
      }
    });
    
    // Convert skeleton elements to full Excalidraw elements
    const elements = window.ExcalidrawLib ?
      window.ExcalidrawLib.convertToExcalidrawElements(skeletonElements) :
      skeletonElements;
    
    return {
      type: "excalidraw",
      version: 2,
      source: model.metadata.source || "APIGov",
      scrollToContent: true,
      elements: elements,
      appState: {
        zoom: 0.6,
        scrollX: 300,
        scrollY: 100,
        gridSize: this.options.gridSize,
        viewBackgroundColor: this.options.viewBackgroundColor
      },
      files: {}
    };
  }

  /**
   * Loads the Excalidraw library using ESM imports
   * @returns {Promise} Promise that resolves when library is loaded
   */
  async loadExcalidrawLibrary() {
    // Libraries should already be loaded by the ES module script
    if (!window.React || !window.ReactDOM || !window.ExcalidrawLib) {
      throw new Error('Required libraries not loaded. Ensure import maps and ESM imports are properly configured in HTML.');
    }
  }

  /**
   * Renders the embedded Excalidraw diagram
   * @param {HTMLElement} container - Container element
   * @param {Object} excalidrawData - Excalidraw diagram data
   */
  async renderEmbeddedExcalidraw(container, excalidrawData) {
    if (!window.ExcalidrawLib || !window.React || !window.ReactDOM) {
      throw new Error('Excalidraw libraries not loaded');
    }

    const { Excalidraw } = window.ExcalidrawLib;
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    
    // Clear container and create React root
    container.innerHTML = '<div id="excalidraw-container" style="width: 100%; height: 600px;"></div>';
    const excalidrawContainer = container.querySelector('#excalidraw-container');
    
    // Create Excalidraw component with the generated data
    const ExcalidrawComponent = React.createElement(Excalidraw, {
      initialData: {
        elements: excalidrawData.elements,
        appState: {
          ...excalidrawData.appState,
          zenModeEnabled: false,
          gridSize: 10
        }
      },
      viewModeEnabled: false,
      theme: 'light'
    });
    
    // Render the component using React 19 createRoot API
    const root = ReactDOM.createRoot(excalidrawContainer);
    root.render(ExcalidrawComponent);
  }
}

// Register with module registry
(function() {
  'use strict';
  window.moduleRegistry.register('ExcalidrawRenderer', ExcalidrawRenderer);
})();