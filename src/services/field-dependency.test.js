// Set up global window mock with moduleRegistry
global.window = global.window || {};
global.window.moduleRegistry = {
  register: jest.fn()
};

// Mock the ComponentModel dependency
const mockComponentModel = {
  check: jest.fn(),
  checkComponentDependencies: jest.fn(),
  getFieldPaths: jest.fn(),
  isFieldAvailableInConsumedComponents: jest.fn()
};

// Mock requireModule
global.window.requireModule = jest.fn().mockImplementation((moduleName) => {
  if (moduleName === 'ComponentModel') {
    return mockComponentModel;
  }
  return null;
});

// Import the service - need to load and get the class from the file
require('./field-dependency.js');

// The class is registered with the mocked moduleRegistry
const FieldDependency = global.window.moduleRegistry.register.mock.calls[0][1];

describe('FieldDependency Service', () => {
  let fieldDependencyService;
  let mockComponents;
  let mockCurrentFields;

  beforeEach(() => {
    fieldDependencyService = new FieldDependency();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    mockComponents = [
      { 
        id: 'comp1', 
        name: 'UserService', 
        type: 'endpoint',
        consumes: ['comp2'],
        input: { user: { id: 'string', name: 'string' } },
        mappings: [
          {
            target_component_id: 'comp2',
            target_field: 'user.id',
            source_field: 'id'
          }
        ]
      },
      { 
        id: 'comp2', 
        name: 'UserTable', 
        type: 'endpoint',
        input: { user: { id: 'string', name: 'string', email: 'string' } }
      },
      { 
        id: 'comp3', 
        name: 'OrderService', 
        type: 'endpoint',
        consumes: ['comp1'],
        input: { order: { id: 'string', userId: 'string' } }
      }
    ];

    mockCurrentFields = ['user.name', 'user.email'];
  });

  describe('constructor', () => {
    test('should initialize with ComponentModel dependency', () => {
      // Constructor calls requireModule, so we need to clear the mock and create a new instance
      jest.clearAllMocks();
      const newService = new FieldDependency();
      expect(global.window.requireModule).toHaveBeenCalledWith('ComponentModel');
      expect(newService.Component).toBe(mockComponentModel);
    });
  });

  describe('validateFieldDependencies', () => {
    test('should return valid dependencies when component has no consumes', async () => {
      const component = { id: 'comp1', consumes: [] };
      
      const result = await fieldDependencyService.validateFieldDependencies(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual({
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      });
    });

    test('should return valid dependencies when component consumes is null', async () => {
      const component = { id: 'comp1', consumes: null };
      
      const result = await fieldDependencyService.validateFieldDependencies(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual({
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      });
    });

    test('should return valid dependencies when no missing dependencies found', async () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      mockComponentModel.check.mockResolvedValue({
        hasMissingDependencies: false
      });
      
      const result = await fieldDependencyService.validateFieldDependencies(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual({
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      });
      expect(mockComponentModel.check).toHaveBeenCalledWith('comp1');
    });

    test('should return invalid dependencies with missing fields when dependencies are missing', async () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      mockComponentModel.check.mockResolvedValue({
        hasMissingDependencies: true
      });
      
      // Mock buildMissingFieldsData to return some missing fields
      const mockMissingFields = [
        { field: 'user.id', fromComponent: 'UserTable', fromComponentId: 'comp2' }
      ];
      jest.spyOn(fieldDependencyService, 'buildMissingFieldsData').mockReturnValue(mockMissingFields);
      
      const result = await fieldDependencyService.validateFieldDependencies(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual({
        hasValidDependencies: false,
        missingFields: mockMissingFields,
        hasMissingDependencies: true
      });
    });

    test('should return valid dependencies when missing fields array is empty', async () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      mockComponentModel.check.mockResolvedValue({
        hasMissingDependencies: true
      });
      
      jest.spyOn(fieldDependencyService, 'buildMissingFieldsData').mockReturnValue([]);
      
      const result = await fieldDependencyService.validateFieldDependencies(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual({
        hasValidDependencies: true,
        missingFields: [],
        hasMissingDependencies: false
      });
    });
  });

  describe('buildMissingFieldsData', () => {
    test('should return empty array when component has no consumes', () => {
      const component = { id: 'comp1', consumes: [] };
      
      const result = fieldDependencyService.buildMissingFieldsData(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual([]);
    });

    test('should skip non-endpoint consumed components', () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      const componentsWithNonEndpoint = [
        { id: 'comp2', name: 'UserTable', type: 'database_table', input: { user: { id: 'string' } } }
      ];
      
      const result = fieldDependencyService.buildMissingFieldsData(component, componentsWithNonEndpoint, mockCurrentFields);
      
      expect(result).toEqual([]);
    });

    test('should skip consumed components without input', () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      const componentsWithoutInput = [
        { id: 'comp2', name: 'UserTable', type: 'endpoint' }
      ];
      
      const result = fieldDependencyService.buildMissingFieldsData(component, componentsWithoutInput, mockCurrentFields);
      
      expect(result).toEqual([]);
    });

    test('should return missing fields for unresolved fields', () => {
      const component = { id: 'comp1', consumes: ['comp2'] };
      const consumedFields = ['user.id', 'user.name', 'user.email'];
      
      mockComponentModel.getFieldPaths.mockReturnValue(consumedFields);
      jest.spyOn(fieldDependencyService, 'isFieldResolved')
        .mockReturnValueOnce(false) // user.id is not resolved
        .mockReturnValueOnce(true)  // user.name is resolved
        .mockReturnValueOnce(true); // user.email is resolved
      
      const result = fieldDependencyService.buildMissingFieldsData(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual([
        {
          field: 'user.id',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2'
        }
      ]);
    });

    test('should handle multiple consumed components', () => {
      const component = { id: 'comp1', consumes: ['comp2', 'comp3'] };
      const consumedFields = ['user.id'];
      
      mockComponentModel.getFieldPaths.mockReturnValue(consumedFields);
      jest.spyOn(fieldDependencyService, 'isFieldResolved').mockReturnValue(false);
      
      const result = fieldDependencyService.buildMissingFieldsData(component, mockComponents, mockCurrentFields);
      
      expect(result).toEqual([
        {
          field: 'user.id',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2'
        },
        {
          field: 'user.id',
          fromComponent: 'OrderService',
          fromComponentId: 'comp3'
        }
      ]);
    });
  });

  describe('isFieldResolved', () => {
    const consumedComponent = { id: 'comp2', name: 'UserTable' };
    const currentComponent = { id: 'comp1', consumes: ['comp2'] };

    test('should return true when field exists in current fields', () => {
      const result = fieldDependencyService.isFieldResolved('user.name', consumedComponent, currentComponent, mockComponents, mockCurrentFields);
      
      expect(result).toBe(true);
    });

    test('should return true when field is available in consumed components', () => {
      jest.spyOn(fieldDependencyService, 'isFieldAvailableInConsumedComponents').mockReturnValue(true);
      
      const result = fieldDependencyService.isFieldResolved('user.id', consumedComponent, currentComponent, mockComponents, mockCurrentFields);
      
      expect(result).toBe(true);
      expect(fieldDependencyService.isFieldAvailableInConsumedComponents).toHaveBeenCalledWith('user.id', 'UserTable', ['comp2'], mockComponents);
    });

    test('should return true when field has a mapping', () => {
      const currentComponentWithMappings = {
        ...currentComponent,
        mappings: [
          {
            target_component_id: 'comp2',
            target_field: 'user.id',
            source_field: 'id'
          }
        ]
      };
      
      jest.spyOn(fieldDependencyService, 'isFieldAvailableInConsumedComponents').mockReturnValue(false);
      
      const result = fieldDependencyService.isFieldResolved('user.id', consumedComponent, currentComponentWithMappings, mockComponents, []);
      
      expect(result).toBe(true);
    });

    test('should return false when field is not resolved by any method', () => {
      jest.spyOn(fieldDependencyService, 'isFieldAvailableInConsumedComponents').mockReturnValue(false);
      
      const result = fieldDependencyService.isFieldResolved('user.unknown', consumedComponent, currentComponent, mockComponents, mockCurrentFields);
      
      expect(result).toBe(false);
    });

    test('should handle component without mappings', () => {
      jest.spyOn(fieldDependencyService, 'isFieldAvailableInConsumedComponents').mockReturnValue(false);
      
      const result = fieldDependencyService.isFieldResolved('user.unknown', consumedComponent, currentComponent, mockComponents, []);
      
      expect(result).toBe(false);
    });
  });

  describe('isFieldAvailableInConsumedComponents', () => {
    test('should delegate to ComponentModel with correct parameters', () => {
      const field = 'user.id';
      const excludeComponentName = 'UserTable';
      const selectedTags = ['comp2'];
      
      jest.spyOn(fieldDependencyService, 'getComponentIdByName').mockReturnValue('comp2');
      mockComponentModel.isFieldAvailableInConsumedComponents.mockReturnValue(true);
      
      const result = fieldDependencyService.isFieldAvailableInConsumedComponents(field, excludeComponentName, selectedTags, mockComponents);
      
      expect(fieldDependencyService.getComponentIdByName).toHaveBeenCalledWith(excludeComponentName, mockComponents);
      expect(mockComponentModel.isFieldAvailableInConsumedComponents).toHaveBeenCalledWith(field, 'comp2', selectedTags, mockComponents);
      expect(result).toBe(true);
    });
  });

  describe('getComponentIdByName', () => {
    test('should return component ID when component is found', () => {
      const result = fieldDependencyService.getComponentIdByName('UserTable', mockComponents);
      
      expect(result).toBe('comp2');
    });

    test('should return null when component is not found', () => {
      const result = fieldDependencyService.getComponentIdByName('NonExistentComponent', mockComponents);
      
      expect(result).toBeNull();
    });
  });

  describe('getAllMissingMappings', () => {
    test('should return empty array when no components', async () => {
      const result = await fieldDependencyService.getAllMissingMappings([]);
      
      expect(result).toEqual([]);
    });

    test('should skip non-endpoint components', async () => {
      const componentsWithNonEndpoint = [
        { id: 'comp1', name: 'UserTable', type: 'database_table', consumes: ['comp2'] }
      ];
      
      const result = await fieldDependencyService.getAllMissingMappings(componentsWithNonEndpoint);
      
      expect(result).toEqual([]);
    });

    test('should skip components without consumes', async () => {
      const componentsWithoutConsumes = [
        { id: 'comp1', name: 'UserService', type: 'endpoint' }
      ];
      
      const result = await fieldDependencyService.getAllMissingMappings(componentsWithoutConsumes);
      
      expect(result).toEqual([]);
    });

    test('should skip components with empty consumes', async () => {
      const componentsWithEmptyConsumes = [
        { id: 'comp1', name: 'UserService', type: 'endpoint', consumes: [] }
      ];
      
      const result = await fieldDependencyService.getAllMissingMappings(componentsWithEmptyConsumes);
      
      expect(result).toEqual([]);
    });

    test('should skip components without missing dependencies', async () => {
      mockComponentModel.checkComponentDependencies.mockResolvedValue({
        hasMissingDependencies: false
      });
      
      const result = await fieldDependencyService.getAllMissingMappings(mockComponents);
      
      expect(result).toEqual([]);
    });

    test('should return missing mappings for components with missing dependencies', async () => {
      const mockMissingFields = [
        { path: 'user.id', from: 'comp2', message: 'Field user.id is missing' },
        { path: 'user.email', from: 'comp2', message: 'Field user.email is missing' }
      ];
      
      mockComponentModel.checkComponentDependencies.mockResolvedValue({
        hasMissingDependencies: true,
        missingFields: mockMissingFields
      });
      
      const result = await fieldDependencyService.getAllMissingMappings(mockComponents);
      
      expect(result).toEqual([
        {
          componentName: 'UserService',
          componentId: 'comp1',
          missingField: 'user.id',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2',
          message: 'Field user.id is missing'
        },
        {
          componentName: 'UserService',
          componentId: 'comp1',
          missingField: 'user.email',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2',
          message: 'Field user.email is missing'
        },
        {
          componentName: 'OrderService',
          componentId: 'comp3',
          missingField: 'user.id',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2',
          message: 'Field user.id is missing'
        },
        {
          componentName: 'OrderService',
          componentId: 'comp3',
          missingField: 'user.email',
          fromComponent: 'UserTable',
          fromComponentId: 'comp2',
          message: 'Field user.email is missing'
        }
      ]);
    });

    test('should handle missing from component gracefully', async () => {
      const mockMissingFields = [
        { path: 'user.id', from: 'nonexistent-id', message: 'Field user.id is missing' }
      ];
      
      mockComponentModel.checkComponentDependencies.mockResolvedValue({
        hasMissingDependencies: true,
        missingFields: mockMissingFields
      });
      
      const result = await fieldDependencyService.getAllMissingMappings(mockComponents);
      
      expect(result[0].fromComponent).toBeUndefined();
      expect(result[0].fromComponentId).toBeNull();
    });
  });
});