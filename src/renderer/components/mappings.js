class Mappings {
  constructor(dependencyValidationService, mappingService) {
    this.dependencyValidationService = dependencyValidationService;
    this.mappingService = mappingService;
    this.containerId = null;
    this.allComponents = [];
    this.onMappingAdded = null;
    
    // Get dependencies from module system
    this.DependencyUtils = window.requireModule('DependencyUtils');
    this.DropdownUtils = window.requireModule('DropdownUtils');
  }

  /**
   * Set callback for when mapping is added
   * @param {Function} callback - Callback function
   */
  setOnMappingAdded(callback) {
    this.onMappingAdded = callback;
  }

  /**
   * Renders the missing mappings component
   * @param {string} containerId - ID of container element
   */
  async render(containerId) {
    this.containerId = containerId;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[MissingMappings] Container not found:', containerId);
      return;
    }

    try {
      const components = await window.api.getComponents();
      this.allComponents = components;
      const missingMappings = await this.dependencyValidationService.getAllMissingMappings(components);
      container.innerHTML = this.generateHTML(missingMappings);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[MissingMappings] Error loading components:', error);
    }
  }

  /**
   * Generates HTML for the missing mappings display
   * @param {Array} missingMappings - Missing mappings data
   * @returns {string} HTML string
   */
  generateHTML(missingMappings) {
    if (missingMappings.length === 0) {
      return `
        <div class="card bg-base-100 shadow-sm border border-success/20">
          <div class="card-body">
            <div class="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              <div>
                <h3 class="text-lg font-semibold text-success">No pending tasks</h3>
                <p class="text-sm text-base-content/70">No missing mappings detected</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const groupedByComponent = this.groupMappingsByComponent(missingMappings);
    
    return `
      <div class="card bg-base-100 shadow-sm border border-warning/20">
        <div class="card-body">
          <div class="flex items-center gap-3 mb-4">
            <i data-lucide="alert-triangle" class="h-6 w-6 text-warning"></i>
            <div>
              <h3 class="text-lg font-semibold text-warning">Pending tasks</h3>
              <p class="text-sm text-base-content/70">Some fields need to be mapped</p>
            </div>
          </div>
          
          <div class="space-y-3">
            ${Object.entries(groupedByComponent).map(([componentName, mappings]) => `
              <div class="collapse collapse-arrow bg-base-200" data-component-section="${componentName}">
                <input type="checkbox" />
                <div class="collapse-title font-medium">
                  <div class="flex items-center justify-between">
                    <span>${componentName}</span>
                    <span class="badge badge-warning badge-sm" data-count="${mappings.length}">${mappings.length}</span>
                  </div>
                </div>
                <div class="collapse-content">
                  <div class="space-y-2 pt-2 mb-15">
                    ${mappings.map(mapping => `
                      <div class="bg-base-100 p-3 rounded border border-base-300" data-mapping-item="${mapping.componentId}-${mapping.missingField.replace(/\./g, '-')}">
                        <div class="space-y-3">
                          <div class="flex items-center justify-between">
                            <div class="flex-1">
                              <div class="text-sm">
                                <span class="font-medium">Missing field:</span> 
                                <code class="bg-error/10 text-error px-1 rounded text-xs">${mapping.missingField}</code>
                              </div>
                              <div class="text-xs text-base-content/70 mt-1">
                                Required by: <span class="font-medium">${mapping.fromComponent}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div class="border-t pt-3">
                            <div class="text-xs font-medium text-base-content/70 mb-2">Add mapping:</div>
                            <div class="flex gap-2 items-end">
                              <div class="flex-1">
                                <select 
                                  id="field-selector-${mapping.componentId}-${mapping.missingField.replace(/\./g, '-')}" 
                                  class="select select-xs select-bordered w-full" 
                                  data-component-id="${mapping.componentId}" 
                                  data-target-field="${mapping.missingField}" 
                                  data-target-component="${mapping.fromComponent}"
                                >
                                  <option value="">Select field...</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
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

  /**
   * Sets up event handlers for the mapping interface
   */
  setupEventHandlers() {
    if (!this.containerId) return;
    
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Setup field selectors with autocomplete
    const selectors = container.querySelectorAll('[id^="field-selector-"]');
    selectors.forEach(selector => {
      this.setupFieldSelector(selector);
    });
  }

  /**
   * Sets up autocomplete for a field selector
   * @param {HTMLElement} selector - The select element
   */
  setupFieldSelector(selector) {
    const componentId = selector.dataset.componentId;
    const targetField = selector.dataset.targetField;
    const targetComponentName = selector.dataset.targetComponent;
    
    const availableFields = this.getAvailableFieldsForMapping(componentId, targetComponentName);
    
    const dropdown = this.DropdownUtils.createDropdown(selector, {
      maxItemCount: -1, // Allow unlimited items for search, but we'll handle single selection
      onSelect: (selectedValue) => {
        // Store the selected value on the selector element
        selector._selectedValue = selectedValue;
        this.handleAddMapping(selector.id, componentId, targetField, targetComponentName);
      }
    });
    
    // Convert field objects to simple strings for the dropdown
    const fieldDisplayStrings = availableFields.map(field => field.display);
    dropdown.updateItems(fieldDisplayStrings, []); // No pre-selected items
    
    // Store dropdown reference and field mapping for later use
    selector._dropdownInstance = dropdown;
    selector._fieldMapping = availableFields.reduce((map, field) => {
      map[field.display] = field;
      return map;
    }, {});
  }

  /**
   * Gets available fields for mapping
   * @param {string} componentId - Target component ID
   * @param {string} targetComponentName - Target component name
   * @returns {Array} Available field objects
   */
  getAvailableFieldsForMapping(componentId, targetComponentName) {
    const availableFields = [];
    
    // Get current component
    const currentComponent = this.allComponents.find(c => c.id === componentId);
    if (!currentComponent) {
      return availableFields;
    }
    
    // Add fields from current component's input and output
    const currentInputFields = this.DependencyUtils.getFieldPaths(currentComponent.input || {});
    const currentOutputFields = this.DependencyUtils.getFieldPaths(currentComponent.output || {});
    
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
        const consumedComponent = this.allComponents.find(c => c.id === consumedId);
        if (consumedComponent && consumedComponent.name !== targetComponentName) {
          const outputFields = this.DependencyUtils.getFieldPaths(consumedComponent.output || {});
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
   * Handles adding a mapping
   * @param selectorId
   * @param componentId
   * @param targetField
   * @param targetComponentName
   */
  async handleAddMapping(selectorId, componentId, targetField, targetComponentName) {
    console.log("0");
    const selector = document.getElementById(selectorId);
    if (!selector) {
      console.log("1");
      return;
    }
    
    try {
      const selectedDisplay = selector._selectedValue;
      if (!selectedDisplay) {
                console.log("2");
                return;
      }
      console.log("2.5");
      const selectedFieldObj = selector._fieldMapping[selectedDisplay];
      if (!selectedFieldObj) {
        console.log("3");
                return;
      }
      console.log("3.5");
      // Get current component to add mapping to - fetch fresh data from database
      const components = await window.api.getComponents();
      const currentComponent = components.find(c => c.id === componentId);
      if (!currentComponent) {
        console.log("4");
                return;
      }
      
      console.log("4.5");
      // Create mapping using mapping service
      const mapping = this.mappingService.createFieldMapping(
        targetField,
        targetComponentName,
        selectedFieldObj,
        this.allComponents,
        componentId,
        currentComponent.name
      );
      console.log("4.75");
            if (!mapping) {
              console.log("5");
                return;
      }
      console.log("6");
      // Add mapping to component
      const updatedMappings = this.mappingService.addMapping(
        currentComponent.mappings || [],
        mapping
      );

      console.log("7");
      // Update component in database
      const updatedComponent = { ...currentComponent, mappings: updatedMappings };
      console.log("8");
      try {
        await window.api.updateComponent(updatedComponent);
      } catch (dbError) {
        console.error('[MissingMappings] Database update failed:', dbError);
        throw dbError;
      }
      console.log("9");
      // Notify about mapping addition
      if (this.onMappingAdded) {
        this.onMappingAdded(mapping, updatedComponent);
      }
      
      // Remove this specific mapping item from DOM
      this.removeMappingItemFromDOM(componentId, targetField);
      
    } catch (error) {
      console.error('[MissingMappings] Error adding mapping:', error);
    }
  }

  /**
   * Removes a specific mapping item from the DOM
   * @param {string} componentId - Component ID
   * @param {string} targetField - Target field name
   */
  removeMappingItemFromDOM(componentId, targetField) {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const mappingId = `${componentId}-${targetField.replace(/\./g, '-')}`;
    const mappingItem = container.querySelector(`[data-mapping-item="${mappingId}"]`);
    
    if (!mappingItem) return;
    
    const collapseSection = mappingItem.closest('[data-component-section]');
    mappingItem.remove();

    if (collapseSection) {
      const remainingItems = collapseSection.querySelectorAll('[data-mapping-item]');
      if (remainingItems.length === 0) {
        this.refresh();
        return;
      }

      const badge = collapseSection.querySelector('[data-count]');
      if (badge) {
          badge.textContent = remainingItems.length.toString();
          badge.setAttribute('data-count', remainingItems.length.toString());
        }
    }
  }

  /**
   * Refreshes the component display
   */
  refresh() {
    if (this.containerId) {
      this.render(this.containerId);
    }
  }

  /**
   * Updates the mapping table with current mappings
   * @param {Array} mappings - Array of mapping objects
   * @param {Array} allComponents - Array of all components
   * @param {string} currentComponentId - Current component ID from form
   */
  updateMappingTable(mappings = [], allComponents = [], currentComponentId = null) {
    const mappingTableBody = document.getElementById('mapping-table-body');
    const mappingSection = document.getElementById('mapping-table-section');
    
    if (!mappingTableBody) return;

    if (!mappings || mappings.length === 0) {
      mappingTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-base-content opacity-60 italic">No mappings defined</td></tr>';
      if (mappingSection) mappingSection.classList.add('hidden');
      return;
    }

    if (mappingSection) mappingSection.classList.remove('hidden');

    mappingTableBody.innerHTML = mappings.map((mapping, index) => {
      const sourceComponent = allComponents.find(comp => comp.id === mapping.source_component_id);
      const targetComponent = allComponents.find(comp => comp.id === mapping.target_component_id);

      const sourceComponentName = sourceComponent ? sourceComponent.name : 'Current component';
      const targetComponentName = targetComponent ? targetComponent.name : 'Unknown';

      return `
        <tr>
          <td class="font-mono text-sm">${this.escapeHtml(mapping.target_field)}</td>
          <td class="font-mono text-sm">${this.escapeHtml(mapping.source_field)}</td>
          <td>
            <span class="badge badge-outline badge-sm">${this.escapeHtml(targetComponentName)}</span>
          </td>
          <td>
            <button type="button" class="btn btn-xs btn-error remove-mapping-btn" data-mapping-index="${index}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    // Attach event listeners for remove buttons
    const removeButtons = mappingTableBody.querySelectorAll('.remove-mapping-btn');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleRemoveMapping(e, mappings, currentComponentId));
    });
  }

  /**
   * Handles removing a mapping from the table
   * @param {Event} event - Click event
   * @param {Array} currentMappings - Current mappings array
   * @param {string} currentComponentId - Current component ID from form
   */
  async handleRemoveMapping(event, currentMappings, currentComponentId) {
    const button = event.target.closest('.remove-mapping-btn');
    const mappingIndex = parseInt(button?.dataset.mappingIndex);
    if (isNaN(mappingIndex) || mappingIndex < 0 || mappingIndex >= currentMappings.length) {
      console.error('Invalid mapping index:', mappingIndex);
      return;
    }

    const mappingToRemove = currentMappings[mappingIndex];
    
    try {
      // Get fresh component data from database
      const components = await window.api.getComponents();
      
      // Find the current component using the passed currentComponentId
      const currentComponent = components.find(comp => comp.id === currentComponentId);
      if (!currentComponent) {
        console.error('[Mappings] Current component not found:', currentComponentId);
        return;
      }
      
      // Remove mapping from component
      const updatedMappings = this.mappingService.removeMapping(
        currentComponent.mappings || [], 
        mappingToRemove
      );
      
      // Update component in database
      const updatedComponent = { ...currentComponent, mappings: updatedMappings };
      
      await window.api.updateComponent(updatedComponent);
      
      // Notify parent if callback exists - let form.js handle UI updates
      if (this.onMappingRemoved) {
        this.onMappingRemoved(mappingToRemove, updatedComponent);
      }
      
    } catch (error) {
      console.error('[Mappings] Error removing mapping:', error);
    }
  }

  /**
   * Set callback for when mapping is removed
   * @param {Function} callback - Callback function
   */
  setOnMappingRemoved(callback) {
    this.onMappingRemoved = callback;
  }

  /**
   * Escapes HTML to prevent XSS
   * @param {string} unsafe - Unsafe string
   * @returns {string} Escaped string
   */
  escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
      return String(unsafe);
    }
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Register module
(function() {
  'use strict';
  window.moduleRegistry.register('Mappings', Mappings, ['DependencyUtils', 'DropdownUtils']);
})();