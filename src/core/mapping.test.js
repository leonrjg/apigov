// Set up global window mock with moduleRegistry
global.window = global.window || {};
global.window.moduleRegistry = {
  register: jest.fn()
};

// Import the service - need to load and get the class from the file
require('./mapping.js');

// The class is registered with the mocked moduleRegistry
const Mapping = global.window.moduleRegistry.register.mock.calls[0][1];

describe('Mapping Service', () => {
  let mappingService;
  let mockComponents;
  let mockMappings;

  beforeEach(() => {
    mappingService = new Mapping();

    mockComponents = [
      { id: 'comp1', name: 'UserService', type: 'endpoint' },
      { id: 'comp2', name: 'UserTable', type: 'database_table' },
      { id: 'comp3', name: 'OrderService', type: 'endpoint' }
    ];

    mockMappings = [
      {
        target_component_id: 'comp1',
        target_field: 'user.id',
        source_field: 'id',
        source_component_id: 'comp2'
      },
      {
        target_component_id: 'comp1',
        target_field: 'user.name',
        source_field: 'name'
      }
    ];
  });

  describe('constructor', () => {
    test('should initialize with null callback', () => {
      expect(mappingService.onMappingChanged).toBeNull();
    });
  });

  describe('setOnMappingChanged', () => {
    test('should set callback function', () => {
      const callback = jest.fn();
      mappingService.setOnMappingChanged(callback);
      expect(mappingService.onMappingChanged).toBe(callback);
    });
  });

  describe('validateMappingInputs', () => {
    test('should return error for missing target field', () => {
      const result = mappingService.validateMappingInputs(
        null, 'UserService', { field: 'id', source: 'UserTable' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing target field');
    });

    test('should return error for missing target component name', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', null, { field: 'id', source: 'UserTable' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing target component name');
    });

    test('should return error for invalid selected field object', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'UserService', null, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid selected field object');
    });

    test('should return error for missing current component ID', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'UserService', { field: 'id', source: 'UserTable' }, mockComponents, null
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Current component ID is required');
    });

    test('should return error for non-existent target component', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'NonExistentComponent', { field: 'id', source: 'UserTable' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Target component not found: NonExistentComponent');
      expect(result.availableComponents).toEqual(['UserService', 'UserTable', 'OrderService']);
    });

    test('should return error for missing field property in selected field object', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'UserService', { source: 'UserTable' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing field property in selected field object');
    });

    test('should return error for missing source property in selected field object', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'UserService', { field: 'id' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing source property in selected field object');
    });

    test('should return valid result for correct inputs', () => {
      const result = mappingService.validateMappingInputs(
        'user.id', 'UserService', { field: 'id', source: 'UserTable' }, mockComponents, 'comp1'
      );
      expect(result.isValid).toBe(true);
      expect(result.targetComponent).toEqual(mockComponents[0]);
      expect(result.sourceField).toBe('id');
      expect(result.sourceComponentName).toBe('UserTable');
    });
  });

  describe('createFieldMapping', () => {
    test('should return null for invalid inputs', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = mappingService.createFieldMapping(
        null, 'UserService', { field: 'id', source: 'UserTable' }, mockComponents, 'comp1', 'UserService'
      );
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    test('should create mapping for same component', () => {
      const result = mappingService.createFieldMapping(
        'user.id', 'UserService', { field: 'id', source: 'UserService' }, mockComponents, 'comp1', 'UserService'
      );
      expect(result).toEqual({
        target_component_id: 'comp1',
        target_field: 'user.id',
        source_field: 'id'
      });
    });

    test('should create mapping for different component', () => {
      const result = mappingService.createFieldMapping(
        'user.id', 'UserService', { field: 'id', source: 'UserTable' }, mockComponents, 'comp1', 'UserService'
      );
      expect(result).toEqual({
        target_component_id: 'comp1',
        target_field: 'user.id',
        source_field: 'id',
        source_component_id: 'comp2'
      });
    });

    test('should return null when source component not found', () => {
      const result = mappingService.createFieldMapping(
        'user.id', 'UserService', { field: 'id', source: 'NonExistentSource' }, mockComponents, 'comp1', 'UserService'
      );
      expect(result).toBeNull();
    });
  });

  describe('addMapping', () => {
    test('should return original mappings for null mapping', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = mappingService.addMapping(mockMappings, null);
      expect(result).toBe(mockMappings);
      expect(consoleSpy).toHaveBeenCalledWith('[MappingService] Cannot add null mapping');
      consoleSpy.mockRestore();
    });

    test('should add mapping and return updated array', () => {
      const newMapping = {
        target_component_id: 'comp3',
        target_field: 'order.id',
        source_field: 'id'
      };
      const result = mappingService.addMapping(mockMappings, newMapping);
      expect(result).toHaveLength(3);
      expect(result[2]).toBe(newMapping);
    });

    test('should call onMappingChanged callback when set', () => {
      const callback = jest.fn();
      mappingService.setOnMappingChanged(callback);
      const newMapping = {
        target_component_id: 'comp3',
        target_field: 'order.id',
        source_field: 'id'
      };
      const result = mappingService.addMapping(mockMappings, newMapping);
      expect(callback).toHaveBeenCalledWith(result);
    });
  });

  describe('removeMapping', () => {
    test('should remove matching mapping', () => {
      const mappingToRemove = mockMappings[0];
      const result = mappingService.removeMapping(mockMappings, mappingToRemove);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockMappings[1]);
    });

    test('should return original array if mapping not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const nonExistentMapping = {
        target_component_id: 'comp999',
        target_field: 'nonexistent.field',
        source_field: 'nonexistent'
      };
      const result = mappingService.removeMapping(mockMappings, nonExistentMapping);
      expect(result).toBe(mockMappings);
      expect(consoleSpy).toHaveBeenCalledWith('[MappingService] Mapping not found for removal:', nonExistentMapping);
      consoleSpy.mockRestore();
    });

    test('should call onMappingChanged callback when mapping removed', () => {
      const callback = jest.fn();
      mappingService.setOnMappingChanged(callback);
      const mappingToRemove = mockMappings[0];
      const result = mappingService.removeMapping(mockMappings, mappingToRemove);
      expect(callback).toHaveBeenCalledWith(result);
    });
  });

  describe('cleanupMappingsForDeletedField', () => {
    test('should remove mappings with deleted field as target', () => {
      const result = mappingService.cleanupMappingsForDeletedField(mockMappings, 'user.id');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockMappings[1]);
    });

    test('should remove mappings with deleted field as source', () => {
      const result = mappingService.cleanupMappingsForDeletedField(mockMappings, 'id');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockMappings[1]);
    });

    test('should return original array if no mappings match', () => {
      const result = mappingService.cleanupMappingsForDeletedField(mockMappings, 'nonexistent.field');
      expect(result).toEqual(mockMappings);
      expect(result).toHaveLength(mockMappings.length);
    });

    test('should call onMappingChanged callback when mappings removed', () => {
      const callback = jest.fn();
      mappingService.setOnMappingChanged(callback);
      const result = mappingService.cleanupMappingsForDeletedField(mockMappings, 'user.id');
      expect(callback).toHaveBeenCalledWith(result);
    });

    test('should not call onMappingChanged callback when no mappings removed', () => {
      const callback = jest.fn();
      mappingService.setOnMappingChanged(callback);
      mappingService.cleanupMappingsForDeletedField(mockMappings, 'nonexistent.field');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('hasMapping', () => {
    test('should return true for existing mapping', () => {
      const result = mappingService.hasMapping(mockMappings, 'comp1', 'user.id');
      expect(result).toBe(true);
    });

    test('should return false for non-existing mapping', () => {
      const result = mappingService.hasMapping(mockMappings, 'comp1', 'nonexistent.field');
      expect(result).toBe(false);
    });

    test('should return false for non-existing component', () => {
      const result = mappingService.hasMapping(mockMappings, 'comp999', 'user.id');
      expect(result).toBe(false);
    });
  });

  describe('getMappingsForComponent', () => {
    test('should return target mappings by default', () => {
      const result = mappingService.getMappingsForComponent(mockMappings, 'comp1');
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockMappings);
    });

    test('should return target mappings when type is "target"', () => {
      const result = mappingService.getMappingsForComponent(mockMappings, 'comp1', 'target');
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockMappings);
    });

    test('should return source mappings when type is "source"', () => {
      const result = mappingService.getMappingsForComponent(mockMappings, 'comp2', 'source');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockMappings[0]);
    });

    test('should return empty array for invalid type', () => {
      const result = mappingService.getMappingsForComponent(mockMappings, 'comp1', 'invalid');
      expect(result).toEqual([]);
    });

    test('should return empty array for non-existing component', () => {
      const result = mappingService.getMappingsForComponent(mockMappings, 'comp999', 'target');
      expect(result).toEqual([]);
    });
  });

  describe('validateMappingCompleteness', () => {
    test('should return complete validation for all mapped fields', () => {
      const requiredFields = [
        { componentId: 'comp1', field: 'user.id' },
        { componentId: 'comp1', field: 'user.name' }
      ];
      const result = mappingService.validateMappingCompleteness(mockMappings, requiredFields);
      expect(result.isComplete).toBe(true);
      expect(result.missingMappings).toEqual([]);
      expect(result.totalRequired).toBe(2);
      expect(result.totalMapped).toBe(2);
    });

    test('should return incomplete validation for missing mappings', () => {
      const requiredFields = [
        { componentId: 'comp1', field: 'user.id' },
        { componentId: 'comp1', field: 'user.name' },
        { componentId: 'comp1', field: 'user.email' }
      ];
      const result = mappingService.validateMappingCompleteness(mockMappings, requiredFields);
      expect(result.isComplete).toBe(false);
      expect(result.missingMappings).toEqual([{ componentId: 'comp1', field: 'user.email' }]);
      expect(result.totalRequired).toBe(3);
      expect(result.totalMapped).toBe(2);
    });

    test('should return complete validation for empty required fields', () => {
      const result = mappingService.validateMappingCompleteness(mockMappings, []);
      expect(result.isComplete).toBe(true);
      expect(result.missingMappings).toEqual([]);
      expect(result.totalRequired).toBe(0);
      expect(result.totalMapped).toBe(0);
    });
  });
});