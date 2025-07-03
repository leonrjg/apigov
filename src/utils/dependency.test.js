// dependency-utils.test.js - Comprehensive tests for dependency validation logic
const DependencyUtils = require('./dependency.js');

// Simple test framework
class TestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  run() {
        
    this.tests.forEach(({ name, testFn }) => {
      try {
        testFn();
                this.passed++;
      } catch (error) {
                        this.failed++;
      }
    });
    console.log()
        return this.failed === 0;
  }

  assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`${message}\n   Expected: true\n   Actual: ${condition}`);
    }
  }

  assertFalse(condition, message = '') {
    if (condition) {
      throw new Error(`${message}\n   Expected: false\n   Actual: ${condition}`);
    }
  }
}

const test = new TestFramework();

// Test Data
const testComponents = {
  simpleEndpoint: {
    id: 'endpoint-1',
    name: 'SimpleEndpoint',
    type: 'endpoint',
    input: { field1: 'value1', field2: 'value2' },
    output: {},
    consumes: [],
    mappings: []
  },
  
  dependentEndpoint: {
    id: 'endpoint-2',
    name: 'DependentEndpoint',
    type: 'endpoint',
    input: { myField: 'value' },
    output: {},
    consumes: ['endpoint-1'],
    mappings: []
  },
  
  wellMappedEndpoint: {
    id: 'endpoint-3',
    name: 'WellMappedEndpoint',
    type: 'endpoint',
    input: { localField: 'value' },
    output: {},
    consumes: ['endpoint-1'],
    mappings: [
      {
        target_component_id: 'endpoint-1',
        target_field: 'field1',
        source_field: 'localField'
      }
    ]
  },
  
  complexEndpoint: {
    id: 'endpoint-4',
    name: 'ComplexEndpoint',
    type: 'endpoint',
    input: { 
      user: { id: 1, profile: { name: 'test', settings: { theme: 'dark' } } },
      config: { timeout: 5000 }
    },
    output: {},
    consumes: [],
    mappings: []
  },
  
  databaseTable: {
    id: 'table-1',
    name: 'UserTable',
    type: 'database_table',
    input: { user_id: 1, name: 'test' },
    output: {},
    consumes: ['endpoint-1'],
    mappings: []
  }
};

// ============================================================================
// flattenObject Tests
// ============================================================================

test.test('flattenObject - simple object', () => {
  const input = { field1: 'value1', field2: 'value2' };
  const result = DependencyUtils.flattenObject(input);
  
  test.assertEqual(result.length, 2);
  test.assertTrue(result.some(f => f.path === 'field1' && f.value === 'value1'));
  test.assertTrue(result.some(f => f.path === 'field2' && f.value === 'value2'));
});

test.test('flattenObject - nested object', () => {
  const input = { user: { profile: { name: 'test' } } };
  const result = DependencyUtils.flattenObject(input);
  
  test.assertTrue(result.some(f => f.path === 'user' && f.type === 'object'));
  test.assertTrue(result.some(f => f.path === 'user.profile' && f.type === 'object'));
  test.assertTrue(result.some(f => f.path === 'user.profile.name' && f.value === 'test'));
});

test.test('flattenObject - array handling', () => {
  const input = { items: [1, 2, 3], tags: ['a', 'b'] };
  const result = DependencyUtils.flattenObject(input);
  
  test.assertTrue(result.some(f => f.path === 'items' && f.type === 'array'));
  test.assertTrue(result.some(f => f.path === 'tags' && f.type === 'array'));
});

test.test('flattenObject - null and undefined', () => {
  const input = { nullField: null, undefinedField: undefined };
  const result = DependencyUtils.flattenObject(input);
  
  test.assertTrue(result.some(f => f.path === 'nullField' && f.value === 'null'));
  test.assertTrue(result.some(f => f.path === 'undefinedField' && f.value === undefined));
});

test.test('flattenObject - empty object', () => {
  const result = DependencyUtils.flattenObject({});
  test.assertEqual(result.length, 0);
});

