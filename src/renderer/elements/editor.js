/**
 * Utility for initializing and managing JSON editors across the application
 * Follows architecture principles: single responsibility, explicit dependencies
 */
const Editor = {
  /**
   * Initialize a JSON editor with common configuration
   * @param {string} containerId - ID of the container element
   * @param {Object} options - Configuration options
   * @param {string} options.mode - Editor mode (default: 'code')
   * @param {boolean} options.mainMenuBar - Show main menu bar (default: false)
   * @param {boolean} options.navigationBar - Show navigation bar (default: false)
   * @param {Function} options.onChange - Change callback function
   * @returns {Object|null} - JSONEditor instance or null if failed
   */
  initializeEditor: function(containerId, options = {}) {
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error(`JSON editor container not found: ${containerId}`);
      return null;
    }
    
    if (!window.JSONEditor) {
      console.error('JSONEditor not available');
      return null;
    }

        
    const config = {
      mode: options.mode || 'code',
      mainMenuBar: options.mainMenuBar !== undefined ? options.mainMenuBar : false,
      navigationBar: options.navigationBar !== undefined ? options.navigationBar : false,
      ...options
    };

    try {
      const editor = new JSONEditor(container, config);
            return editor;
    } catch (error) {
      console.error(`Failed to initialize JSON Editor for ${containerId}:`, error);
      return null;
    }
  },

  /**
   * Safely set data in a JSON editor
   * @param {Object} editor - JSONEditor instance
   * @param {Object} data - Data to set
   */
  setEditorData: function(editor, data) {
    if (!editor) {
      console.error('Editor instance not provided');
      return;
    }

    try {
      editor.set(data || {});
    } catch (error) {
      console.error('Failed to set editor data:', error);
      editor.set({});
    }
  },

  /**
   * Safely get data from a JSON editor
   * @param {Object} editor - JSONEditor instance
   * @returns {Object|null} - Editor data or null if failed
   */
  getEditorData: function(editor) {
    if (!editor) {
      console.error('Editor instance not provided');
      return null;
    }

    try {
      return editor.get();
    } catch (error) {
      console.error('Failed to get editor data:', error);
      return null;
    }
  }
};

// Register with module system
(function() {
  'use strict';
  window.moduleRegistry.register('JsonEditorUtils', Editor);
})();