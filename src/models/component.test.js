// Mock window.api for testing
const mockGetComponents = jest.fn();

// Set up the window object with mocked API before requiring Component
global.window = global.window || {};
global.window.api = {
  getComponents: mockGetComponents
};

const Component = require('./component.js');

describe('Component.checkComponentDependencies', () => {
  beforeEach(() => {
    mockGetComponents.mockClear();
  });

  test('should return no missing dependencies when component is not found', async () => {
    mockGetComponents.mockResolvedValue([]);

    await expect(Component.checkComponentDependencies('non-existent-id'))
      .rejects.toThrow('Component with ID non-existent-id not found');
  });

  test('should return no missing dependencies for database_table type components', async () => {
    const components = [
      {
        id: 'db-1',
        name: 'Users Table',
        type: 'database_table',
        consumes: ['endpoint-1'],
        input: { user_id: 'string', name: 'string' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('db-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should return no missing dependencies when component has no consumes array', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        input: { user_id: 'string' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should return no missing dependencies when consumes array is empty', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: [],
        input: { user_id: 'string' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should identify missing fields when consumed component fields are not present in current component', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0]).toEqual({
      path: 'profile_data',
      type: 'string',
      value: 'object',
      from: 'endpoint-2',
      message: null
    });
  });

  test('should not report missing dependencies when all required fields are present', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string', profile_data: 'object' },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should handle valid internal mappings (no source_component_id)', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string', internal_profile: 'object' },
        mappings: [
          {
            target_component_id: 'endpoint-2',
            target_field: 'profile_data',
            source_field: 'internal_profile'
          }
        ]
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should report missing dependencies when internal mapping source field does not exist', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: [
          {
            target_component_id: 'endpoint-2',
            target_field: 'profile_data',
            source_field: 'non_existent_field'
          }
        ]
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0]).toEqual({
      path: 'profile_data',
      type: 'string',
      value: 'object',
      from: 'endpoint-2',
      message: 'Invalid mapping: non_existent_field not found in the input of component User Service'
    });
  });

  test('should handle valid cross-component mappings', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: [
          {
            target_component_id: 'endpoint-2',
            target_field: 'profile_data',
            source_field: 'user_profile',
            source_component_id: 'endpoint-3'
          }
        ]
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      },
      {
        id: 'endpoint-3',
        name: 'Data Source',
        type: 'endpoint',
        output: { user_profile: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should report error when cross-component mapping source component does not exist', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: [
          {
            target_component_id: 'endpoint-2',
            target_field: 'profile_data',
            source_field: 'user_profile',
            source_component_id: 'non-existent-component'
          }
        ]
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0]).toEqual({
      path: 'profile_data',
      type: 'string',
      value: 'object',
      from: 'endpoint-2',
      message: 'Invalid existing mapping: source component not found'
    });
  });

  test('should report error when cross-component mapping source field does not exist in source component', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: [
          {
            target_component_id: 'endpoint-2',
            target_field: 'profile_data',
            source_field: 'non_existent_field',
            source_component_id: 'endpoint-3'
          }
        ]
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { user_id: 'string', profile_data: 'object' }
      },
      {
        id: 'endpoint-3',
        name: 'Data Source',
        type: 'endpoint',
        output: { user_profile: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0]).toEqual({
      path: 'profile_data',
      type: 'string',
      value: 'object',
      from: 'endpoint-2',
      message: 'Invalid mapping: non_existent_field not found in source component Data Source'
    });
  });

  test('should skip consumed components that are not endpoints', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['db-1'],
        input: { user_id: 'string' },
        mappings: []
      },
      {
        id: 'db-1',
        name: 'Users Table',
        type: 'database_table',
        input: { user_id: 'string', user_data: 'object' }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should skip consumed components that do not exist', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['non-existent-component'],
        input: { user_id: 'string' },
        mappings: []
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should skip consumed components that have no input schema', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { user_id: 'string' },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint'
        // No input schema
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });

  test('should handle complex nested field structures', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { 
          user_id: 'string',
          profile: {
            personal: {
              name: 'string'
            }
          }
        },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { 
          user_id: 'string',
          profile: {
            personal: {
              name: 'string',
              age: 25
            }
          }
        }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0].path).toBe('profile.personal.age');
  });

  test('should handle array field structures with nested objects', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { 
          user_id: 'string',
          items: [{ id: 1, name: 'item1' }]
        },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Item Service',
        type: 'endpoint',
        input: { 
          user_id: 'string',
          items: [{ id: 1, name: 'item1', description: 'desc' }]
        }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0].path).toBe('items[:].description');
  });

  test('should handle fields with null values correctly', async () => {
    const components = [
      {
        id: 'endpoint-1',
        name: 'User Service',
        type: 'endpoint',
        consumes: ['endpoint-2'],
        input: { 
          user_id: 'string',
          optional_field: null
        },
        mappings: []
      },
      {
        id: 'endpoint-2',
        name: 'Profile Service',
        type: 'endpoint',
        input: { 
          user_id: 'string',
          optional_field: null
        }
      }
    ];

    mockGetComponents.mockResolvedValue(components);

    const result = await Component.checkComponentDependencies('endpoint-1');

    expect(result.hasMissingDependencies).toBe(true);
    expect(result.missingFields).toHaveLength(1);
    expect(result.missingFields[0]).toEqual({
      path: 'optional_field',
      type: 'object',
      value: null,
      from: 'endpoint-2',
      message: 'Field is present but empty'
    });
  });
});

