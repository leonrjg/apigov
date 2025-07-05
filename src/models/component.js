// Centralized component entity model and validation

class Component {
  constructor(data = {}) {
    // Apply defaults and validate
    const processedData = this.constructor.applyDefaults(data);
    
    // Generate ID if needed and not provided
    if (!processedData.id && !data.skipIdGeneration) {
      processedData.id = this.constructor.generateId();
    }
    
    // Validate the data
    this.constructor.validate(processedData);
    
    // Assign properties to the instance
    Object.assign(this, processedData);
  }

  // Define the canonical component schema
  static schema = {
    id: { type: 'string', required: false, generated: true }, // UUID, auto-generated
    name: { type: 'string', required: true, minLength: 1 },
    type: { type: 'string', required: true, enum: ['endpoint', 'database_table'], default: 'endpoint' },
    input: { type: 'object', required: false, default: {} },
    output: { type: 'object', required: false, default: {} },
    consumes: { type: 'array', required: false, default: [], items: { type: 'string' } },
    mappings: { type: 'array', required: false, default: [] },
    color: { type: 'string', required: false }
  };

  // Component types enum
  static types = {
    ENDPOINT: 'endpoint',
    DATABASE_TABLE: 'database_table'
  };

  /**
   * Create a new component with validated data
   * @param {Object} data - Component data
   * @param {boolean} generateId - Whether to generate a new ID
   * @returns {Object} Validated component object
   */
  static create(data = {}, generateId = true) {
    const component = this.applyDefaults(data);
    
    if (generateId && !component.id) {
      component.id = this.generateId();
    }
    
    this.validate(component);
    return component;
  }

  /**
   * Update an existing component with validated data
   * @param {Object} existing - Existing component
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated component object
   */
  static update(existing, updates) {
    const component = { ...existing, ...updates };
    this.validate(component);
    return component;
  }

  /**
   * Clone a component with a new ID and modified name
   * @param {Object} source - Source component to clone
   * @param {string} namePrefix - Prefix for the new name (default: "Copy of ")
   * @returns {Object} Cloned component
   */
  static clone(source, namePrefix = 'Copy of ') {
    const cloned = { ...source };
    cloned.id = this.generateId();
    cloned.name = `${namePrefix}${source.name}`;
    
    this.validate(cloned);
    return cloned;
  }

  /**
   * Apply default values to component data
   * @param {Object} data - Component data
   * @returns {Object} Component with defaults applied
   */
  static applyDefaults(data) {
    const component = { ...data };
    
    Object.entries(this.schema).forEach(([field, config]) => {
      if (component[field] === undefined && config.hasOwnProperty('default')) {
        component[field] = typeof config.default === 'object' 
          ? JSON.parse(JSON.stringify(config.default)) 
          : config.default;
      }
    });
    
    return component;
  }

