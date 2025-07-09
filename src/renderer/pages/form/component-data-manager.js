class ComponentDataManager {
  constructor() {
    this.currentComponentData = null;
    this.editor = null;
    this.onDataChangeCallbacks = [];
    this.currentView = 'input'; // 'input' or 'output'
  }

  setEditor(editor) {
    this.editor = editor;
  }

  onDataChange(callback) {
    this.onDataChangeCallbacks.push(callback);
  }

  notifyDataChange(data) {
    this.onDataChangeCallbacks.forEach(callback => callback(data));
  }

  setComponentData(data) {
    this.currentComponentData = data ? { ...data } : { input: {}, output: {} };
  }

  getComponentData() {
    return this.currentComponentData;
  }

  getCurrentData() {
    try {
      return this.editor ? this.editor.get() : {};
    } catch (e) {
      return {};
    }
  }

  getCurrentFields() {
    try {
      const currentData = this.getCurrentData();
      return window.DependencyUtils.getFieldPaths(currentData);
    } catch (e) {
      return [];
    }
  }

  updateDisplay() {
    const dataToShow = this.currentView === 'input' 
      ? (this.currentComponentData?.input || {})
      : (this.currentComponentData?.output || {});
        this.editor.set(dataToShow);
    this.notifyDataChange(dataToShow);
    return dataToShow;
  }

  updateCurrentComponentData(jsonData) {
    if (!this.currentComponentData) return;
    if (this.currentView === 'input') {
      this.currentComponentData.input = jsonData;
    } else {
      this.currentComponentData.output = jsonData;
    }
  }

  initializeForEdit(component) {
    this.setComponentData(component);
    if (this.editor) {
      return this.updateDisplay();
    }
    return null;
  }

  switchToView(view) {
        if (this.currentView === view) return;
    
    // Save current editor content to the current view
    if (this.editor && this.currentComponentData) {
      const currentData = this.getCurrentData();
            if (this.currentView === 'input') {
        this.currentComponentData.input = currentData;
      } else {
        this.currentComponentData.output = currentData;
      }
    }
    
    // Switch view and update display
    this.currentView = view;
        if (this.editor) {
      this.updateDisplay();
    }
  }

  getCurrentView() {
    return this.currentView;
  }

  prepareForSubmission() {
    // Save current editor content before submission
    if (this.editor && this.currentComponentData) {
      const currentData = this.getCurrentData();
      if (this.currentView === 'input') {
        this.currentComponentData.input = currentData;
      } else {
        this.currentComponentData.output = currentData;
      }
    }
    
    return {
      input: this.currentComponentData ? this.currentComponentData.input : {},
      output: this.currentComponentData ? this.currentComponentData.output : {}
    };
  }
}

// Register with module system
(function() {
  'use strict';
  window.moduleRegistry.register('ComponentDataManager', ComponentDataManager);
})();