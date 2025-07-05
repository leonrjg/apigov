const createDropdown = (element, config = {}) => {
  if (element.getAttribute("data-dropdown")) {
    return;
  }
  element.setAttribute("data-dropdown", true);

  const libConfig = {
    maxItemCount: -1,
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

  let instance;
  try {
    instance = new Choices(element, libConfig);
  } catch (error) {
    throw error;
  }

  if (libConfig.onSelect) {
    element.addEventListener('addItem', (event) => {
      libConfig.onSelect(event.detail.value);
    });
  }
  
  if (libConfig.onRemove) {
    element.addEventListener('removeItem', (event) => {
      libConfig.onRemove(event.detail.value);
    });
  }

  return {
    updateItems: (allItems, selectedItems = []) => {
      const choiceItems = allItems.map(item => ({
          value: item,
          label: item,
          selected: selectedItems.includes(item)
      }));
      instance.setChoices(choiceItems, 'value', 'label', true);
    },
    clear: () => instance.removeActiveItems(),
    getSelectedValues: () => instance.getValue(true)
  };
};


// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createDropdown
  };
} else {
  // Browser environment - register with module system
  const DropdownUtils = {
    createDropdown
  };

  window.moduleRegistry.register('DropdownUtils', DropdownUtils);
}