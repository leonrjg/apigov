(function() {
  'use strict';

  class AppController {
    constructor() {
      this.dataController = null;
      this.graphController = null;
      this.uiController = null;
      this.initialized = false;
    }

    async initialize() {
      if (this.initialized) return;

      try {
        // Get dependencies
        const DataController = window.requireModule('DataController');
        const GraphController = window.requireModule('GraphController');
        const UIController = window.requireModule('UIController');

        if (!DataController || !GraphController || !UIController) {
          console.error('AppController: Missing required controllers');
          return;
        }

        // Initialize controllers
        this.dataController = DataController;
        this.graphController = GraphController;
        this.uiController = new UIController(this.dataController, this.graphController);

        this.initialized = true;
              } catch (error) {
        console.error('Error initializing AppController:', error);
      }
    }

    async renderComponents() {
      if (!this.initialized) await this.initialize();
      if (this.uiController) {
        await this.uiController.renderComponents();
      }
    }

    async renderGraphView() {
      if (!this.initialized) await this.initialize();
      if (this.uiController) {
        await this.uiController.renderGraphView();
      }
    }
  }

  const appController = new AppController();

  // Export global functions for backward compatibility
  window.renderComponents = async () => {
    await appController.renderComponents();
  };

  window.renderGraphView = async () => {
    await appController.renderGraphView();
  };

  window.moduleRegistry.register('AppController', appController);
})();