describe('Component.getSchema', () => {
  test('should extract basic field types correctly', () => {
    const schema = {
      stringField: 'hello',
      numberField: 42,
      booleanField: true,
      nullField: null,
      undefinedField: undefined
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'stringField', type: 'string', value: 'hello' },
      { path: 'numberField', type: 'number', value: 42 },
      { path: 'booleanField', type: 'boolean', value: true },
      { path: 'nullField', type: 'object', value: null },
      { path: 'undefinedField', type: 'undefined', value: undefined }
    ]);
  });

  test('should handle nested objects correctly', () => {
    const schema = {
      user: {
        profile: {
          name: 'John',
          age: 30
        },
        settings: {
          theme: 'dark'
        }
      }
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'user.profile.name', type: 'string', value: 'John' },
      { path: 'user.profile.age', type: 'number', value: 30 },
      { path: 'user.settings.theme', type: 'string', value: 'dark' }
    ]);
  });

  test('should handle empty objects', () => {
    const schema = {
      emptyObject: {},
      normalField: 'value'
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'normalField', type: 'string', value: 'value' }
    ]);
  });

  test('should handle arrays with primitive values', () => {
    const schema = {
      numbers: [1, 2, 3],
      strings: ['a', 'b', 'c'],
      mixed: [1, 'hello', true]
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'numbers', type: 'array', value: '[3 items]' },
      { path: 'strings', type: 'array', value: '[3 items]' },
      { path: 'mixed', type: 'array', value: '[3 items]' }
    ]);
  });

  test('should handle arrays with object elements', () => {
    const schema = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ]
    };

    const result = Component.getSchema(schema);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ path: 'users[:].id', type: 'number', value: expect.any(Number) });
    expect(result).toContainEqual({ path: 'users[:].name', type: 'string', value: expect.any(String) });
    expect(result).toContainEqual({ path: 'users[:].email', type: 'string', value: 'bob@example.com' });
  });

  test('should handle empty arrays', () => {
    const schema = {
      emptyArray: [],
      normalField: 'value'
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'emptyArray', type: 'array', value: '[0 items]' },
      { path: 'normalField', type: 'string', value: 'value' }
    ]);
  });

  test('should handle arrays with nested objects', () => {
    const schema = {
      items: [
        {
          product: {
            name: 'Product A',
            price: 100
          },
          quantity: 2
        },
        {
          product: {
            name: 'Product B',
            category: 'Electronics'
          }
        }
      ]
    };

    const result = Component.getSchema(schema);

    expect(result).toHaveLength(4);
    expect(result).toContainEqual({ path: 'items[:].product.name', type: 'string', value: expect.any(String) });
    expect(result).toContainEqual({ path: 'items[:].product.price', type: 'number', value: 100 });
    expect(result).toContainEqual({ path: 'items[:].quantity', type: 'number', value: 2 });
    expect(result).toContainEqual({ path: 'items[:].product.category', type: 'string', value: 'Electronics' });
  });

  test('should truncate long string values', () => {
    const longString = 'a'.repeat(100);
    const schema = {
      shortString: 'short',
      longString: longString
    };

    const result = Component.getSchema(schema);

    expect(result).toEqual([
      { path: 'shortString', type: 'string', value: 'short' },
      { path: 'longString', type: 'string', value: longString.substring(0, 50) + '...' }
    ]);
  });

  test('should handle null and undefined schema input', () => {
    expect(Component.getSchema(null)).toEqual([]);
    expect(Component.getSchema(undefined)).toEqual([]);
  });

  test('should handle prefix parameter correctly', () => {
    const schema = {
      name: 'John',
      age: 30
    };

    const result = Component.getSchema(schema, 'user');

    expect(result).toEqual([
      { path: 'user.name', type: 'string', value: 'John' },
      { path: 'user.age', type: 'number', value: 30 }
    ]);
  });

  test('should deduplicate fields from array elements', () => {
    const schema = {
      items: [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
        { id: 3, name: 'Third', description: 'Extra field' }
      ]
    };

    const result = Component.getSchema(schema);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ path: 'items[:].id', type: 'number', value: expect.any(Number) });
    expect(result).toContainEqual({ path: 'items[:].name', type: 'string', value: expect.any(String) });
    expect(result).toContainEqual({ path: 'items[:].description', type: 'string', value: 'Extra field' });
  });

  test('should handle complex mixed data structures', () => {
    const schema = {
      metadata: {
        version: '1.0',
        tags: ['production', 'api']
      },
      data: [
        {
          id: 'user1',
          profile: {
            personal: { name: 'Alice', age: 28 },
            preferences: { theme: 'dark', notifications: true }
          },
          roles: ['admin', 'user']
        }
      ],
      config: {
        timeout: 5000,
        retries: 3
      }
    };

    const result = Component.getSchema(schema);

    expect(result).toContainEqual({ path: 'metadata.version', type: 'string', value: '1.0' });
    expect(result).toContainEqual({ path: 'metadata.tags', type: 'array', value: '[2 items]' });
    expect(result).toContainEqual({ path: 'data[:].id', type: 'string', value: 'user1' });
    expect(result).toContainEqual({ path: 'data[:].profile.personal.name', type: 'string', value: 'Alice' });
    expect(result).toContainEqual({ path: 'data[:].profile.personal.age', type: 'number', value: 28 });
    expect(result).toContainEqual({ path: 'data[:].profile.preferences.theme', type: 'string', value: 'dark' });
    expect(result).toContainEqual({ path: 'data[:].profile.preferences.notifications', type: 'boolean', value: true });
    expect(result).toContainEqual({ path: 'data[:].roles', type: 'array', value: '[2 items]' });
    expect(result).toContainEqual({ path: 'config.timeout', type: 'number', value: 5000 });
    expect(result).toContainEqual({ path: 'config.retries', type: 'number', value: 3 });
  });

  test('should handle arrays with mixed object structures', () => {
    const schema = {
      notifications: [
        { type: 'email', address: 'user@example.com' },
        { type: 'sms', phone: '+1234567890', verified: true },
        { type: 'push', deviceId: 'abc123' }
      ]
    };

    const result = Component.getSchema(schema);

    expect(result).toHaveLength(5);
    expect(result).toContainEqual({ path: 'notifications[:].type', type: 'string', value: expect.any(String) });
    expect(result).toContainEqual({ path: 'notifications[:].address', type: 'string', value: 'user@example.com' });
    expect(result).toContainEqual({ path: 'notifications[:].phone', type: 'string', value: '+1234567890' });
    expect(result).toContainEqual({ path: 'notifications[:].verified', type: 'boolean', value: true });
    expect(result).toContainEqual({ path: 'notifications[:].deviceId', type: 'string', value: 'abc123' });
  });
});

