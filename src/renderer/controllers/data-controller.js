(function() {
  'use strict';

  class DataController {
    constructor() {
    }

    async getComponents() {
      return window.api.getComponents();
    }

    async deleteComponent(id) {
      try {
        await window.api.deleteComponent(id);
        return true;
      } catch (error) {
        console.error('Error deleting component:', error);
        return false;
      }
    }

    async cloneComponent(id) {
      try {
        return await window.api.cloneComponent(id);
      } catch (error) {
        console.error('Error cloning component:', error);
        return null;
      }
    }

    async findComponentById(id) {
      return (await this.getComponents()).find(comp => comp.id === id);
    }

    async findComponentsConsuming(componentId) {
      return (await this.getComponents()).filter(comp =>
        comp.consumes && comp.consumes.includes(componentId)
      );
    }
  }

  const dataController = new DataController();

  window.moduleRegistry.register('DataController', dataController);
})();