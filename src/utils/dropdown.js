const createDropdown = (element, config = {}) => {
  if (element.getAttribute("data-dropdown")) {
    console.log("aaaaaa");
    return;
  }
  element.setAttribute("data-dropdown", true);
  console.log("aa");

  const choicesConfig = {
    maxItemCount: config.maxItemCount || -1,
    removeItemButton: true,
    searchEnabled: true,
    searchChoices: true,
    noResultsText: 'No components found',
    itemSelectText: ' ',
    classNames: {
      containerOuter: 'choices',
      containerInner: 'choices__inner',
      input: 'choices__input',
      inputCloned: 'choices__input--cloned',
      list: 'choices__list',
      listItems: 'choices__list--multiple',
      listSingle: 'choices__list--single',
      listDropdown: 'choices__list--dropdown',
      item: 'choices__item'
    }
  };

  console.log('🔍 Creating Choices instance with config:', choicesConfig);
  let choices;
  try {
    choices = new Choices(element, choicesConfig);
    console.log('🔍 Choices instance created:', !!choices);
  } catch (error) {
    console.error('❌ Error creating Choices instance:', error);
    throw error;
  }

  if (config.onSelect) {
    element.addEventListener('addItem', (event) => {
      config.onSelect(event.detail.value);
    });
  }
  
  if (config.onRemove) {
    element.addEventListener('removeItem', (event) => {
      config.onRemove(event.detail.value);
    });
  }

  return {
    choices,
    updateItems: (allItems, selectedItems = []) => {
      if (!choices || typeof choices.clearChoices !== 'function') {
        console.error('Choices instance not properly initialized');
        return;
      }
      try {
        const choiceItems = allItems.map(item => ({
          value: item,
          label: item,
          selected: selectedItems.includes(item)
        }));
        choices.setChoices(choiceItems, 'value', 'label', true);
      } catch (error) {
        console.error('Error updating choices items:', error);
      }
    },
    clear: () => choices.removeActiveItems(),
    getSelectedValues: () => choices.getValue(true)
  };
};

// Create a single-select Choices.js instance for field selection
const createFieldChoices = (element, config = {}) => {
  const choicesConfig = {
    searchEnabled: true,
    searchChoices: true,
    placeholderValue: config.placeholder || 'Search fields...',
    noResultsText: 'No fields found',
    itemSelectText: 'Press to select',
    shouldSort: false,
    // Force dropdown to render in body to avoid clipping issues
    renderChoiceLimit: -1,
    // Position dropdown appropriately
    position: 'auto',
    // Custom classes to handle z-index and positioning
    classNames: {
      containerOuter: 'choices',
      containerInner: 'choices__inner',
      input: 'choices__input',
      inputCloned: 'choices__input--cloned',
      list: 'choices__list',
      listItems: 'choices__list--multiple',
      listSingle: 'choices__list--single',
      listDropdown: 'choices__list--dropdown',
      item: 'choices__item',
      itemSelectable: 'choices__item--selectable',
      itemDisabled: 'choices__item--disabled',
      itemChoice: 'choices__item--choice',
      placeholder: 'choices__placeholder',
      group: 'choices__group',
      groupHeading: 'choices__heading',
      button: 'choices__button',
      activeState: 'is-active',
      focusState: 'is-focused',
      openState: 'is-open',
      disabledState: 'is-disabled',
      highlightedState: 'is-highlighted',
      selectedState: 'is-selected',
      flippedState: 'is-flipped',
      loadingState: 'is-loading',
      noResults: 'has-no-results',
      noChoices: 'has-no-choices'
    }
  };

  const choices = new Choices(element, choicesConfig);
  
  let movedDropdown = null;

  // Add callback handling
  if (config.onSelect) {
    element.addEventListener('choice', (event) => {
      const selectedChoice = event.detail.choice;
      // Pass back the original field object stored in customProperties
      config.onSelect(selectedChoice.customProperties || selectedChoice);
    });
  }

  return {
    choices,
    updateItems: (fieldObjects) => {
      choices.clearChoices();
      const choiceItems = fieldObjects.map(fieldObj => ({
        value: fieldObj.display,
        label: fieldObj.display,
        selected: false,
        customProperties: fieldObj // Store the full object for later retrieval
      }));
      choices.setChoices(choiceItems, 'value', 'label', true);
    },
    setValue: (value) => {
      choices.setChoiceByValue(value);
    },
    clear: () => choices.removeActiveItems(),
    cleanup: () => {
      observer.disconnect();
      choices.destroy();
    }
  };
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDropdown,
    createFieldChoices
  };
} else {
  // Browser environment - register with module system
  const DropdownUtils = {
    createDropdown,
    createFieldChoices
  };
  
  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('DropdownUtils', DropdownUtils);
  } else {
    // Fallback for backwards compatibility
    window.DropdownUtils = DropdownUtils;
  }
}