describe('Component Constructor', () => {
  test('should create instance with provided data', () => {
    const data = {
      name: 'Test Component',
      type: 'endpoint',
      input: { field1: 'value1' }
    };
    
    const component = new Component(data);
    
    expect(component.name).toBe('Test Component');
    expect(component.type).toBe('endpoint');
    expect(component.input).toEqual({ field1: 'value1' });
    expect(component.id).toBeDefined();
  });

  test('should apply defaults when creating instance', () => {
    const component = new Component({ name: 'Test', type: 'endpoint' });
    
    expect(component.input).toEqual({});
    expect(component.output).toEqual({});
    expect(component.consumes).toEqual([]);
    expect(component.mappings).toEqual([]);
  });

  test('should generate ID when not provided', () => {
    const component = new Component({ name: 'Test', type: 'endpoint' });
    
    expect(component.id).toBeDefined();
    expect(typeof component.id).toBe('string');
  });

  test('should not generate ID when skipIdGeneration is true', () => {
    const component = new Component({ 
      name: 'Test', 
      type: 'endpoint',
      skipIdGeneration: true 
    });
    
    expect(component.id).toBeUndefined();
  });

  test('should throw error for invalid data', () => {
    expect(() => {
      new Component({});
    }).toThrow('Component validation failed');
  });
});

