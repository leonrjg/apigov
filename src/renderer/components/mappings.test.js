// Set up global window mock with moduleRegistry and dependencies
global.window = global.window || {};
global.window.moduleRegistry = {
  register: jest.fn()
};

// Mock window.requireModule to return mock dependencies
global.window.requireModule = jest.fn((moduleName) => {
  if (moduleName === 'ComponentModel') {
    return {
      getFieldPaths: jest.fn()
    };
  }
  if (moduleName === 'DropdownUtils') {
    return {
      createDropdown: jest.fn()
    };
  }
  return {};
});

// Mock window.api
global.window.api = {
  getComponents: jest.fn(),
  updateComponent: jest.fn()
};

// Import the component - need to load and get the class from the file
require('./mappings.js');

// The class is registered with the mocked moduleRegistry
const Mappings = global.window.moduleRegistry.register.mock.calls[0][1];

describe('Mappings Component', () => {
  let mappingsComponent;
  let mockDependencyValidationService;
  let mockMappingService;
  let mockComponents;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up mock services
    mockDependencyValidationService = {
      getAllMissingMappings: jest.fn()
    };
    
    mockMappingService = {
      createFieldMapping: jest.fn(),
      addMapping: jest.fn(),
      removeMapping: jest.fn()
    };

    // Mock components data
    mockComponents = [
      {
        id: 'comp1',
        name: 'UserService',
        type: 'endpoint',
        input: { user_id: 'string', name: 'string' },
        output: { user_data: 'object' },
        consumes: ['comp2']
      },
      {
        id: 'comp2',
        name: 'UserTable',
        type: 'database_table',
        input: { id: 'string', name: 'string' },
        output: { user_id: 'string', user_name: 'string' }
      },
      {
        id: 'comp3',
        name: 'ProfileService',
        type: 'endpoint',
        input: { profile_id: 'string' },
        output: { profile_data: 'object' }
      }
    ];

    // Create instance
    mappingsComponent = new Mappings(mockDependencyValidationService, mockMappingService);
  });

  describe('constructor', () => {
    test('should initialize with required dependencies', () => {
      expect(mappingsComponent.dependencyValidationService).toBe(mockDependencyValidationService);
      expect(mappingsComponent.mappingService).toBe(mockMappingService);
      expect(mappingsComponent.containerId).toBeNull();
      expect(mappingsComponent.allComponents).toEqual([]);
      expect(mappingsComponent.onMappingAdded).toBeNull();
    });

    test('should get dependencies from module system', () => {
      expect(global.window.requireModule).toHaveBeenCalledWith('ComponentModel');
      expect(global.window.requireModule).toHaveBeenCalledWith('DropdownUtils');
      expect(mappingsComponent.Component).toBeDefined();
      expect(mappingsComponent.DropdownUtils).toBeDefined();
    });
  });

  describe('setOnMappingAdded', () => {
    test('should set callback function', () => {
      const callback = jest.fn();
      mappingsComponent.setOnMappingAdded(callback);
      expect(mappingsComponent.onMappingAdded).toBe(callback);
    });
  });

  describe('groupMappingsByComponent', () => {
    test('should group mappings by component name', () => {
      const missingMappings = [
        { componentName: 'UserService', missingField: 'user_id', fromComponent: 'UserTable' },
        { componentName: 'UserService', missingField: 'name', fromComponent: 'UserTable' },
        { componentName: 'ProfileService', missingField: 'profile_id', fromComponent: 'UserService' }
      ];

      const result = mappingsComponent.groupMappingsByComponent(missingMappings);

      expect(result).toEqual({
        'UserService': [
          { componentName: 'UserService', missingField: 'user_id', fromComponent: 'UserTable' },
          { componentName: 'UserService', missingField: 'name', fromComponent: 'UserTable' }
        ],
        'ProfileService': [
          { componentName: 'ProfileService', missingField: 'profile_id', fromComponent: 'UserService' }
        ]
      });
    });

    test('should return empty object for empty array', () => {
      const result = mappingsComponent.groupMappingsByComponent([]);
      expect(result).toEqual({});
    });

    test('should handle single mapping', () => {
      const missingMappings = [
        { componentName: 'UserService', missingField: 'user_id', fromComponent: 'UserTable' }
      ];

      const result = mappingsComponent.groupMappingsByComponent(missingMappings);

      expect(result).toEqual({
        'UserService': [
          { componentName: 'UserService', missingField: 'user_id', fromComponent: 'UserTable' }
        ]
      });
    });
  });

  describe('getAvailableFieldsForMapping', () => {
    beforeEach(() => {
      // Set up mock components for these tests
      mappingsComponent.allComponents = mockComponents;
      
      // Mock Component.getFieldPaths to return field paths
      mappingsComponent.Component.getFieldPaths.mockImplementation((schema) => {
        if (!schema) return [];
        return Object.keys(schema);
      });
    });

    test('should return empty array for non-existent component', () => {
      const result = mappingsComponent.getAvailableFieldsForMapping('non-existent', 'UserTable');
      expect(result).toEqual([]);
    });

    test('should return fields from current component input and output', () => {
      const result = mappingsComponent.getAvailableFieldsForMapping('comp1', 'UserTable');

      expect(mappingsComponent.Component.getFieldPaths).toHaveBeenCalledWith({ user_id: 'string', name: 'string' });
      expect(mappingsComponent.Component.getFieldPaths).toHaveBeenCalledWith({ user_data: 'object' });
      
      expect(result).toContainEqual({
        field: 'user_id',
        source: 'UserService',
        sourceId: 'comp1',
        display: 'user_id (from UserService)'
      });
      expect(result).toContainEqual({
        field: 'user_data',
        source: 'UserService',
        sourceId: 'comp1',
        display: 'user_data (from UserService)'
      });
    });

    test('should return fields from consumed components', () => {
      const result = mappingsComponent.getAvailableFieldsForMapping('comp1', 'ProfileService');

      expect(mappingsComponent.Component.getFieldPaths).toHaveBeenCalledWith({ user_id: 'string', user_name: 'string' });
      
      expect(result).toContainEqual({
        field: 'user_id',
        source: 'UserTable',
        sourceId: 'comp2',
        display: 'user_id (from UserTable)'
      });
      expect(result).toContainEqual({
        field: 'user_name',
        source: 'UserTable',
        sourceId: 'comp2',
        display: 'user_name (from UserTable)'
      });
    });

    test('should exclude target component from consumed components', () => {
      const result = mappingsComponent.getAvailableFieldsForMapping('comp1', 'UserTable');

      const userTableFields = result.filter(field => field.source === 'UserTable');
      expect(userTableFields).toHaveLength(0);
    });

    test('should handle component with no consumes array', () => {
      const componentWithoutConsumes = {
        id: 'comp4',
        name: 'StandaloneService',
        type: 'endpoint',
        input: { data: 'string' },
        output: { result: 'string' }
      };
      mappingsComponent.allComponents = [componentWithoutConsumes];

      const result = mappingsComponent.getAvailableFieldsForMapping('comp4', 'SomeTarget');

      expect(result).toContainEqual({
        field: 'data',
        source: 'StandaloneService',
        sourceId: 'comp4',
        display: 'data (from StandaloneService)'
      });
    });

    test('should handle component with empty input/output', () => {
      const componentWithEmptySchemas = {
        id: 'comp5',
        name: 'EmptyService',
        type: 'endpoint',
        input: {},
        output: {}
      };
      mappingsComponent.allComponents = [componentWithEmptySchemas];

      const result = mappingsComponent.getAvailableFieldsForMapping('comp5', 'SomeTarget');

      expect(result).toEqual([]);
    });
  });

  describe('findFieldUsageInOtherComponents', () => {
    beforeEach(() => {
      // Set up mock components for these tests
      mappingsComponent.allComponents = mockComponents;
      
      // Mock Component.getFieldPaths to return field paths
      mappingsComponent.Component.getFieldPaths.mockImplementation((schema) => {
        if (!schema) return [];
        return Object.keys(schema);
      });

      // Add mappings to components
      mockComponents[0].mappings = [
        { source_component_id: 'comp2', source_field: 'user_id', target_field: 'user_id' },
        { source_component_id: 'comp2', source_field: 'user_name', target_field: 'name' }
      ];
      mockComponents[2].mappings = [
        { source_component_id: 'comp2', source_field: 'user_id', target_field: 'profile_id' }
      ];
    });

    test('should return empty array for non-existent component', () => {
      const result = mappingsComponent.findFieldUsageInOtherComponents('non-existent', mockComponents);
      expect(result).toEqual([]);
    });

    test('should find field usage in other components', () => {
      const result = mappingsComponent.findFieldUsageInOtherComponents('comp2', mockComponents);

      expect(result).toContainEqual({
        field: 'user_id',
        usedByComponent: 'UserService',
        usedByComponentId: 'comp1',
        mappedToField: 'user_id'
      });
      expect(result).toContainEqual({
        field: 'user_name',
        usedByComponent: 'UserService',
        usedByComponentId: 'comp1',
        mappedToField: 'name'
      });
      expect(result).toContainEqual({
        field: 'user_id',
        usedByComponent: 'ProfileService',
        usedByComponentId: 'comp3',
        mappedToField: 'profile_id'
      });
    });

    test('should exclude current component from search', () => {
      const result = mappingsComponent.findFieldUsageInOtherComponents('comp1', mockComponents);

      const usageFromComp1 = result.filter(usage => usage.usedByComponent === 'UserService');
      expect(usageFromComp1).toHaveLength(0);
    });

    test('should handle components without mappings', () => {
      const componentsWithoutMappings = [
        { id: 'comp1', name: 'Service1', input: { field1: 'string' }, output: { field2: 'string' } },
        { id: 'comp2', name: 'Service2' }
      ];

      const result = mappingsComponent.findFieldUsageInOtherComponents('comp1', componentsWithoutMappings);
      expect(result).toEqual([]);
    });

    test('should only include fields that exist in current component', () => {
      const result = mappingsComponent.findFieldUsageInOtherComponents('comp2', mockComponents);

      // Only user_id and user_name should be found (from comp2's output)
      const foundFields = result.map(usage => usage.field);
      expect(foundFields).toContain('user_id');
      expect(foundFields).toContain('user_name');
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML characters', () => {
      const unsafe = '<script>alert("xss")</script>';
      const result = mappingsComponent.escapeHtml(unsafe);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should escape all special characters', () => {
      const unsafe = `<>&"'`;
      const result = mappingsComponent.escapeHtml(unsafe);
      expect(result).toBe('&lt;&gt;&amp;&quot;&#039;');
    });

    test('should handle non-string input', () => {
      const result1 = mappingsComponent.escapeHtml(123);
      expect(result1).toBe('123');

      const result2 = mappingsComponent.escapeHtml(null);
      expect(result2).toBe('null');

      const result3 = mappingsComponent.escapeHtml(undefined);
      expect(result3).toBe('undefined');
    });

    test('should handle empty string', () => {
      const result = mappingsComponent.escapeHtml('');
      expect(result).toBe('');
    });

    test('should handle normal text without special characters', () => {
      const result = mappingsComponent.escapeHtml('normal text');
      expect(result).toBe('normal text');
    });
  });

  describe('generateHTML', () => {
    test('should generate success HTML for empty mappings', () => {
      const result = mappingsComponent.generateHTML([]);
      
      expect(result).toContain('No pending tasks');
      expect(result).toContain('No missing mappings detected');
      expect(result).toContain('text-success');
    });

    test('should generate warning HTML for missing mappings', () => {
      const missingMappings = [
        {
          componentName: 'UserService',
          componentId: 'comp1',
          missingField: 'user_id',
          fromComponent: 'UserTable'
        }
      ];

      const result = mappingsComponent.generateHTML(missingMappings);
      
      expect(result).toContain('Pending tasks');
      expect(result).toContain('Some fields need to be mapped');
      expect(result).toContain('text-warning');
      expect(result).toContain('UserService');
      expect(result).toContain('user_id');
      expect(result).toContain('UserTable');
    });

    test('should handle multiple components with mappings', () => {
      const missingMappings = [
        {
          componentName: 'UserService',
          componentId: 'comp1',
          missingField: 'user_id',
          fromComponent: 'UserTable'
        },
        {
          componentName: 'UserService',
          componentId: 'comp1',
          missingField: 'name',
          fromComponent: 'UserTable'
        },
        {
          componentName: 'ProfileService',
          componentId: 'comp3',
          missingField: 'profile_id',
          fromComponent: 'UserService'
        }
      ];

      const result = mappingsComponent.generateHTML(missingMappings);
      
      expect(result).toContain('UserService');
      expect(result).toContain('ProfileService');
      expect(result).toContain('data-count="2"');
      expect(result).toContain('data-count="1"');
    });
  });

  describe('setOnMappingRemoved', () => {
    test('should set callback function', () => {
      const callback = jest.fn();
      mappingsComponent.setOnMappingRemoved(callback);
      expect(mappingsComponent.onMappingRemoved).toBe(callback);
    });
  });
});