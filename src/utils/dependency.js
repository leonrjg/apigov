// dependency-utils.js - Shared dependency checking utilities

const flattenObject = (obj, prefix = '') => {
  const flattened = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flattened.push({ path: newKey, type: 'object', value: '{...}' });
        flattened.push(...flattenObject(value, newKey));
      } else {
        let displayValue = value;
        if (Array.isArray(value)) {
          displayValue = `[${value.length} items]`;
        } else if (typeof value === 'string' && value.length > 50) {
          displayValue = value.substring(0, 50) + '...';
        } else if (value === null) {
          displayValue = 'null';
        }
        flattened.push({ path: newKey, type, value: displayValue });
      }
    }
  }
  return flattened;
};

// Get all field paths from a component's body
const getFieldPaths = (body) => {
  if (!body || typeof body !== 'object') return [];
  const flattened = flattenObject(body);
  // Only consider leaves, not JSON objects
  return flattened
    .filter(field => field.type !== 'object')
    .map(field => field.path);
};

// Check if a field is available in consumed components
const isFieldAvailableInConsumedComponents = (field, excludeComponentId, consumedIds, allComponents) => {
  for (const consumedComponentId of consumedIds) {
    if (consumedComponentId === excludeComponentId) continue;
    
    const consumedComponent = allComponents.find(comp => comp.id === consumedComponentId);
    if (!consumedComponent || !consumedComponent.input) continue;

    const consumedFields = getFieldPaths(consumedComponent.input);
    if (consumedFields.includes(field)) {
      return true;
    }
  }
  return false;
};

const check = async (componentId, allComponents) => {
  return (await checkComponentDependencies(componentId));
}

// Check field dependencies for a component
const checkComponentDependencies = async (componentId) => {
  const allComponents = await window.api.getComponents();
  const component = allComponents.find(comp => comp.id === componentId);

  if (!component) {
    throw new Error(`Component with ID ${componentId} not found`);
  }

  // Only check endpoints for dependencies
  if (component.type !== 'endpoint') {
    return {hasMissingDependencies: false, missingFields: []};
  }

  if (!component.consumes || component.consumes.length === 0) {
    return {hasMissingDependencies: false, missingFields: []};
  }

  const currentFields = getFieldPaths(component.input || {});
  const missingFields = [];

  component.consumes.forEach(consumedComponentId => {
    const consumedComponent = allComponents.find(comp => comp.id === consumedComponentId);
    if (!consumedComponent || !consumedComponent.input || consumedComponent.type !== 'endpoint') return;

    const consumedFields = getFieldPaths(consumedComponent.input);

    consumedFields.forEach(field => {
      if (!currentFields.includes(field) && !isFieldAvailableInConsumedComponents(field, consumedComponentId, component.consumes, allComponents)) {
        // Check if this field is resolved via mapping with integrity validation
        const isResolvedByMapping = component.mappings &&
            Array.isArray(component.mappings) &&
            component.mappings.some(mapping => {
              // Basic mapping structure validation
              if (mapping.target_component_id !== consumedComponent.id ||
                  mapping.target_field !== field) {
                return false;
              }

              // If no source_component_id, validate field exists in current component
              if (!mapping.source_component_id) {
                return currentFields.includes(mapping.source_field);
              }

              // Cross-component mapping validation
              const sourceComponent = allComponents.find(comp => comp.id === mapping.source_component_id);
              if (!sourceComponent) {
                return false; // Source component doesn't exist
              }

              // Check if source field exists in source component
              // For cross-component mappings, check both input and output fields
              const sourceInputFields = getFieldPaths(sourceComponent.input || {});
              const sourceOutputFields = getFieldPaths(sourceComponent.output || {});
              const allSourceFields = [...sourceInputFields, ...sourceOutputFields];

              return allSourceFields.includes(mapping.source_field);
            });

        if (!isResolvedByMapping) {
          missingFields.push(`${field} (from ${consumedComponent.name})`);
        }
      }
    });
  });

  return {
    hasMissingDependencies: missingFields.length > 0,
    missingFields: missingFields
  };
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    flattenObject,
    getFieldPaths,
    isFieldAvailableInConsumedComponents,
    checkComponentDependencies,
    check
  };
} else {
  // Browser environment - register with module system
  const DependencyUtils = {
    flattenObject,
    getFieldPaths,
    isFieldAvailableInConsumedComponents,
    checkComponentDependencies,
    check
  };
  
  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('DependencyUtils', DependencyUtils);
  } else {
    // Fallback for backwards compatibility
    window.DependencyUtils = DependencyUtils;
  }
}