describe('Component.create', () => {
  test('should create component with defaults and ID', () => {
    const component = Component.create({
      name: 'Test Component',
      type: 'endpoint'
    });
    
    expect(component.name).toBe('Test Component');
    expect(component.type).toBe('endpoint');
    expect(component.id).toBeDefined();
    expect(component.input).toEqual({});
    expect(component.output).toEqual({});
    expect(component.consumes).toEqual([]);
    expect(component.mappings).toEqual([]);
  });

  test('should create component without ID when generateId is false', () => {
    const component = Component.create({
      name: 'Test Component',
      type: 'endpoint'
    }, false);
    
    expect(component.name).toBe('Test Component');
    expect(component.type).toBe('endpoint');
    expect(component.id).toBeUndefined();
  });

  test('should validate component data', () => {
    expect(() => {
      Component.create({});
    }).toThrow('Component validation failed');
  });
});

describe('Component.update', () => {
  test('should update existing component', () => {
    const existing = {
      id: '123',
      name: 'Original',
      type: 'endpoint',
      input: {}
    };
    
    const updated = Component.update(existing, {
      name: 'Updated',
      input: { field1: 'value1' }
    });
    
    expect(updated.id).toBe('123');
    expect(updated.name).toBe('Updated');
    expect(updated.type).toBe('endpoint');
    expect(updated.input).toEqual({ field1: 'value1' });
  });

  test('should validate updated component', () => {
    const existing = {
      id: '123',
      name: 'Original',
      type: 'endpoint'
    };
    
    expect(() => {
      Component.update(existing, { name: '' });
    }).toThrow('Component validation failed');
  });
});

describe('Component.clone', () => {
  test('should clone component with new ID and name', () => {
    const source = {
      id: '123',
      name: 'Original',
      type: 'endpoint',
      input: { field1: 'value1' }
    };
    
    const cloned = Component.clone(source);
    
    expect(cloned.id).toBeDefined();
    expect(cloned.id).not.toBe(source.id);
    expect(cloned.name).toBe('Copy of Original');
    expect(cloned.type).toBe('endpoint');
    expect(cloned.input).toEqual({ field1: 'value1' });
  });

  test('should clone component with custom name prefix', () => {
    const source = {
      id: '123',
      name: 'Original',
      type: 'endpoint'
    };
    
    const cloned = Component.clone(source, 'Duplicate ');
    
    expect(cloned.name).toBe('Duplicate Original');
  });
});