// ============================================================================
// getFieldPaths Tests
// ============================================================================

test.test('getFieldPaths - simple fields', () => {
  const input = { field1: 'value1', field2: 'value2' };
  const result = DependencyUtils.getFieldPaths(input);
  
  test.assertEqual(result.sort(), ['field1', 'field2']);
});

test.test('getFieldPaths - nested fields', () => {
  const input = { user: { profile: { name: 'test', age: 25 } }, config: { timeout: 5000 } };
  const result = DependencyUtils.getFieldPaths(input);
  
  test.assertEqual(result.sort(), ['config.timeout', 'user.profile.age', 'user.profile.name']);
});

test.test('getFieldPaths - excludes object paths', () => {
  const input = { user: { profile: { name: 'test' } } };
  const result = DependencyUtils.getFieldPaths(input);
  
  test.assertFalse(result.includes('user'), 'Should not include object paths');
  test.assertFalse(result.includes('user.profile'), 'Should not include object paths');
  test.assertTrue(result.includes('user.profile.name'), 'Should include leaf paths');
});

test.test('getFieldPaths - handles arrays', () => {
  const input = { items: [1, 2, 3], data: { list: ['a', 'b'] } };
  const result = DependencyUtils.getFieldPaths(input);
  
  test.assertTrue(result.includes('items'));
  test.assertTrue(result.includes('data.list'));
});

test.test('getFieldPaths - null input', () => {
  test.assertEqual(DependencyUtils.getFieldPaths(null), []);
  test.assertEqual(DependencyUtils.getFieldPaths(undefined), []);
  test.assertEqual(DependencyUtils.getFieldPaths('string'), []);
});

// ============================================================================
// isFieldAvailableInConsumedComponents Tests
// ============================================================================

test.test('isFieldAvailableInConsumedComponents - field found', () => {
  const allComponents = [testComponents.simpleEndpoint, testComponents.dependentEndpoint];
  const result = DependencyUtils.isFieldAvailableInConsumedComponents(
    'field1', 
    'endpoint-2', // exclude the dependent endpoint, not the source
    ['endpoint-1'], 
    allComponents
  );
  
  test.assertTrue(result, 'Should find field1 in consumed components');
});

test.test('isFieldAvailableInConsumedComponents - field not found', () => {
  const allComponents = [testComponents.simpleEndpoint, testComponents.dependentEndpoint];
  const result = DependencyUtils.isFieldAvailableInConsumedComponents(
    'nonexistent', 
    'endpoint-1', 
    ['endpoint-1'], 
    allComponents
  );
  
  test.assertFalse(result, 'Should not find nonexistent field');
});

test.test('isFieldAvailableInConsumedComponents - excludes self', () => {
  const allComponents = [testComponents.simpleEndpoint];
  const result = DependencyUtils.isFieldAvailableInConsumedComponents(
    'field1', 
    'endpoint-1', 
    ['endpoint-1'], 
    allComponents
  );
  
  test.assertFalse(result, 'Should exclude the component itself');
});

test.test('isFieldAvailableInConsumedComponents - multiple consumed components', () => {
  const allComponents = [testComponents.simpleEndpoint, testComponents.complexEndpoint];
  const result = DependencyUtils.isFieldAvailableInConsumedComponents(
    'config.timeout', 
    'endpoint-1', 
    ['endpoint-1', 'endpoint-4'], 
    allComponents
  );
  
  test.assertTrue(result, 'Should find field in one of multiple consumed components');
});

// ============================================================================
// checkComponentDependencies Tests - Core Functionality
// ============================================================================

test.test('checkComponentDependencies - no dependencies', () => {
  const result = DependencyUtils.checkComponentDependencies(
    testComponents.simpleEndpoint, 
    [testComponents.simpleEndpoint]
  );
  
  test.assertFalse(result.hasMissingDependencies);
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - database table ignored', () => {
  const result = DependencyUtils.checkComponentDependencies(
    testComponents.databaseTable, 
    [testComponents.simpleEndpoint, testComponents.databaseTable]
  );
  
  test.assertFalse(result.hasMissingDependencies, 'Database tables should be ignored');
});

