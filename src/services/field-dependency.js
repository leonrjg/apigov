class FieldDependency {
  constructor() {
    // Pure business logic service - no UI dependencies
    this.DependencyUtils = window.requireModule('DependencyUtils');
  }

  /**
   * Validates field dependencies and returns missing fields data
   * @param {Object} component - Component to validate
   * @param {Array} allComponents - All available components
   * @param {Array} currentFields - Current component's fields
   * @returns {Object} Validation result with missing fields
   */
  async validateFieldDependencies(component, allComponents, currentFields) {
    if (!component.consumes || component.consumes.length === 0) {
      return {
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      };
    }
    console.log(component);

    const dependencyCheck = await this.DependencyUtils.check(component.id);

    if (!dependencyCheck.hasMissingDependencies) {
      return {
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      };
    }

    const missingFields = this.buildMissingFieldsData(component, allComponents, currentFields);

    return {
      hasValidDependencies: missingFields.length === 0,
      missingFields,
      hasMissingDependencies: missingFields.length > 0
    };
  }

  /**
   * Builds data structure for missing fields
   * @param {Object} component - Component to analyze
   * @param {Array} allComponents - All available components
   * @param {Array} currentFields - Current component's fields
   * @returns {Array} Array of missing field objects
   */
  buildMissingFieldsData(component, allComponents, currentFields) {
    const missingFields = [];

    component.consumes.forEach(consumedComponentId => {
      const consumedComponent = allComponents.find(comp => comp.id === consumedComponentId);
      if (!consumedComponent || !consumedComponent.input || consumedComponent.type !== 'endpoint') return;

      const consumedFields = this.DependencyUtils.getFieldPaths(consumedComponent.input);
      
      consumedFields.forEach(field => {
        if (!this.isFieldResolved(field, consumedComponent, component, allComponents, currentFields)) {
          missingFields.push({
            field: field,
            fromComponent: consumedComponent.name,
            fromComponentId: consumedComponent.id
          });
        }
      });
    });

    return missingFields;
  }

  /**
   * Checks if a field is resolved through current fields or mappings
   * @param {string} field - Field to check
   * @param {Object} consumedComponent - Component that provides the field
   * @param {Object} currentComponent - Current component being edited
   * @param {Array} allComponents - All available components
   * @param {Array} currentFields - Current component's fields
   * @returns {boolean} True if field is resolved
   */
  isFieldResolved(field, consumedComponent, currentComponent, allComponents, currentFields) {
    // Check if field exists in current component
    if (currentFields.includes(field)) {
      return true;
    }

    // Check if field is available in other consumed components
    if (this.isFieldAvailableInConsumedComponents(field, consumedComponent.name, currentComponent.consumes, allComponents)) {
      return true;
    }

    // Check if field has a mapping
    if (currentComponent.mappings) {
      const hasMapping = currentComponent.mappings.some(mapping => 
        mapping.target_component_id === consumedComponent.id && 
        mapping.target_field === field
      );
      if (hasMapping) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if field is available in consumed components
   * @param {string} field - Field to check
   * @param {string} excludeComponentName - Component to exclude from search
   * @param {Array} selectedTags - Selected component tags
   * @param {Array} allComponents - All available components
   * @returns {boolean} True if field is available
   */
  isFieldAvailableInConsumedComponents(field, excludeComponentName, selectedTags, allComponents) {
    const excludeComponentId = this.getComponentIdByName(excludeComponentName, allComponents);
    return this.DependencyUtils.isFieldAvailableInConsumedComponents(field, excludeComponentId, selectedTags, allComponents);
  }

  /**
   * Gets component ID by name
   * @param {string} name - Component name
   * @param {Array} allComponents - All available components
   * @returns {string|null} Component ID or null if not found
   */
  getComponentIdByName(name, allComponents) {
    const component = allComponents.find(comp => comp.name === name);
    return component ? component.id : null;
  }

  /**
   * Validates component type for dependency checking
   * @param {string} componentType - Type to validate
   * @returns {boolean} True if type requires dependency checking
   */
  requiresDependencyValidation(componentType) {
    return componentType === 'endpoint';
  }
  /**
   * Gets all missing mappings across all components
   * @param {Array} components - All components
   * @returns {Array} Array of missing mapping objects
   */
  async getAllMissingMappings(components) {
    const missingMappings = [];

    for (const component of components) {
      if (component.type !== 'endpoint' || !component.consumes || component.consumes.length === 0) {
        continue;
      }

      const dependencyCheck = await this.DependencyUtils.checkComponentDependencies(component.id);
      
      if (dependencyCheck.hasMissingDependencies) {
        dependencyCheck.missingFields.forEach(missingFieldStr => {
          const match = missingFieldStr.match(/^(.+) \(from (.+)\)$/);
          if (match) {
            const [, fieldName, fromComponentName] = match;
            const fromComponent = components.find(comp => comp.name === fromComponentName);
            
            missingMappings.push({
              componentName: component.name,
              componentId: component.id,
              missingField: fieldName,
              fromComponent: fromComponentName,
              fromComponentId: fromComponent ? fromComponent.id : null
            });
          }
        });
      }
    }

    return missingMappings;
  }
}

// Register service with module system
(function() {
  'use strict';

  window.moduleRegistry.register('DependencyValidationService', FieldDependency, ['DependencyUtils']);
})();