describe('Component.applyDefaults', () => {
  test('should apply default values for missing fields', () => {
    const data = {
      name: 'Test',
      type: 'endpoint'
    };
    
    const result = Component.applyDefaults(data);
    
    expect(result.name).toBe('Test');
    expect(result.type).toBe('endpoint');
    expect(result.input).toEqual({});
    expect(result.output).toEqual({});
    expect(result.consumes).toEqual([]);
    expect(result.mappings).toEqual([]);
  });

  test('should not override existing values', () => {
    const data = {
      name: 'Test',
      type: 'endpoint',
      input: { field1: 'value1' },
      consumes: ['comp1']
    };
    
    const result = Component.applyDefaults(data);
    
    expect(result.input).toEqual({ field1: 'value1' });
    expect(result.consumes).toEqual(['comp1']);
  });

  test('should handle deep copy of default objects', () => {
    const data = {
      name: 'Test',
      type: 'endpoint'
    };
    
    const result1 = Component.applyDefaults(data);
    const result2 = Component.applyDefaults(data);
    
    expect(result1.input).not.toBe(result2.input);
    expect(result1.consumes).not.toBe(result2.consumes);
  });
});

describe('Component.validate', () => {
  test('should pass validation for valid component', () => {
    const component = {
      name: 'Test',
      type: 'endpoint',
      input: {},
      output: {},
      consumes: ['comp1'],
      mappings: []
    };
    
    expect(() => {
      Component.validate(component);
    }).not.toThrow();
  });

  test('should fail validation for missing required field', () => {
    const component = {
      type: 'endpoint'
    };
    
    expect(() => {
      Component.validate(component);
    }).toThrow("Field 'name' is required");
  });

  test('should fail validation for invalid type', () => {
    const component = {
      name: 'Test',
      type: 'invalid_type'
    };
    
    expect(() => {
      Component.validate(component);
    }).toThrow("Field 'type' must be one of: endpoint, database_table");
  });

  test('should fail validation for wrong data type', () => {
    const component = {
      name: 123,
      type: 'endpoint'
    };
    
    expect(() => {
      Component.validate(component);
    }).toThrow("Field 'name' must be of type string");
  });

  test('should fail validation for string too short', () => {
    const component = {
      name: '',
      type: 'endpoint'
    };
    
    expect(() => {
      Component.validate(component);
    }).toThrow("Field 'name' is required");
  });

  test('should fail validation for invalid array items', () => {
    const component = {
      name: 'Test',
      type: 'endpoint',
      consumes: [123, 'valid']
    };
    
    expect(() => {
      Component.validate(component);
    }).toThrow("Field 'consumes[0]' must be of type string");
  });

  test('should skip validation for undefined optional fields', () => {
    const component = {
      name: 'Test',
      type: 'endpoint'
    };
    
    expect(() => {
      Component.validate(component);
    }).not.toThrow();
  });
});

describe('Component.validateType', () => {
  test('should validate string type', () => {
    expect(Component.validateType('test', 'string')).toBe(true);
    expect(Component.validateType(123, 'string')).toBe(false);
  });

  test('should validate object type', () => {
    expect(Component.validateType({}, 'object')).toBe(true);
    expect(Component.validateType([], 'object')).toBe(false);
    expect(Component.validateType(null, 'object')).toBe(false);
  });

  test('should validate array type', () => {
    expect(Component.validateType([], 'array')).toBe(true);
    expect(Component.validateType({}, 'array')).toBe(false);
  });

  test('should validate boolean type', () => {
    expect(Component.validateType(true, 'boolean')).toBe(true);
    expect(Component.validateType('true', 'boolean')).toBe(false);
  });

  test('should validate number type', () => {
    expect(Component.validateType(123, 'number')).toBe(true);
    expect(Component.validateType('123', 'number')).toBe(false);
  });

  test('should return true for unknown types', () => {
    expect(Component.validateType('test', 'unknown')).toBe(true);
  });
});

