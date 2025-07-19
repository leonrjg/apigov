class Mapping {
  constructor() {
    this.onMappingChanged = null;
  }

  /**
   * Set callback for mapping changes
   * @param {Function} callback - Callback function to call when mappings change
   */
  setOnMappingChanged(callback) {
    this.onMappingChanged = callback;
  }

  /**
   * Creates a field mapping from autocomplete selection
   * @param {string} targetField - Target field that needs mapping
   * @param {string} targetComponentName - Component that needs the field
   * @param {Object} selectedFieldObj - Selected field from autocomplete
   * @param {Array} allComponents - All available components
   * @param {string} currentComponentId - ID of component being edited
   * @param {string} currentComponentName - Name of component being edited
   * @returns {Object} Created mapping object or null if invalid
   */
  createFieldMapping(targetField, targetComponentName, selectedFieldObj, allComponents, currentComponentId, currentComponentName) {
    // Validate inputs
    const validation = this.validateMappingInputs(targetField, targetComponentName, selectedFieldObj, allComponents, currentComponentId);
    if (!validation.isValid) {
      console.error('[MappingService] Validation failed:', validation.error);
      return null;
    }

    const { targetComponent, sourceField, sourceComponentName } = validation;

    // Build base mapping
    const mapping = {
      target_component_id: targetComponent.id,
      target_field: targetField,
      source_field: sourceField
    };

    // Add source component ID if it's a cross-component mapping
    if (sourceComponentName !== currentComponentName) {
      const sourceComponent = allComponents.find(comp => comp.name === sourceComponentName);
      if (sourceComponent) {
        mapping.source_component_id = sourceComponent.id;
      } else {
        return null;
      }
    }

    return mapping;
  }

  /**
   * Validates inputs for mapping creation
   * @param {string} targetField - Target field
   * @param {string} targetComponentName - Target component name
   * @param {Object} selectedFieldObj - Selected field object
   * @param {Array} allComponents - All components
   * @param {string} currentComponentId - Current component ID
   * @returns {Object} Validation result
   */
  validateMappingInputs(targetField, targetComponentName, selectedFieldObj, allComponents, currentComponentId) {
    if (!targetField) {
      return { isValid: false, error: 'Missing target field' };
    }

    if (!targetComponentName) {
      return { isValid: false, error: 'Missing target component name' };
    }

    if (!selectedFieldObj || typeof selectedFieldObj !== 'object') {
      return { isValid: false, error: 'Invalid selected field object' };
    }

    if (!currentComponentId) {
      return { isValid: false, error: 'Current component ID is required' };
    }

    const targetComponent = allComponents.find(comp => comp.name === targetComponentName);
    if (!targetComponent) {
      return { 
        isValid: false, 
        error: `Target component not found: ${targetComponentName}`,
        availableComponents: allComponents.map(c => c.name)
      };
    }

    const sourceField = selectedFieldObj.field;
    const sourceComponentName = selectedFieldObj.source;

    if (!sourceField) {
      return { isValid: false, error: 'Missing field property in selected field object' };
    }

    if (!sourceComponentName) {
      return { isValid: false, error: 'Missing source property in selected field object' };
    }

    return {
      isValid: true,
      targetComponent,
      sourceField,
      sourceComponentName
    };
  }

  /**
   * Adds a mapping to the mappings array
   * @param {Array} mappings - Current mappings array
   * @param {Object} newMapping - New mapping to add
   * @returns {Array} Updated mappings array
   */
  addMapping(mappings, newMapping) {
    if (!newMapping) {
      console.error('[MappingService] Cannot add null mapping');
      return mappings;
    }

    const updatedMappings = [...mappings, newMapping];

    if (this.onMappingChanged) {
      this.onMappingChanged(updatedMappings);
    }

    return updatedMappings;
  }

  /**
   * Removes a mapping from the mappings array
   * @param {Array} mappings - Current mappings array
   * @param {Object} mappingToRemove - Mapping to remove
   * @returns {Array} Updated mappings array
   */
  removeMapping(mappings, mappingToRemove) {
    const index = mappings.findIndex(m => 
      m.target_component_id === mappingToRemove.target_component_id &&
      m.target_field === mappingToRemove.target_field && 
      m.source_field === mappingToRemove.source_field
    );
    
    if (index === -1) {
      console.warn('[MappingService] Mapping not found for removal:', mappingToRemove);
      return mappings;
    }

    const updatedMappings = mappings.filter((_, i) => i !== index);

    if (this.onMappingChanged) {
      this.onMappingChanged(updatedMappings);
    }

    return updatedMappings;
  }

  /**
   * Cleans up mappings for a deleted field
   * @param {Array} mappings - Current mappings array
   * @param {string} deletedFieldPath - Path of deleted field
   * @returns {Array} Updated mappings array
   */
  cleanupMappingsForDeletedField(mappings, deletedFieldPath) {
    const originalLength = mappings.length;
    const updatedMappings = mappings.filter(mapping => 
      mapping.target_field !== deletedFieldPath && mapping.source_field !== deletedFieldPath
    );
    
    if (updatedMappings.length !== originalLength && this.onMappingChanged) {
      this.onMappingChanged(updatedMappings);
    }

    return updatedMappings;
  }

  /**
   * Checks if a field has an existing mapping
   * @param {Array} mappings - Current mappings array
   * @param {string} targetComponentId - Target component ID
   * @param {string} targetField - Target field
   * @returns {boolean} True if mapping exists
   */
  hasMapping(mappings, targetComponentId, targetField) {
    return mappings.some(mapping => 
      mapping.target_component_id === targetComponentId && 
      mapping.target_field === targetField
    );
  }

  /**
   * Gets mappings for a specific component
   * @param {Array} mappings - All mappings
   * @param {string} componentId - Component ID to filter by
   * @param {string} type - 'target' or 'source' to specify which side to filter
   * @returns {Array} Filtered mappings
   */
  getMappingsForComponent(mappings, componentId, type = 'target') {
    if (type === 'target') {
      return mappings.filter(mapping => mapping.target_component_id === componentId);
    } else if (type === 'source') {
      return mappings.filter(mapping => mapping.source_component_id === componentId);
    }
    return [];
  }

  /**
   * Validates that all required mappings exist
   * @param {Array} mappings - Current mappings
   * @param {Array} requiredFields - Required field mappings
   * @returns {Object} Validation result
   */
  validateMappingCompleteness(mappings, requiredFields) {
    const missingMappings = requiredFields.filter(required => 
      !this.hasMapping(mappings, required.componentId, required.field)
    );

    return {
      isComplete: missingMappings.length === 0,
      missingMappings,
      totalRequired: requiredFields.length,
      totalMapped: requiredFields.length - missingMappings.length
    };
  }
}

// Register service with module system
(function() {
  'use strict';
  window.moduleRegistry.register('MappingService', Mapping);
})();