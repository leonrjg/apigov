(function() {
  'use strict';

  class DataController {
    constructor() {
      this.Component = window.requireModule('ComponentModel');
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

    /**
     * Finds all occurrences of current component's fields being used in other components' mappings
     * @param {string} currentComponentId - ID of the current component
     * @param {Array} allComponents - Array of all components
     * @returns {Array} Array of field usage objects
     */
    findFieldUsageInOtherComponents(currentComponentId, allComponents) {
      const currentComponent = allComponents.find(c => c.id === currentComponentId);
      if (!currentComponent) return [];

      const currentFields = [
        ...this.Component.getFieldPaths(currentComponent.input || {}),
        ...this.Component.getFieldPaths(currentComponent.output || {})
      ];

      return allComponents
          .filter(component => component.id !== currentComponentId)
          .flatMap(component =>
              (component.mappings || [])
                  .filter(mapping =>
                      mapping.source_component_id === currentComponentId &&
                      currentFields.includes(mapping.source_field)
                  )
                  .map(mapping => ({
                    field: mapping.source_field,
                    usedByComponent: component.name,
                    usedByComponentId: component.id,
                    mappedToField: mapping.target_field
                  }))
          );
    }

    /**
     * Gets available fields for mapping
     * @param {string} componentId - Target component ID
     * @param {string} targetComponentName - Target component name
     * @returns {Promise<Array>} Available field objects
     */
    async getAvailableFieldsForMapping(componentId, targetComponentName) {
      const availableFields = [];

      const allComponents = await this.getComponents();

      // Get current component
      const currentComponent = allComponents.find(c => c.id === componentId);
      if (!currentComponent) {
        return availableFields;
      }

      // Add fields from current component's input and output
      const currentInputFields = this.Component.getFieldPaths(currentComponent.input || {});
      const currentOutputFields = this.Component.getFieldPaths(currentComponent.output || {});

      currentInputFields.forEach(fieldPath => {
        availableFields.push({
          field: fieldPath,
          source: currentComponent.name,
          sourceId: currentComponent.id,
          display: `${fieldPath} (from ${currentComponent.name})`
        });
      });

      currentOutputFields.forEach(fieldPath => {
        availableFields.push({
          field: fieldPath,
          source: currentComponent.name,
          sourceId: currentComponent.id,
          display: `${fieldPath} (from ${currentComponent.name})`
        });
      });

      // Add fields from consumed components (their outputs)
      if (currentComponent.consumes) {
        currentComponent.consumes.forEach(consumedId => {
          const consumedComponent = allComponents.find(c => c.id === consumedId);
          if (consumedComponent && consumedComponent.name !== targetComponentName) {
            const outputFields = this.Component.getFieldPaths(consumedComponent.output || {});
            outputFields.forEach(fieldPath => {
              availableFields.push({
                field: fieldPath,
                source: consumedComponent.name,
                sourceId: consumedComponent.id,
                display: `${fieldPath} (from ${consumedComponent.name})`
              });
            });
          }
        });
      }

      return availableFields;
    }

    /**
     * Groups missing mappings by component
     * @param {Array} missingMappings - Missing mappings array
     * @returns {Object} Grouped mappings
     */
    groupMappingsByComponent(missingMappings) {
      return missingMappings.reduce((groups, mapping) => {
        const component = mapping.componentName;
        if (!groups[component]) {
          groups[component] = [];
        }
        groups[component].push(mapping);
        return groups;
      }, {});
    }
  }

  const dataController = new DataController();
  window.moduleRegistry.register('DataController', dataController, ['Component']);
})();