describe('Component.generateId', () => {
  test('should generate a valid UUID-like string', () => {
    const id = Component.generateId();
    
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('should generate different IDs on each call', () => {
    const id1 = Component.generateId();
    const id2 = Component.generateId();
    
    expect(id1).not.toBe(id2);
  });
});

describe('Component.generateRandomColor', () => {
  test('should generate a valid hex color', () => {
    const color = Component.generateRandomColor();
    
    expect(typeof color).toBe('string');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('should generate from predefined color palette', () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];
    
    const color = Component.generateRandomColor();
    
    expect(colors).toContain(color);
  });
});

describe('Component.validateMappings', () => {
  test('should return no errors for valid mappings', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        consumes: ['comp2'],
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1' }
          ]
        }
      },
      {
        id: 'comp2',
        name: 'Component 2'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toEqual([]);
  });

  test('should detect invalid target component ID', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'non-existent': [
            { target_field: 'field1', source_field: 'field1' }
          ]
        }
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('Invalid target component ID');
  });

  test('should detect target component not in consumes array', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        consumes: ['comp3'],
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1' }
          ]
        }
      },
      {
        id: 'comp2',
        name: 'Component 2'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('not in consumes array');
  });

  test('should detect invalid mapping structure', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { target_field: 'field1' }
          ]
        }
      },
      {
        id: 'comp2',
        name: 'Component 2'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('must have both target_field and source_field');
  });

  test('should detect invalid source_component_id', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { 
              target_field: 'field1', 
              source_field: 'field1',
              source_component_id: 'non-existent'
            }
          ]
        }
      },
      {
        id: 'comp2',
        name: 'Component 2'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('Invalid source_component_id');
  });

  test('should skip components without mappings', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toEqual([]);
  });

  test('should skip non-array mappings', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': 'invalid'
        }
      },
      {
        id: 'comp2',
        name: 'Component 2'
      }
    ];
    
    const errors = Component.validateMappings(components);
    
    expect(errors).toEqual([]);
  });
});

describe('Component.cleanOrphanedMappings', () => {
  test('should remove mappings targeting deleted component', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1' }
          ],
          'comp3': [
            { target_field: 'field2', source_field: 'field2' }
          ]
        }
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp2');
    
    expect(updated[0].mappings).not.toHaveProperty('comp2');
    expect(updated[0].mappings).toHaveProperty('comp3');
  });

  test('should remove mappings with deleted component as source', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1', source_component_id: 'comp3' },
            { target_field: 'field2', source_field: 'field2' }
          ]
        }
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp3');
    
    expect(updated[0].mappings.comp2).toHaveLength(1);
    expect(updated[0].mappings.comp2[0].target_field).toBe('field2');
  });

  test('should remove empty mapping arrays', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1', source_component_id: 'comp3' }
          ]
        }
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp3');
    
    expect(updated[0].mappings).not.toHaveProperty('comp2');
  });

  test('should remove deleted component from consumes array', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        consumes: ['comp2', 'comp3'],
        mappings: {}
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp2');
    
    expect(updated[0].consumes).toEqual(['comp3']);
  });

  test('should handle components without mappings', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        consumes: ['comp2', 'comp3']
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp2');
    
    // When there are no mappings, the component is returned as-is
    expect(updated[0].consumes).toEqual(['comp2', 'comp3']);
    expect(updated[0].mappings).toBeUndefined();
  });

  test('should handle components without consumes array', () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        mappings: {
          'comp2': [
            { target_field: 'field1', source_field: 'field1' }
          ]
        }
      }
    ];
    
    const updated = Component.cleanOrphanedMappings(components, 'comp2');
    
    expect(updated[0].mappings).not.toHaveProperty('comp2');
  });
});

describe('Component.getFieldPaths', () => {
  test('should return field paths from schema', () => {
    const schema = {
      user: {
        name: 'John',
        profile: {
          age: 30
        }
      },
      items: [
        { id: 1, name: 'item1' }
      ]
    };
    
    const paths = Component.getFieldPaths(schema);
    
    expect(paths).toContain('user.name');
    expect(paths).toContain('user.profile.age');
    expect(paths).toContain('items[:].id');
    expect(paths).toContain('items[:].name');
  });

  test('should return empty array for null schema', () => {
    const paths = Component.getFieldPaths(null);
    
    expect(paths).toEqual([]);
  });
});

