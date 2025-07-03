/**
 * Abstract base class for diagram renderers
 * Defines the interface that all diagram renderers must implement
 */
class DiagramRenderer {
  constructor(options = {}) {
    this.options = {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      ...options
    };
  }

  /**
   * Renders a diagram model to a container element
   * @param {DiagramModel} model - The diagram model to render
   * @param {HTMLElement} container - Target container element
   * @param {Object} renderOptions - Renderer-specific options
   * @returns {Promise<RenderResult>} Promise that resolves to render result
   * @abstract
   */
  async render(model, container, renderOptions = {}) {
    throw new Error('DiagramRenderer.render() must be implemented by subclass');
  }

  /**
   * Exports the diagram in a specific format
   * @param {DiagramModel} model - The diagram model to export
   * @param {string} format - Export format ('json', 'png', 'svg', etc.)
   * @param {Object} exportOptions - Export-specific options
   * @returns {Promise<ExportResult>} Promise that resolves to export result
   * @abstract
   */
  async export(model, format, exportOptions = {}) {
    throw new Error('DiagramRenderer.export() must be implemented by subclass');
  }

  /**
   * Gets available export formats for this renderer
   * @returns {Array<string>} Array of supported format strings
   * @abstract
   */
  getSupportedFormats() {
    throw new Error('DiagramRenderer.getSupportedFormats() must be implemented by subclass');
  }

  /**
   * Gets the name/type of this renderer
   * @returns {string} Renderer name
   * @abstract
   */
  getRendererName() {
    throw new Error('DiagramRenderer.getRendererName() must be implemented by subclass');
  }

  /**
   * Checks if this renderer can open diagrams in external applications
   * @returns {boolean} True if external opening is supported
   */
  supportsExternalOpen() {
    return false;
  }

  /**
   * Opens the diagram in an external application
   * @param {DiagramModel} model - The diagram model to open
   * @param {Object} openOptions - Options for external opening
   * @returns {Promise<boolean>} Promise that resolves to success status
   */
  async openExternal(model, openOptions = {}) {
    throw new Error('External opening not supported by this renderer');
  }

  /**
   * Validates that a model is compatible with this renderer
   * @param {DiagramModel} model - The diagram model to validate
   * @returns {ValidationResult} Validation result
   */
  validateModel(model) {
    const errors = [];
    const warnings = [];

    if (!model) {
      errors.push('Model is required');
      return new ValidationResult(false, errors, warnings);
    }

    if (!model.nodes || !Array.isArray(model.nodes)) {
      errors.push('Model must have nodes array');
    }

    if (!model.connections || !Array.isArray(model.connections)) {
      errors.push('Model must have connections array');
    }

    if (model.nodes.length === 0) {
      warnings.push('Model has no nodes to render');
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Utility method to create a clean ID from a string
   * @param {string} name - Input name
   * @returns {string} Clean ID
   */
  createCleanId(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '');
  }
}

/**
 * Result object for render operations
 */
class RenderResult {
  constructor(success, element = null, error = null, metadata = {}) {
    this.success = success;
    this.element = element;
    this.error = error;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Result object for export operations
 */
class ExportResult {
  constructor(success, data = null, mimeType = null, error = null, metadata = {}) {
    this.success = success;
    this.data = data;
    this.mimeType = mimeType;
    this.error = error;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Result object for validation operations
 */
class ValidationResult {
  constructor(isValid, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = errors;
  }
}

// Register with module registry
(function() {
  'use strict';

    window.moduleRegistry.register('DiagramRenderer', DiagramRenderer);
    window.moduleRegistry.register('RenderResult', RenderResult);
    window.moduleRegistry.register('ExportResult', ExportResult);
    window.moduleRegistry.register('ValidationResult', ValidationResult);
})();