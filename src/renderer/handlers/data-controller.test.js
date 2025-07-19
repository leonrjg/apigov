// Set up global window mock with moduleRegistry and api
global.window = global.window || {};
global.window.moduleRegistry = {
  register: jest.fn()
};

// Mock the window.api object for IPC communication
global.window.api = {
  getComponents: jest.fn(),
  deleteComponent: jest.fn(),
  cloneComponent: jest.fn()
};

// Mock the ComponentModel dependency
const mockComponentModel = {
  getFieldPaths: jest.fn()
};

// Mock requireModule
global.window.requireModule = jest.fn().mockImplementation((moduleName) => {
  if (moduleName === 'Component') {
    return mockComponentModel;
  }
  return null;
});

// Import the controller - need to load and get the instance from the file
require('./data-controller.js');

// The instance is registered with the mocked moduleRegistry
const dataControllerInstance = global.window.moduleRegistry.register.mock.calls[0][1];
// Get the constructor from the instance
const DataController = dataControllerInstance.constructor;

describe('DataController', () => {
  let dataController;
  let mockComponents;

  beforeEach(() => {
    dataController = new DataController();
    dataController.Component = mockComponentModel;
    dataController.allComponents = [];
    
    // Reset all mocks
    jest.clearAllMocks();
    
    mockComponents = [
      {
        id: 'comp1',
        name: 'UserService',
        type: 'endpoint',
        consumes: ['comp2'],
        input: { user: { id: 'string', name: 'string' } },
        output: { result: { status: 'string' } },
        mappings: [
          {
            source_component_id: 'comp2',
            source_field: 'user.email',
            target_field: 'user.email'
          }
        ]
      },
      {
        id: 'comp2',
        name: 'UserTable',
        type: 'endpoint',
        input: { user: { id: 'string', email: 'string' } },
        output: { user: { id: 'string', name: 'string', email: 'string' } }
      },
      {
        id: 'comp3',
        name: 'OrderService',
        type: 'endpoint',
        consumes: ['comp1'],
        input: { order: { id: 'string', userId: 'string' } }
      }
    ];

    // Mock getFieldPaths for consistent field extraction
    mockComponentModel.getFieldPaths.mockImplementation((schema) => {
      if (!schema || Object.keys(schema).length === 0) return [];
      return Object.keys(schema).flatMap(key => 
        typeof schema[key] === 'object' && schema[key] !== null
          ? Object.keys(schema[key]).map(subKey => `${key}.${subKey}`)
          : [key]
      );
    });
  });

  describe('API methods', () => {
    test('getComponents should call window.api and handle success/error', async () => {
      global.window.api.getComponents.mockResolvedValue(mockComponents);
      expect(await dataController.getComponents()).toEqual(mockComponents);
      expect(global.window.api.getComponents).toHaveBeenCalledTimes(1);

      // Test error handling
      const error = new Error('API Error');
      global.window.api.getComponents.mockRejectedValue(error);
      await expect(dataController.getComponents()).rejects.toThrow('API Error');
    });

    test('deleteComponent should call window.api and return boolean result', async () => {
      global.window.api.deleteComponent.mockResolvedValue();
      expect(await dataController.deleteComponent('comp1')).toBe(true);
      expect(global.window.api.deleteComponent).toHaveBeenCalledWith('comp1');

      // Test error handling
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      global.window.api.deleteComponent.mockRejectedValue(new Error('Delete failed'));
      expect(await dataController.deleteComponent('comp1')).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('cloneComponent should call window.api and return result or null', async () => {
      const clonedComponent = { ...mockComponents[0], id: 'new-id' };
      global.window.api.cloneComponent.mockResolvedValue(clonedComponent);
      expect(await dataController.cloneComponent('comp1')).toEqual(clonedComponent);

      // Test error handling
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      global.window.api.cloneComponent.mockRejectedValue(new Error('Clone failed'));
      expect(await dataController.cloneComponent('comp1')).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('component lookup methods', () => {
    beforeEach(() => {
      global.window.api.getComponents.mockResolvedValue(mockComponents);
    });

    test('findComponentById should find existing components and return undefined for missing', async () => {
      expect(await dataController.findComponentById('comp2')).toEqual(mockComponents[1]);
      expect(await dataController.findComponentById('nonexistent')).toBeUndefined();
    });

    test('findComponentsConsuming should find dependent components', async () => {
      expect(await dataController.findComponentsConsuming('comp1')).toEqual([mockComponents[2]]);
      expect(await dataController.findComponentsConsuming('comp3')).toEqual([]);
      
      // Test with components missing consumes array
      const componentsWithoutConsumes = [
        { id: 'comp1', name: 'Test' },
        { id: 'comp2', name: 'Test2', consumes: ['comp1'] }
      ];
      global.window.api.getComponents.mockResolvedValue(componentsWithoutConsumes);
      expect(await dataController.findComponentsConsuming('comp1')).toEqual([componentsWithoutConsumes[1]]);
    });
  });

  describe('field analysis methods', () => {
    test('findFieldUsageInOtherComponents should find field usage in mappings', () => {
      const result = dataController.findFieldUsageInOtherComponents('comp2', mockComponents);
      expect(result).toEqual([
        {
          field: 'user.email',
          usedByComponent: 'UserService',
          usedByComponentId: 'comp1',
          mappedToField: 'user.email'
        }
      ]);

      // Test edge cases
      expect(dataController.findFieldUsageInOtherComponents('nonexistent', mockComponents)).toEqual([]);
      expect(dataController.findFieldUsageInOtherComponents('comp1', mockComponents).every(
        usage => usage.usedByComponentId !== 'comp1'
      )).toBe(true);
    });

    test('getAvailableFieldsForMapping should return available fields from current and consumed components', async () => {
      // Mock getComponents to return mockComponents
      dataController.getComponents = jest.fn().mockResolvedValue(mockComponents);
      
      // Mock getFieldPaths to return expected field paths for each schema
      mockComponentModel.getFieldPaths.mockImplementation((schema) => {
        if (!schema || typeof schema !== 'object') return [];
        
        // For UserService input: { user: { id: 'string', name: 'string' } }
        if (schema.user && schema.user.id && schema.user.name && !schema.user.email) {
          return ['user.id', 'user.name'];
        }
        
        // For UserTable output: { user: { id: 'string', name: 'string', email: 'string' } }
        if (schema.user && schema.user.id && schema.user.name && schema.user.email) {
          return ['user.id', 'user.name', 'user.email'];
        }
        
        // For UserService output: { result: { status: 'string' } }
        if (schema.result && schema.result.status) {
          return ['result.status'];
        }
        
        // For UserTable input: { user: { id: 'string', email: 'string' } }
        if (schema.user && schema.user.id && schema.user.email && !schema.user.name) {
          return ['user.id', 'user.email'];
        }
        
        return [];
      });

      const result = await dataController.getAvailableFieldsForMapping('comp1', 'TargetComponent');

      // Should include current component fields
      expect(result).toContainEqual({
        field: 'user.id',
        source: 'UserService',
        sourceId: 'comp1',
        display: 'user.id (from UserService)'
      });

      // Should include consumed component fields
      expect(result).toContainEqual({
        field: 'user.email',
        source: 'UserTable',
        sourceId: 'comp2',
        display: 'user.email (from UserTable)'
      });

      // Test edge cases
      expect(await dataController.getAvailableFieldsForMapping('nonexistent', 'Target')).toEqual([]);

      // Should exclude target component
      const resultExcluding = await dataController.getAvailableFieldsForMapping('comp1', 'UserTable');
      expect(resultExcluding.filter(field => field.source === 'UserTable')).toEqual([]);
    });
  });

  describe('utility methods', () => {
    test('groupMappingsByComponent should group mappings by component name', () => {
      const missingMappings = [
        { componentName: 'UserService', field: 'user.id' },
        { componentName: 'UserService', field: 'user.name' },
        { componentName: 'OrderService', field: 'order.id' }
      ];

      const result = dataController.groupMappingsByComponent(missingMappings);

      expect(result).toEqual({
        'UserService': [
          { componentName: 'UserService', field: 'user.id' },
          { componentName: 'UserService', field: 'user.name' }
        ],
        'OrderService': [
          { componentName: 'OrderService', field: 'order.id' }
        ]
      });

      // Test edge cases
      expect(dataController.groupMappingsByComponent([])).toEqual({});
    });
  });
});