describe('Component.isFieldAvailableInConsumedComponents', () => {
  test('should return true when field is available in consumed component', () => {
    const allComponents = [
      {
        id: 'comp1',
        input: { field1: 'value1' }
      },
      {
        id: 'comp2',
        input: { field2: 'value2' }
      }
    ];
    
    const result = Component.isFieldAvailableInConsumedComponents(
      'field1', 
      'comp2', 
      ['comp1', 'comp2'], 
      allComponents
    );
    
    expect(result).toBe(true);
  });

  test('should return false when field is not available', () => {
    const allComponents = [
      {
        id: 'comp1',
        input: { field1: 'value1' }
      }
    ];
    
    const result = Component.isFieldAvailableInConsumedComponents(
      'field2', 
      null, 
      ['comp1'], 
      allComponents
    );
    
    expect(result).toBe(false);
  });

  test('should exclude specified component from search', () => {
    const allComponents = [
      {
        id: 'comp1',
        input: { field1: 'value1' }
      },
      {
        id: 'comp2',
        input: { field1: 'value1' }
      }
    ];
    
    const result = Component.isFieldAvailableInConsumedComponents(
      'field1', 
      'comp1', 
      ['comp1', 'comp2'], 
      allComponents
    );
    
    expect(result).toBe(true);
  });

  test('should handle components without input', () => {
    const allComponents = [
      {
        id: 'comp1',
        name: 'Component 1'
      }
    ];
    
    const result = Component.isFieldAvailableInConsumedComponents(
      'field1', 
      null, 
      ['comp1'], 
      allComponents
    );
    
    expect(result).toBe(false);
  });
});

describe('Component.verifyFieldPresence', () => {
  test('should find existing field with value', () => {
    const fieldMapArray = [
      { path: 'field1', type: 'string', value: 'test' },
      { path: 'field2', type: 'number', value: 42 }
    ];
    
    const result = Component.verifyFieldPresence(fieldMapArray, 'field1');
    
    expect(result.found).toBe(true);
    expect(result.message).toBe(null);
  });

  test('should find field but mark as empty for null value', () => {
    const fieldMapArray = [
      { path: 'field1', type: 'object', value: null }
    ];
    
    const result = Component.verifyFieldPresence(fieldMapArray, 'field1');
    
    expect(result.found).toBe(false);
    expect(result.message).toBe('Field is present but empty');
  });

  test('should find field but mark as empty for undefined value', () => {
    const fieldMapArray = [
      { path: 'field1', type: 'undefined', value: undefined }
    ];
    
    const result = Component.verifyFieldPresence(fieldMapArray, 'field1');
    
    expect(result.found).toBe(false);
    expect(result.message).toBe('Field is present but empty');
  });

  test('should not find non-existent field', () => {
    const fieldMapArray = [
      { path: 'field1', type: 'string', value: 'test' }
    ];
    
    const result = Component.verifyFieldPresence(fieldMapArray, 'field2');
    
    expect(result.found).toBe(false);
    expect(result.message).toBe(null);
  });
});

describe('Component.check', () => {
  beforeEach(() => {
    mockGetComponents.mockClear();
  });

  test('should be an alias for checkComponentDependencies', async () => {
    const components = [
      {
        id: 'comp1',
        name: 'Component 1',
        type: 'database_table'
      }
    ];
    
    mockGetComponents.mockResolvedValue(components);
    
    const result = await Component.check('comp1');
    
    expect(result).toEqual({
      hasMissingDependencies: false,
      missingFields: []
    });
  });
});

describe('Component static properties', () => {
  test('should have correct schema definition', () => {
    expect(Component.schema).toBeDefined();
    expect(Component.schema.id).toEqual({ type: 'string', required: false, generated: true });
    expect(Component.schema.name).toEqual({ type: 'string', required: true, minLength: 1 });
    expect(Component.schema.type).toEqual({ type: 'string', required: true, enum: ['endpoint', 'database_table'], default: 'endpoint' });
  });

  test('should have correct types enum', () => {
    expect(Component.types).toBeDefined();
    expect(Component.types.ENDPOINT).toBe('endpoint');
    expect(Component.types.DATABASE_TABLE).toBe('database_table');
  });
});

describe('Module export logic', () => {
  test('should be available as Node.js module', () => {
    expect(typeof Component).toBe('function');
    expect(Component.name).toBe('Component');
  });

  test('should have static methods available', () => {
    expect(typeof Component.create).toBe('function');
    expect(typeof Component.validate).toBe('function');
    expect(typeof Component.generateId).toBe('function');
    expect(typeof Component.getSchema).toBe('function');
  });
});