class TagManager {
  constructor(consumesSelect) {
    this.consumesSelect = consumesSelect;
    this.selectedTags = [];
    this.allComponents = [];
    this.dropdownUtils = null;
  }

  setComponents(components) {
    this.allComponents = components;
    // Update choices with new component list and maintain preselections
    if (this.dropdownUtils) {
      this.dropdownUtils.updateItems(this.getComponentNames(), this.preselectedComponents || []);
    }
  }

  getComponentNames() {
    return this.allComponents.map(comp => comp.name);
  }

  getComponentIdByName(name) {
    const component = this.allComponents.find(comp => comp.name === name);
    return component ? component.id : null;
  }

  getComponentNameById(id) {
    const component = this.allComponents.find(comp => comp.id === id);
    return component ? component.name : null;
  }

  initializeAutocomplete() {
    const DropdownUtils = window.requireModule('DropdownUtils');

      try {
        console.log('🔍 Creating dropdown...');
        this.dropdownUtils = DropdownUtils.createDropdown(this.consumesSelect, {
          placeholder: 'Type to search components...',
          maxItemCount: -1,
          onSelect: (selectedComponent) => {
            this.addTag(selectedComponent);
          },
          onRemove: (removedComponent) => {
            this.removeTag(removedComponent);
          }
        });
        console.log('🔍 Dropdown created successfully:', !!this.dropdownUtils);

        if (this.dropdownUtils) {
          this.dropdownUtils.updateItems(this.getComponentNames(), this.preselectedComponents || []);
        }
        console.log('🔍 Items updated successfully');
      } catch (error) {
        console.error('❌ Error creating dropdown:', error);
      }
    }

  addTag(tagText) {
    if (!tagText.trim()) return;
    
    if (!this.selectedTags) {
      this.selectedTags = [];
    }
    
    const componentId = this.getComponentIdByName(tagText);
    if (!componentId || this.selectedTags.includes(componentId)) return;
    
    const componentNames = this.getComponentNames();
    if (!componentNames.includes(tagText)) return;
    
    this.selectedTags.push(componentId);
    // Let Choices.js handle all UI - no custom tag elements
  }

  removeTag(tagText) {
    const componentId = this.getComponentIdByName(tagText);
    if (componentId) {
      this.selectedTags = this.selectedTags.filter(tag => tag !== componentId);
    }
    // Let Choices.js handle all UI - no custom tag removal
  }

  // Removed createTagElement - Choices.js handles all tag UI

  loadTagsFromComponent(component) {
    this.selectedTags = [];
    
    // Collect selected component names
    const selectedComponentNames = [];
    (component.consumes || []).forEach(consumeId => {
      if (consumeId.trim()) {
        const componentName = this.getComponentNameById(consumeId.trim());
        if (componentName) {
          this.selectedTags.push(consumeId.trim());
          selectedComponentNames.push(componentName);
        }
      }
    });
    
    // Store selected components for initialization
    this.preselectedComponents = selectedComponentNames;

  }
  
  reinitialize() {
    if (this.dropdownUtils) {
      this.dropdownUtils = null;
    }
    this.initializeAutocomplete();
  }

  clearAll() {
    this.selectedTags = [];
    
    if (this.dropdownUtils) {
      this.dropdownUtils.clear();
    }
  }

  getSelectedTags() {
    return this.selectedTags;
  }

  setSelectedTags(tags) {
    this.selectedTags = tags || [];
  }
}

// Register with module system
(function() {
  'use strict';

  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('TagManager', TagManager);
  } else {
    // Fallback for backwards compatibility
    window.TagManager = TagManager;
  }
})();