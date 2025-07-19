// Mock dependencies before requiring Mappings
global.window = global.window || {};

// Mock window.api
global.window.api = {
  getComponents: jest.fn(),
  updateComponent: jest.fn()
};

// Mock module registry
global.window.moduleRegistry = {
  register: jest.fn()
};

// Mock module requirements
global.window.requireModule = jest.fn((moduleName) => {
  switch (moduleName) {
    case 'ComponentModel':
      return class MockComponent {};
    case 'DropdownUtils':
      return {
        createDropdown: jest.fn(() => ({
          updateItems: jest.fn(),
          destroy: jest.fn()
        }))
      };
    case 'DataController':
      return {
        groupMappingsByComponent: jest.fn(),
        getAvailableFieldsForMapping: jest.fn(),
        findFieldUsageInOtherComponents: jest.fn()
      };
    case 'AppController':
      return {
        renderComponents: jest.fn()
      };
    default:
      return {};
  }
});

// jsdom provides document, but we need to mock specific methods for our tests
document.getElementById = jest.fn();
document.querySelector = jest.fn();
document.querySelectorAll = jest.fn(() => []);

// Load the Mappings class
require('./mappings.js');
const Mappings = global.window.moduleRegistry.register.mock.calls[0][1];

describe('Mappings', () => {
  let mappings;
  let mockDependencyValidationService;
  let mockMappingService;
  let mockContainer;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock services
    mockDependencyValidationService = {
      getAllMissingMappings: jest.fn()
    };
    
    mockMappingService = {
      createFieldMapping: jest.fn(),
      addMapping: jest.fn(),
      removeMapping: jest.fn()
    };

    // Mock DOM container
    mockContainer = {
      innerHTML: '',
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };

    // Create mappings instance
    mappings = new Mappings(mockDependencyValidationService, mockMappingService);
  });

  describe('constructor', () => {
    test('should initialize with required dependencies', () => {
      expect(mappings.dependencyValidationService).toBe(mockDependencyValidationService);
      expect(mappings.mappingService).toBe(mockMappingService);
      expect(mappings.containerId).toBeNull();
      expect(mappings.allComponents).toEqual([]);
      expect(mappings.onMappingAdded).toBeNull();
    });

    test('should initialize module dependencies through requireModule', () => {
      expect(global.window.requireModule).toHaveBeenCalledWith('ComponentModel');
      expect(global.window.requireModule).toHaveBeenCalledWith('DropdownUtils');
      expect(global.window.requireModule).toHaveBeenCalledWith('DataController');
      expect(global.window.requireModule).toHaveBeenCalledWith('AppController');
    });
  });

  describe('setOnMappingAdded', () => {
    test('should set the callback function', () => {
      const callback = jest.fn();
      mappings.setOnMappingAdded(callback);
      expect(mappings.onMappingAdded).toBe(callback);
    });
  });

  describe('setOnMappingRemoved', () => {
    test('should set the callback function', () => {
      const callback = jest.fn();
      mappings.setOnMappingRemoved(callback);
      expect(mappings.onMappingRemoved).toBe(callback);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      document.getElementById.mockReturnValue(mockContainer);
      global.window.api.getComponents.mockResolvedValue([]);
      mockDependencyValidationService.getAllMissingMappings.mockResolvedValue([]);
    });

    test('should render successfully with valid container', async () => {
      await mappings.render('test-container');
      
      expect(document.getElementById).toHaveBeenCalledWith('test-container');
      expect(global.window.api.getComponents).toHaveBeenCalled();
      expect(mockDependencyValidationService.getAllMissingMappings).toHaveBeenCalled();
      expect(mappings.containerId).toBe('test-container');
    });

    test('should handle missing container gracefully', async () => {
      document.getElementById.mockReturnValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await mappings.render('missing-container');
      
      expect(consoleSpy).toHaveBeenCalledWith('[MissingMappings] Container not found:', 'missing-container');
      consoleSpy.mockRestore();
    });

    test('should handle API errors gracefully', async () => {
      global.window.api.getComponents.mockRejectedValue(new Error('API Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await mappings.render('test-container');
      
      expect(consoleSpy).toHaveBeenCalledWith('[MissingMappings] Error loading components:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should store components and generate HTML', async () => {
      const mockComponents = [{ id: '1', name: 'Component1' }];
      const mockMissingMappings = [{ componentId: '1', missingField: 'field1' }];
      
      // Mock the DataController method that generateHTML calls
      mappings.DataController = {
        groupMappingsByComponent: jest.fn().mockReturnValue({
          'Component1': mockMissingMappings
        })
      };
      
      global.window.api.getComponents.mockResolvedValue(mockComponents);
      mockDependencyValidationService.getAllMissingMappings.mockResolvedValue(mockMissingMappings);
      
      await mappings.render('test-container');
      
      expect(mappings.allComponents).toEqual(mockComponents);
      expect(mockContainer.innerHTML).toBeTruthy();
    });
  });

  describe('generateHTML', () => {
    beforeEach(() => {
      mappings.DataController = {
        groupMappingsByComponent: jest.fn()
      };
    });

    test('should generate success message for no missing mappings', () => {
      const html = mappings.generateHTML([]);
      
      expect(html).toContain('No pending tasks');
      expect(html).toContain('No missing mappings detected');
      expect(html).toContain('text-success');
    });

    test('should generate warning message for missing mappings', () => {
      const mockMissingMappings = [
        { componentId: 'comp1', missingField: 'field1', fromComponent: 'comp2' }
      ];
      
      mappings.DataController.groupMappingsByComponent.mockReturnValue({
        'Component1': mockMissingMappings
      });
      
      const html = mappings.generateHTML(mockMissingMappings);
      
      expect(html).toContain('Pending tasks');
      expect(html).toContain('Some fields need to be mapped');
      expect(html).toContain('text-warning');
      expect(mappings.DataController.groupMappingsByComponent).toHaveBeenCalledWith(mockMissingMappings);
    });

    test('should include component sections with correct data attributes', () => {
      const mockMissingMappings = [
        { componentId: 'comp1', missingField: 'field1', fromComponent: 'comp2' }
      ];
      
      mappings.DataController.groupMappingsByComponent.mockReturnValue({
        'Component1': mockMissingMappings
      });
      
      const html = mappings.generateHTML(mockMissingMappings);
      
      expect(html).toContain('data-component-section="Component1"');
      expect(html).toContain('data-count="1"');
    });

    test('should include mapping items with field selectors', () => {
      const mockMissingMappings = [
        { componentId: 'comp1', missingField: 'field.name', fromComponent: 'comp2' }
      ];
      
      mappings.DataController.groupMappingsByComponent.mockReturnValue({
        'Component1': mockMissingMappings
      });
      
      const html = mappings.generateHTML(mockMissingMappings);
      
      expect(html).toContain('data-mapping-item="comp1-field-name"');
      expect(html).toContain('Missing field:');
      expect(html).toContain('field.name');
      expect(html).toContain('Required by:');
      expect(html).toContain('comp2');
      expect(html).toContain('field-selector-comp1-field-name');
    });

    test('should display custom message when provided', () => {
      const mockMissingMappings = [
        { 
          componentId: 'comp1', 
          missingField: 'field1', 
          fromComponent: 'comp2',
          message: 'Custom error message'
        }
      ];
      
      mappings.DataController.groupMappingsByComponent.mockReturnValue({
        'Component1': mockMissingMappings
      });
      
      const html = mappings.generateHTML(mockMissingMappings);
      
      expect(html).toContain('Custom error message');
      expect(html).not.toContain('Add mapping:');
    });
  });

  describe('setupEventHandlers', () => {
    test('should handle missing container ID', () => {
      mappings.containerId = null;
      expect(() => mappings.setupEventHandlers()).not.toThrow();
    });

    test('should handle missing container element', () => {
      mappings.containerId = 'test-container';
      document.getElementById.mockReturnValue(null);
      expect(() => mappings.setupEventHandlers()).not.toThrow();
    });

    test('should setup field selectors', () => {
      mappings.containerId = 'test-container';
      const mockSelectors = [
        { id: 'field-selector-1', dataset: {} },
        { id: 'field-selector-2', dataset: {} }
      ];
      
      mockContainer.querySelectorAll.mockReturnValue(mockSelectors);
      document.getElementById.mockReturnValue(mockContainer);
      
      const setupSpy = jest.spyOn(mappings, 'setupFieldSelector').mockImplementation();
      
      mappings.setupEventHandlers();
      
      expect(mockContainer.querySelectorAll).toHaveBeenCalledWith('[id^="field-selector-"]');
      expect(setupSpy).toHaveBeenCalledTimes(2);
      expect(setupSpy).toHaveBeenCalledWith(mockSelectors[0]);
      expect(setupSpy).toHaveBeenCalledWith(mockSelectors[1]);
    });
  });

  describe('setupFieldSelector', () => {
    let mockSelector;
    let mockDropdown;

    beforeEach(() => {
      mockSelector = {
        dataset: {
          componentId: 'comp1',
          targetField: 'field1',
          targetComponent: 'Component1'
        }
      };
      
      mockDropdown = {
        updateItems: jest.fn()
      };
      
      mappings.DropdownUtils = {
        createDropdown: jest.fn(() => mockDropdown)
      };
      
      mappings.DataController = {
        getAvailableFieldsForMapping: jest.fn()
      };
    });

    test('should setup dropdown with available fields', async () => {
      const mockFields = [
        { display: 'field1 (string)', field: 'field1', source: 'comp2' },
        { display: 'field2 (number)', field: 'field2', source: 'comp2' }
      ];
      
      mappings.DataController.getAvailableFieldsForMapping.mockResolvedValue(mockFields);
      
      await mappings.setupFieldSelector(mockSelector);
      
      expect(mappings.DataController.getAvailableFieldsForMapping).toHaveBeenCalledWith('comp1', 'Component1');
      expect(mappings.DropdownUtils.createDropdown).toHaveBeenCalledWith(mockSelector, expect.objectContaining({
        maxItemCount: -1,
        onSelect: expect.any(Function)
      }));
      expect(mockDropdown.updateItems).toHaveBeenCalledWith(['field1 (string)', 'field2 (number)'], []);
    });

    test('should store field mapping on selector', async () => {
      const mockFields = [
        { display: 'field1 (string)', field: 'field1', source: 'comp2' }
      ];
      
      mappings.DataController.getAvailableFieldsForMapping.mockResolvedValue(mockFields);
      
      await mappings.setupFieldSelector(mockSelector);
      
      expect(mockSelector._dropdownInstance).toBe(mockDropdown);
      expect(mockSelector._fieldMapping).toEqual({
        'field1 (string)': { display: 'field1 (string)', field: 'field1', source: 'comp2' }
      });
    });
  });

  describe('handleAddMapping', () => {
    let mockSelector;

    beforeEach(() => {
      mockSelector = {
        _selectedValue: 'field1 (string)',
        _fieldMapping: {
          'field1 (string)': { field: 'field1', source: 'comp2' }
        }
      };
      
      document.getElementById.mockReturnValue(mockSelector);
    });

    test('should return early if selector not found', async () => {
      document.getElementById.mockReturnValue(null);
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(global.window.api.getComponents).not.toHaveBeenCalled();
    });

    test('should return early if no selected value', async () => {
      mockSelector._selectedValue = null;
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(global.window.api.getComponents).not.toHaveBeenCalled();
    });

    test('should return early if selected field object not found', async () => {
      mockSelector._fieldMapping = {};
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(global.window.api.getComponents).not.toHaveBeenCalled();
    });

    test('should create and add mapping successfully', async () => {
      const mockComponents = [
        { id: 'comp1', name: 'Component1', mappings: [] }
      ];
      const mockMapping = { target_field: 'field1', source_field: 'field1' };
      const mockUpdatedMappings = [mockMapping];
      
      global.window.api.getComponents.mockResolvedValue(mockComponents);
      mockMappingService.createFieldMapping.mockReturnValue(mockMapping);
      mockMappingService.addMapping.mockReturnValue(mockUpdatedMappings);
      global.window.api.updateComponent.mockResolvedValue();
      
      const removeSpy = jest.spyOn(mappings, 'removeMappingItemFromDOM').mockImplementation();
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(mockMappingService.createFieldMapping).toHaveBeenCalledWith(
        'field1',
        'Component1',
        { field: 'field1', source: 'comp2' },
        [],
        'comp1',
        'Component1'
      );
      expect(mockMappingService.addMapping).toHaveBeenCalledWith([], mockMapping);
      expect(global.window.api.updateComponent).toHaveBeenCalledWith({
        id: 'comp1',
        name: 'Component1',
        mappings: mockUpdatedMappings
      });
      expect(removeSpy).toHaveBeenCalledWith('comp1', 'field1');
    });

    test('should call onMappingAdded callback when set', async () => {
      const mockComponents = [{ id: 'comp1', name: 'Component1', mappings: [] }];
      const mockMapping = { target_field: 'field1', source_field: 'field1' };
      const callback = jest.fn();
      
      global.window.api.getComponents.mockResolvedValue(mockComponents);
      mockMappingService.createFieldMapping.mockReturnValue(mockMapping);
      mockMappingService.addMapping.mockReturnValue([mockMapping]);
      
      mappings.setOnMappingAdded(callback);
      jest.spyOn(mappings, 'removeMappingItemFromDOM').mockImplementation();
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(callback).toHaveBeenCalledWith(mockMapping, expect.objectContaining({
        id: 'comp1',
        mappings: [mockMapping]
      }));
    });

    test('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      global.window.api.getComponents.mockRejectedValue(new Error('API Error'));
      
      await mappings.handleAddMapping('selector-id', 'comp1', 'field1', 'Component1');
      
      expect(consoleSpy).toHaveBeenCalledWith('[MissingMappings] Error adding mapping:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('removeMappingItemFromDOM', () => {
    beforeEach(() => {
      mappings.containerId = 'test-container';
      document.getElementById.mockReturnValue(mockContainer);
    });

    test('should return early if container not found', () => {
      document.getElementById.mockReturnValue(null);
      mappings.removeMappingItemFromDOM('comp1', 'field1');
      expect(mockContainer.querySelector).not.toHaveBeenCalled();
    });

    test('should remove mapping item and update badge count', () => {
      const mockMappingItem = { remove: jest.fn(), closest: jest.fn() };
      const mockCollapseSection = {
        querySelectorAll: jest.fn(() => [{ id: 'item1' }, { id: 'item2' }]),
        querySelector: jest.fn(() => ({
          textContent: '',
          setAttribute: jest.fn()
        }))
      };
      
      mockMappingItem.closest.mockReturnValue(mockCollapseSection);
      mockContainer.querySelector.mockReturnValue(mockMappingItem);
      
      mappings.removeMappingItemFromDOM('comp1', 'field.name');
      
      expect(mockContainer.querySelector).toHaveBeenCalledWith('[data-mapping-item="comp1-field-name"]');
      expect(mockMappingItem.remove).toHaveBeenCalled();
      expect(mockCollapseSection.querySelectorAll).toHaveBeenCalledWith('[data-mapping-item]');
    });

    test('should refresh if no remaining items', () => {
      const mockMappingItem = { remove: jest.fn(), closest: jest.fn() };
      const mockCollapseSection = {
        querySelectorAll: jest.fn(() => [])
      };
      
      mockMappingItem.closest.mockReturnValue(mockCollapseSection);
      mockContainer.querySelector.mockReturnValue(mockMappingItem);
      
      const refreshSpy = jest.spyOn(mappings, 'refresh').mockImplementation();
      
      mappings.removeMappingItemFromDOM('comp1', 'field1');
      
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    test('should re-render and refresh app controller', () => {
      mappings.containerId = 'test-container';
      const renderSpy = jest.spyOn(mappings, 'render').mockImplementation();
      
      mappings.refresh();
      
      expect(renderSpy).toHaveBeenCalledWith('test-container');
      expect(mappings.AppController.renderComponents).toHaveBeenCalled();
    });

    test('should handle missing container ID', () => {
      mappings.containerId = null;
      const renderSpy = jest.spyOn(mappings, 'render').mockImplementation();
      
      mappings.refresh();
      
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateMappingTable', () => {
    let mockTableBody;
    let mockSection;

    beforeEach(() => {
      mockTableBody = { 
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
      };
      mockSection = { classList: { add: jest.fn(), remove: jest.fn() } };
      
      document.getElementById
        .mockReturnValueOnce(mockTableBody)
        .mockReturnValueOnce(mockSection);
    });

    test('should return early if table body not found', () => {
      // Reset the mock to return null for the first call (mappingTableBody)
      document.getElementById.mockReturnValueOnce(null);
      mappings.updateMappingTable([]);
      // Since the function returns early, we can't test the innerHTML
      // Instead we test that the function doesn't throw
      expect(() => mappings.updateMappingTable([])).not.toThrow();
    });

    test('should show no mappings message for empty array', () => {
      mappings.updateMappingTable([]);
      
      expect(mockTableBody.innerHTML).toContain('No mappings defined');
      expect(mockSection.classList.add).toHaveBeenCalledWith('hidden');
    });

    test('should generate table rows for mappings', () => {
      const mockMappings = [
        {
          source_component_id: 'comp1',
          target_component_id: 'comp2',
          source_field: 'field1',
          target_field: 'field2'
        }
      ];
      
      const mockComponents = [
        { id: 'comp1', name: 'Component1' },
        { id: 'comp2', name: 'Component2' }
      ];
      
      mappings.updateMappingTable(mockMappings, mockComponents, 'comp1');
      
      expect(mockTableBody.innerHTML).toContain('Component1');
      expect(mockTableBody.innerHTML).toContain('Component2');
      expect(mockTableBody.innerHTML).toContain('field1');
      expect(mockTableBody.innerHTML).toContain('field2');
      expect(mockTableBody.innerHTML).toContain('data-mapping-index="0"');
      expect(mockSection.classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('should handle missing component names gracefully', () => {
      const mockMappings = [
        {
          source_component_id: 'missing-comp',
          target_component_id: 'comp2',
          source_field: 'field1',
          target_field: 'field2'
        }
      ];
      
      const mockComponents = [
        { id: 'comp2', name: 'Component2' }
      ];
      
      mappings.updateMappingTable(mockMappings, mockComponents);
      
      expect(mockTableBody.innerHTML).toContain('=');
      expect(mockTableBody.innerHTML).toContain('Component2');
    });
  });

  describe('handleRemoveMapping', () => {
    test('should handle invalid mapping index', async () => {
      const mockEvent = {
        target: {
          closest: () => ({ dataset: { mappingIndex: 'invalid' } })
        }
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await mappings.handleRemoveMapping(mockEvent, [], 'comp1');
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid mapping index:', expect.any(Number));
      consoleSpy.mockRestore();
    });

    test('should remove mapping successfully', async () => {
      const mockEvent = {
        target: {
          closest: () => ({ dataset: { mappingIndex: '0' } })
        }
      };
      
      const mockMappings = [
        { target_field: 'field1', source_field: 'field1' }
      ];
      
      const mockComponents = [
        { id: 'comp1', name: 'Component1', mappings: mockMappings }
      ];
      
      global.window.api.getComponents.mockResolvedValue(mockComponents);
      mockMappingService.removeMapping.mockReturnValue([]);
      global.window.api.updateComponent.mockResolvedValue();
      
      const callback = jest.fn();
      mappings.setOnMappingRemoved(callback);
      
      await mappings.handleRemoveMapping(mockEvent, mockMappings, 'comp1');
      
      expect(mockMappingService.removeMapping).toHaveBeenCalledWith(
        mockMappings,
        mockMappings[0]
      );
      expect(global.window.api.updateComponent).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockMappings[0], expect.any(Object));
    });
  });

  describe('updateFieldUsageTable', () => {
    let mockTableBody;
    let mockSection;

    beforeEach(() => {
      mockTableBody = { 
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
      };
      mockSection = { classList: { add: jest.fn(), remove: jest.fn() } };
      
      document.getElementById
        .mockReturnValueOnce(mockTableBody)
        .mockReturnValueOnce(mockSection);
        
      mappings.DataController = {
        findFieldUsageInOtherComponents: jest.fn()
      };
    });

    test('should call DataController method and handle results', () => {
      mappings.DataController.findFieldUsageInOtherComponents.mockReturnValue([
        {
          field: 'field1',
          usedByComponent: 'Component2',
          mappedToField: 'target_field1'
        }
      ]);
      
      mappings.updateFieldUsageTable('comp1', []);
      
      expect(mappings.DataController.findFieldUsageInOtherComponents).toHaveBeenCalledWith('comp1', []);
      expect(mockTableBody.innerHTML).toContain('field1');
      expect(mockTableBody.innerHTML).toContain('Component2');
      expect(mockTableBody.innerHTML).toContain('target_field1');
      expect(mockSection.classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const unsafe = '<script>alert("xss")</script>';
      const escaped = mappings.escapeHtml(unsafe);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should handle non-string values', () => {
      expect(mappings.escapeHtml(123)).toBe('123');
      expect(mappings.escapeHtml(null)).toBe('null');
      expect(mappings.escapeHtml(undefined)).toBe('undefined');
    });

    test('should escape all special characters', () => {
      const unsafe = `&<>"'`;
      const escaped = mappings.escapeHtml(unsafe);
      
      expect(escaped).toBe('&amp;&lt;&gt;&quot;&#039;');
    });
  });
});