test.test('checkComponentDependencies - missing dependencies', () => {
  const allComponents = [testComponents.simpleEndpoint, testComponents.dependentEndpoint];
  const result = DependencyUtils.checkComponentDependencies(
    testComponents.dependentEndpoint, 
    allComponents
  );
  
  test.assertTrue(result.hasMissingDependencies);
  test.assertTrue(result.missingFields.some(f => f.includes('field1')));
  test.assertTrue(result.missingFields.some(f => f.includes('field2')));
});

test.test('checkComponentDependencies - resolved by mapping', () => {
  const allComponents = [testComponents.simpleEndpoint, testComponents.wellMappedEndpoint];
  const result = DependencyUtils.checkComponentDependencies(
    testComponents.wellMappedEndpoint, 
    allComponents
  );
  
  test.assertTrue(result.hasMissingDependencies, 'field2 should still be missing');
  test.assertFalse(result.missingFields.some(f => f.includes('field1')), 'field1 should be resolved by mapping');
  test.assertTrue(result.missingFields.some(f => f.includes('field2')), 'field2 should still be missing');
});

test.test('checkComponentDependencies - CreateUpdateIntent scenario', () => {
  const createUpdateIntent = {
    id: 'create-update-intent',
    name: 'CreateUpdateIntent',
    type: 'endpoint',
    input: { insurance_purchase_key: '123', field1: '', field2: '' },
    output: {},
    consumes: ['get-purchase'],
    mappings: [
      {
        target_component_id: 'get-purchase',
        target_field: 'ipk',
        source_field: 'insurance_purchase_key'
      }
    ]
  };
  
  const getPurchase = {
    id: 'get-purchase',
    name: 'GetPurchase',
    type: 'endpoint',
    input: { ipk: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const result = DependencyUtils.checkComponentDependencies(
    createUpdateIntent, 
    [createUpdateIntent, getPurchase]
  );
  
  test.assertFalse(result.hasMissingDependencies, 'CreateUpdateIntent should have no missing dependencies');
  test.assertEqual(result.missingFields, []);
});

// ============================================================================
// Cross-Component Mapping (source_component_id) Tests
// ============================================================================

test.test('checkComponentDependencies - simple cross-component mapping', () => {
  // Component A provides data
  const componentA = {
    id: 'comp-a',
    name: 'ComponentA',
    type: 'endpoint',
    input: {},
    output: { shared_field: 'value' },
    consumes: [],
    mappings: []
  };
  
  // Component B needs a field
  const componentB = {
    id: 'comp-b',
    name: 'ComponentB', 
    type: 'endpoint',
    input: { required_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  // Component C consumes B but gets required_field from A via cross-component mapping
  const componentC = {
    id: 'comp-c',
    name: 'ComponentC',
    type: 'endpoint',
    input: { my_field: 'value' },
    output: {},
    consumes: ['comp-b'],
    mappings: [
      {
        target_component_id: 'comp-b',
        target_field: 'required_field',
        source_field: 'shared_field',
        source_component_id: 'comp-a'  // Field comes from component A, not C
      }
    ]
  };
  
  const allComponents = [componentA, componentB, componentC];
  const result = DependencyUtils.checkComponentDependencies(componentC, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Cross-component mapping should resolve dependency');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - cross-component mapping with nested fields', () => {
  const dataProvider = {
    id: 'data-provider',
    name: 'DataProvider',
    type: 'endpoint',
    input: {},
    output: { 
      user: { profile: { name: 'test', email: 'test@example.com' } },
      config: { api_key: 'key123' }
    },
    consumes: [],
    mappings: []
  };
  
  const serviceEndpoint = {
    id: 'service-endpoint',
    name: 'ServiceEndpoint',
    type: 'endpoint',
    input: { 
      'user.profile.email': '',
      'config.api_key': ''
    },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const orchestrator = {
    id: 'orchestrator',
    name: 'Orchestrator',
    type: 'endpoint',
    input: { request_id: '123' },
    output: {},
    consumes: ['service-endpoint'],
    mappings: [
      {
        target_component_id: 'service-endpoint',
        target_field: 'user.profile.email',
        source_field: 'user.profile.email',
        source_component_id: 'data-provider'
      },
      {
        target_component_id: 'service-endpoint',
        target_field: 'config.api_key',
        source_field: 'config.api_key',
        source_component_id: 'data-provider'
      }
    ]
  };
  
  const allComponents = [dataProvider, serviceEndpoint, orchestrator];
  const result = DependencyUtils.checkComponentDependencies(orchestrator, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Complex cross-component mapping should resolve all dependencies');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - missing source component for cross-component mapping', () => {
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'nonexistent_field',
        source_component_id: 'nonexistent-component'  // This component doesn't exist
      }
    ]
  };
  
  const allComponents = [targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  // Enhanced behavior: Now properly validates source_component_id existence
  test.assertTrue(result.hasMissingDependencies, 'Should detect missing dependencies when source component does not exist');
  test.assertTrue(result.missingFields.some(f => f.includes('needed_field')));
});

test.test('checkComponentDependencies - missing field in source component for cross-component mapping', () => {
  const sourceComponent = {
    id: 'source',
    name: 'Source',
    type: 'endpoint',
    input: {},
    output: { available_field: 'value' },  // doesn't have the field we're trying to map
    consumes: [],
    mappings: []
  };
  
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'missing_field',  // This field doesn't exist in source component
        source_component_id: 'source'
      }
    ]
  };
  
  const allComponents = [sourceComponent, targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  // Enhanced behavior: Now properly validates source field existence in source component
  test.assertTrue(result.hasMissingDependencies, 'Should detect missing dependencies when source field does not exist in source component');
  test.assertTrue(result.missingFields.some(f => f.includes('needed_field')));
});

test.test('checkComponentDependencies - mixed mappings with and without source_component_id', () => {
  const externalProvider = {
    id: 'external',
    name: 'ExternalProvider',
    type: 'endpoint',
    input: {},
    output: { external_data: 'value' },
    consumes: [],
    mappings: []
  };
  
  const serviceA = {
    id: 'service-a',
    name: 'ServiceA',
    type: 'endpoint',
    input: { 
      field1: '',      // Will be mapped from current component
      field2: ''       // Will be mapped from external component
    },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const orchestrator = {
    id: 'orchestrator',
    name: 'Orchestrator',
    type: 'endpoint',
    input: { local_data: 'value' },
    output: {},
    consumes: ['service-a'],
    mappings: [
      {
        target_component_id: 'service-a',
        target_field: 'field1',
        source_field: 'local_data'
        // No source_component_id - comes from current component
      },
      {
        target_component_id: 'service-a',
        target_field: 'field2',
        source_field: 'external_data',
        source_component_id: 'external'  // Comes from external component
      }
    ]
  };
  
  const allComponents = [externalProvider, serviceA, orchestrator];
  const result = DependencyUtils.checkComponentDependencies(orchestrator, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Mixed mappings should resolve all dependencies');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - database sample scenario', () => {
  // Replicate the exact scenario from database.sample.json
  const exchangeQuote = {
    id: 'f7b413c3-af64-4b72-9241-999a846d1145',
    name: 'ExchangeQuote',
    type: 'endpoint',
    input: { original_quote_id: '123' },
    output: { quote_id: '' },
    consumes: [],
    mappings: []
  };
  
  const getPurchase = {
    id: 'a87f73dc-42bf-464d-9508-5287363124df',
    name: 'GetPurchase',
    type: 'endpoint',
    input: { insurance_purchase_key: '' },
    output: { quote_id: '' },
    consumes: [],
    mappings: []
  };
  
  const createUpdateIntent = {
    id: '78c7df58-c92d-4e3e-b66b-55e62708f1fa',
    name: 'CreateUpdateIntent',
    type: 'endpoint',
    input: { id: 123 },
    output: {},
    consumes: ['f7b413c3-af64-4b72-9241-999a846d1145', 'a87f73dc-42bf-464d-9508-5287363124df'],
    mappings: [
      {
        target_component_id: 'f7b413c3-af64-4b72-9241-999a846d1145',
        target_field: 'original_quote_id',
        source_field: 'quote_id',
        source_component_id: 'a87f73dc-42bf-464d-9508-5287363124df'  // Cross-component mapping
      },
      {
        target_component_id: 'a87f73dc-42bf-464d-9508-5287363124df',
        target_field: 'insurance_purchase_key',
        source_field: 'id'
        // No source_component_id - comes from current component
      }
    ]
  };
  
  const allComponents = [exchangeQuote, getPurchase, createUpdateIntent];
  const result = DependencyUtils.checkComponentDependencies(createUpdateIntent, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Database sample scenario should have no missing dependencies');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - chain of cross-component mappings', () => {
  const sourceA = {
    id: 'source-a',
    name: 'SourceA',
    type: 'endpoint',
    input: {},
    output: { data_a: 'valueA' },
    consumes: [],
    mappings: []
  };
  
  const sourceB = {
    id: 'source-b',
    name: 'SourceB', 
    type: 'endpoint',
    input: {},
    output: { data_b: 'valueB' },
    consumes: [],
    mappings: []
  };
  
  const serviceX = {
    id: 'service-x',
    name: 'ServiceX',
    type: 'endpoint',
    input: { 
      field_a: '',
      field_b: ''
    },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const serviceY = {
    id: 'service-y',
    name: 'ServiceY',
    type: 'endpoint',
    input: { 
      field_x: ''
    },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['service-x', 'service-y'], 
    mappings: [
      // ServiceX gets data from external sources
      {
        target_component_id: 'service-x',
        target_field: 'field_a',
        source_field: 'data_a',
        source_component_id: 'source-a'
      },
      {
        target_component_id: 'service-x',
        target_field: 'field_b',
        source_field: 'data_b',
        source_component_id: 'source-b'
      },
      // ServiceY gets data from local field
      {
        target_component_id: 'service-y',
        target_field: 'field_x',
        source_field: 'local_field'
        // No source_component_id - comes from consumer itself
      }
    ]
  };
  
  const allComponents = [sourceA, sourceB, serviceX, serviceY, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Chain of cross-component mappings should resolve all dependencies');
  test.assertEqual(result.missingFields, []);
});

// ============================================================================
// Edge Cases and Complex Scenarios
// ============================================================================

test.test('checkComponentDependencies - complex nested fields', () => {
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { simpleField: 'value' },
    output: {},
    consumes: ['endpoint-4'],
    mappings: [
      {
        target_component_id: 'endpoint-4',
        target_field: 'user.id',
        source_field: 'simpleField'
      },
      {
        target_component_id: 'endpoint-4',
        target_field: 'user.profile.name',
        source_field: 'simpleField'
      },
      {
        target_component_id: 'endpoint-4',
        target_field: 'user.profile.settings.theme',
        source_field: 'simpleField'
      },
      {
        target_component_id: 'endpoint-4',
        target_field: 'config.timeout',
        source_field: 'simpleField'
      }
    ]
  };
  
  const allComponents = [testComponents.complexEndpoint, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'All nested fields should be resolved by mappings');
});

test.test('checkComponentDependencies - multiple mappings', () => {
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { localField1: 'value1', localField2: 'value2' },
    output: {},
    consumes: ['endpoint-1'],
    mappings: [
      {
        target_component_id: 'endpoint-1',
        target_field: 'field1',
        source_field: 'localField1'
      },
      {
        target_component_id: 'endpoint-1',
        target_field: 'field2',
        source_field: 'localField2'
      }
    ]
  };
  
  const allComponents = [testComponents.simpleEndpoint, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'All fields should be resolved by mappings');
});

test.test('checkComponentDependencies - partial mapping coverage', () => {
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { localField1: 'value1' },
    output: {},
    consumes: ['endpoint-1'],
    mappings: [
      {
        target_component_id: 'endpoint-1',
        target_field: 'field1',
        source_field: 'localField1'
      }
      // field2 not mapped
    ]
  };
  
  const allComponents = [testComponents.simpleEndpoint, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertTrue(result.hasMissingDependencies, 'Should have missing dependencies');
  test.assertTrue(result.missingFields.some(f => f.includes('field2')), 'field2 should be missing');
  test.assertFalse(result.missingFields.some(f => f.includes('field1')), 'field1 should not be missing');
});

test.test('checkComponentDependencies - circular dependencies', () => {
  const componentA = {
    id: 'comp-a',
    name: 'ComponentA',
    type: 'endpoint',
    input: { fieldA: 'value' },
    output: {},
    consumes: ['comp-b'],
    mappings: []
  };
  
  const componentB = {
    id: 'comp-b',
    name: 'ComponentB',
    type: 'endpoint',
    input: { fieldB: 'value' },
    output: {},
    consumes: ['comp-a'],
    mappings: []
  };
  
  const allComponents = [componentA, componentB];
  const resultA = DependencyUtils.checkComponentDependencies(componentA, allComponents);
  const resultB = DependencyUtils.checkComponentDependencies(componentB, allComponents);
  
  test.assertTrue(resultA.hasMissingDependencies, 'Component A should have missing dependencies');
  test.assertTrue(resultB.hasMissingDependencies, 'Component B should have missing dependencies');
});

test.test('checkComponentDependencies - null/undefined inputs', () => {
  test.assertFalse(DependencyUtils.checkComponentDependencies(null, []).hasMissingDependencies);
  test.assertFalse(DependencyUtils.checkComponentDependencies(undefined, []).hasMissingDependencies);
  test.assertFalse(DependencyUtils.checkComponentDependencies({}, []).hasMissingDependencies);
});

// ============================================================================
// Data Structure Validation
// ============================================================================

test.test('checkComponentDependencies - mappings as empty array', () => {
  const component = {
    ...testComponents.dependentEndpoint,
    mappings: []
  };
  
  const result = DependencyUtils.checkComponentDependencies(component, [testComponents.simpleEndpoint]);
  test.assertTrue(result.hasMissingDependencies, 'Empty mappings array should not resolve dependencies');
});

test.test('checkComponentDependencies - mappings as null/undefined', () => {
  const componentNull = { ...testComponents.dependentEndpoint, mappings: null };
  const componentUndefined = { ...testComponents.dependentEndpoint, mappings: undefined };
  
  const allComponents = [testComponents.simpleEndpoint];
  
  const resultNull = DependencyUtils.checkComponentDependencies(componentNull, allComponents);
  const resultUndefined = DependencyUtils.checkComponentDependencies(componentUndefined, allComponents);
  
  test.assertTrue(resultNull.hasMissingDependencies, 'Null mappings should not resolve dependencies');
  test.assertTrue(resultUndefined.hasMissingDependencies, 'Undefined mappings should not resolve dependencies');
});

// ============================================================================
// Additional Cross-Component Mapping Edge Cases
// ============================================================================

test.test('checkComponentDependencies - cross-component mapping with database table as source', () => {
  const databaseTable = {
    id: 'db-table',
    name: 'UserTable',
    type: 'database_table',
    input: {},
    output: { user_id: '123', username: 'testuser' },
    consumes: [],
    mappings: []
  };
  
  const serviceEndpoint = {
    id: 'service',
    name: 'UserService',
    type: 'endpoint',
    input: { user_id: '', name: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const orchestrator = {
    id: 'orchestrator',
    name: 'Orchestrator',
    type: 'endpoint',
    input: { request_id: '123' },
    output: {},
    consumes: ['service'],
    mappings: [
      {
        target_component_id: 'service',
        target_field: 'user_id',
        source_field: 'user_id',
        source_component_id: 'db-table'  // Source is database table
      },
      {
        target_component_id: 'service',
        target_field: 'name',
        source_field: 'username',
        source_component_id: 'db-table'
      }
    ]
  };
  
  const allComponents = [databaseTable, serviceEndpoint, orchestrator];
  const result = DependencyUtils.checkComponentDependencies(orchestrator, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Cross-component mapping from database table should work');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - malformed source_component_id', () => {
  const sourceComponent = {
    id: 'source',
    name: 'Source',
    type: 'endpoint',
    input: {},
    output: { data: 'value' },
    consumes: [],
    mappings: []
  };
  
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'data',
        source_component_id: null  // Malformed source_component_id
      }
    ]
  };
  
  const allComponents = [sourceComponent, targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  // Enhanced behavior: Null source_component_id is treated as same-component mapping
  // but the field 'data' doesn't exist in consumer component, so dependency fails
  test.assertTrue(result.hasMissingDependencies, 'Should detect missing dependencies when source_component_id is null and field not in current component');
  test.assertTrue(result.missingFields.some(f => f.includes('needed_field')));
});

test.test('checkComponentDependencies - valid cross-component mapping from input field', () => {
  const sourceComponent = {
    id: 'source',
    name: 'Source',
    type: 'endpoint',
    input: { source_input_field: 'value' },  // Field in input
    output: {},
    consumes: [],
    mappings: []
  };
  
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'source_input_field',  // Maps from source's input field
        source_component_id: 'source'
      }
    ]
  };
  
  const allComponents = [sourceComponent, targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Valid cross-component mapping from input field should resolve dependency');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - valid cross-component mapping from output field', () => {
  const sourceComponent = {
    id: 'source',
    name: 'Source',
    type: 'endpoint',
    input: {},
    output: { source_output_field: 'value' },  // Field in output
    consumes: [],
    mappings: []
  };
  
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'source_output_field',  // Maps from source's output field
        source_component_id: 'source'
      }
    ]
  };
  
  const allComponents = [sourceComponent, targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  test.assertFalse(result.hasMissingDependencies, 'Valid cross-component mapping from output field should resolve dependency');
  test.assertEqual(result.missingFields, []);
});

test.test('checkComponentDependencies - empty string source_component_id', () => {
  const sourceComponent = {
    id: 'source',
    name: 'Source',
    type: 'endpoint',
    input: {},
    output: { data: 'value' },
    consumes: [],
    mappings: []
  };
  
  const targetComponent = {
    id: 'target',
    name: 'Target',
    type: 'endpoint',
    input: { needed_field: '' },
    output: {},
    consumes: [],
    mappings: []
  };
  
  const consumer = {
    id: 'consumer',
    name: 'Consumer',
    type: 'endpoint',
    input: { local_field: 'value' },
    output: {},
    consumes: ['target'],
    mappings: [
      {
        target_component_id: 'target',
        target_field: 'needed_field',
        source_field: 'data',
        source_component_id: ''  // Empty source_component_id
      }
    ]
  };
  
  const allComponents = [sourceComponent, targetComponent, consumer];
  const result = DependencyUtils.checkComponentDependencies(consumer, allComponents);
  
  // Enhanced behavior: Empty string source_component_id cannot find a component
  // so this is treated as an invalid cross-component mapping
  test.assertTrue(result.hasMissingDependencies, 'Should detect missing dependencies when source_component_id is empty string');
  test.assertTrue(result.missingFields.some(f => f.includes('needed_field')));
});

// Run all tests
if (require.main === module) {
  const success = test.run();
  process.exit(success ? 0 : 1);
}

module.exports = { TestFramework, testComponents };