  /**
   * Validate a component object against the schema
   * @param {Object} component - Component to validate
   * @throws {Error} If validation fails
   */
  static validate(component) {
    const errors = [];

    Object.entries(this.schema).forEach(([field, config]) => {
      const value = component[field];

      // Check required fields
      if (config.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field}' is required`);
        return;
      }

      // Skip validation for undefined optional fields
      if (value === undefined) return;

      // Type validation
      if (!this.validateType(value, config.type)) {
        errors.push(`Field '${field}' must be of type ${config.type}`);
      }

      // Enum validation
      if (config.enum && !config.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${config.enum.join(', ')}`);
      }

      // String length validation
      if (config.type === 'string' && config.minLength && value.length < config.minLength) {
        errors.push(`Field '${field}' must be at least ${config.minLength} characters long`);
      }

      // Array items validation
      if (config.type === 'array' && config.items && Array.isArray(value)) {
        value.forEach((item, index) => {
          if (!this.validateType(item, config.items.type)) {
            errors.push(`Field '${field}[${index}]' must be of type ${config.items.type}`);
          }
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Component validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate a value against a type
   * @param {*} value - Value to validate
   * @param {string} type - Expected type
   * @returns {boolean} Whether the value matches the type
   */
  static validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'number':
        return typeof value === 'number';
      default:
        return true;
    }
  }

  /**
   * Generate a new UUID for components
   * @returns {string} UUID string
   */
  static generateId() {
    // Use crypto.randomUUID if available (Node.js 14.17.0+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback to a simple UUID v4 implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate a random color for new components
   * @returns {string} Hex color string
   */
  static generateRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Validate mapping integrity across components
   * @param {Array} components - Array of components
   * @returns {Array} Array of validation errors
   */
  static validateMappings(components) {
    const componentIds = new Set(components.map(c => c.id));
    const errors = [];

    components.forEach(component => {
      if (!component.mappings) return;

      Object.entries(component.mappings).forEach(([targetComponentId, mappingArray]) => {
        if (!Array.isArray(mappingArray)) return;

        // Check if target component ID exists
        if (!componentIds.has(targetComponentId)) {
          errors.push({
            component: component.name,
            componentId: component.id,
            error: `Invalid target component ID in mappings: ${targetComponentId}`,
            targetId: targetComponentId
          });
        }

        // Check if target component is in consumes array
        if (component.consumes && !component.consumes.includes(targetComponentId)) {
          errors.push({
            component: component.name,
            componentId: component.id,
            error: `Target component ID ${targetComponentId} not in consumes array`,
            targetId: targetComponentId
          });
        }

        mappingArray.forEach((mapping) => {
          // Validate mapping structure
          if (!mapping.target_field || !mapping.source_field) {
            errors.push({
              component: component.name,
              componentId: component.id,
              error: 'Mapping must have both target_field and source_field',
              mapping: mapping,
              targetId: targetComponentId
            });
          }

          // Check if source_component_id exists (if specified)
          if (mapping.source_component_id && !componentIds.has(mapping.source_component_id)) {
            errors.push({
              component: component.name,
              componentId: component.id,
              error: `Invalid source_component_id: ${mapping.source_component_id}`,
              mapping: mapping,
              targetId: targetComponentId
            });
          }
        });
      });
    });

    return errors;
  }

  /**
   * Clean orphaned mappings from components after deletion
   * @param {Array} components - Array of components
   * @param {string} deletedComponentId - ID of the deleted component
   * @returns {Array} Updated components array
   */
  static cleanOrphanedMappings(components, deletedComponentId) {
    return components.map(component => {
      if (!component.mappings) return component;

      const updatedComponent = { ...component };
      
      // Remove mappings targeting the deleted component
      if (updatedComponent.mappings[deletedComponentId]) {
        delete updatedComponent.mappings[deletedComponentId];
      }

      // Remove mappings that reference the deleted component as source
      Object.keys(updatedComponent.mappings).forEach(targetId => {
        if (Array.isArray(updatedComponent.mappings[targetId])) {
          updatedComponent.mappings[targetId] = updatedComponent.mappings[targetId].filter(
            mapping => mapping.source_component_id !== deletedComponentId
          );
          
          // Remove empty mapping arrays
          if (updatedComponent.mappings[targetId].length === 0) {
            delete updatedComponent.mappings[targetId];
          }
        }
      });

      // Remove deleted component from consumes array
      if (updatedComponent.consumes) {
        updatedComponent.consumes = updatedComponent.consumes.filter(id => id !== deletedComponentId);
      }

      return updatedComponent;
    });
  }

  /**
   * Get field paths from a component's input or output schema
   * @param {Object} schema - The schema object (input or output)
   * @returns {Array} Array of field paths
   */
  static getFieldPaths(schema) {
    if (!schema || typeof schema !== 'object') return [];
    
    const paths = [];
    
    function traverse(obj, currentPath = '') {
      Object.keys(obj).forEach(key => {
        const path = currentPath ? `${currentPath}.${key}` : key;
        paths.push(path);
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          traverse(obj[key], path);
        }
      });
    }
    
    traverse(schema);
    return paths;
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Component;
} else if (typeof window !== 'undefined') {
  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('ComponentModel', Component);
  } else {
    // Fallback for backwards compatibility
    window.ComponentModel = Component;
  }
}