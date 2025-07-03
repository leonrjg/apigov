/**
 * Pure data model representing a component diagram
 * Independent of any specific rendering technology
 */
class DiagramModel {
  constructor(components = []) {
    this.components = components;
    this.nodes = [];
    this.connections = [];
    this.layout = null;
    this.metadata = {
      title: "Component Diagram",
      source: "APIGov",
      created: new Date().toISOString()
    };
    
    this.processComponents();
  }

  /**
   * Processes raw component data into diagram model
   */
  processComponents() {
    this.nodes = this.createNodes();
    this.connections = this.createConnections();
    this.layout = this.calculateLayout();
  }

  /**
   * Creates diagram nodes from components
   * @returns {Array<DiagramNode>} Array of diagram nodes
   */
  createNodes() {
    return this.components.map(component => new DiagramNode(component));
  }

  /**
   * Creates connections between nodes based on component relationships
   * @returns {Array<DiagramConnection>} Array of connections
   */
  createConnections() {
    const connections = [];
    
    // Find main component that consumes others
    const mainComponent = this.components.find(c => c.consumes && c.consumes.length > 0);
    if (!mainComponent) return connections;

    // Add initial trigger connection (external -> main)
    connections.push(new DiagramConnection({
      id: 'initial_trigger',
      sourceId: 'external',
      targetId: mainComponent.id,
      type: 'trigger',
      label: 'Initial Request'
    }));

    // Add connections from main to dependencies
    mainComponent.consumes.forEach((targetId, index) => {
      const targetComponent = this.components.find(c => c.id === targetId);
      if (targetComponent) {
        connections.push(new DiagramConnection({
          id: `${mainComponent.id}_to_${targetId}`,
          sourceId: mainComponent.id,
          targetId: targetId,
          type: 'dependency',
          label: `Depends on ${targetComponent.name}`,
          order: index
        }));
      }
    });

    return connections;
  }

  /**
   * Calculates layout positions for all nodes
   * @returns {DiagramLayout} Layout configuration
   */
  calculateLayout() {
    const mainComponent = this.components.find(c => c.consumes && c.consumes.length > 0);
    const dependencies = mainComponent ? 
      mainComponent.consumes.map(id => this.components.find(c => c.id === id)).filter(c => c) : [];
    
    const orderedComponents = mainComponent ? [mainComponent, ...dependencies] : this.components;
    
    const nodePositions = new Map();
    let currentX = 100;
    let detailX = 50;
    
    orderedComponents.forEach((component, index) => {
      const width = this.calculateNodeWidth(component.name);
      
      nodePositions.set(component.id, {
        x: currentX,
        y: 80,
        width: width,
        height: 60,
        detailX: detailX,
        detailY: 230 + index * 40,
        activation: this.getActivationConfig(component, index, orderedComponents.length)
      });
      
      currentX += width + 80;
      detailX += Math.max(200, width + 50);
    });

    return new DiagramLayout(nodePositions);
  }

  /**
   * Calculates optimal width for a node based on content
   * @param {string} name - Node name
   * @returns {number} Calculated width
   */
  calculateNodeWidth(name) {
    const baseWidth = Math.max(120, name.length * 8 + 40);
    return Math.ceil(baseWidth / 20) * 20;
  }

  /**
   * Gets activation configuration for sequence diagram
   * @param {Object} component - Component data
   * @param {number} index - Component index
   * @param {number} total - Total components
   * @returns {Object} Activation configuration
   */
  getActivationConfig(component, index, total) {
    if (index === 0) {
      return { y: 200, height: 500 };
    } else {
      const baseY = 300 + index * 80;
      const height = index === total - 1 ? 120 : (40 + index * 20);
      return { y: baseY, height };
    }
  }

  /**
   * Gets a node by component ID
   * @param {string} componentId - Component ID
   * @returns {DiagramNode|null} Found node or null
   */
  getNode(componentId) {
    return this.nodes.find(node => node.componentId === componentId) || null;
  }

  /**
   * Gets all connections for a specific node
   * @param {string} componentId - Component ID
   * @returns {Array<DiagramConnection>} Array of connections
   */
  getNodeConnections(componentId) {
    return this.connections.filter(conn => 
      conn.sourceId === componentId || conn.targetId === componentId
    );
  }

  /**
   * Exports model as generic object for serialization
   * @returns {Object} Serializable model data
   */
  toObject() {
    return {
      metadata: this.metadata,
      nodes: this.nodes.map(node => node.toObject()),
      connections: this.connections.map(conn => conn.toObject()),
      layout: this.layout ? this.layout.toObject() : null
    };
  }
}

/**
 * Represents a single node in the diagram
 */
class DiagramNode {
  constructor(component) {
    this.componentId = component.id;
    this.name = component.name;
    this.type = component.type;
    this.color = component.color;
    this.input = component.input;
    this.output = component.output;
    this.fields = this.extractDisplayFields(component);
  }

  /**
   * Extracts key fields for display
   * @param {Object} component - Component data
   * @returns {Array<string>} Display fields
   */
  extractDisplayFields(component) {
    const fields = [];
    
    if (component.input && typeof component.input === 'object') {
      const inputKeys = Object.keys(component.input);
      inputKeys.forEach(key => fields.push(key));
    }
    
    if (component.output && typeof component.output === 'object') {
      const outputKeys = Object.keys(component.output);
      outputKeys.forEach(key => fields.push(key));
    }
    
    return fields;
  }

  /**
   * Gets color scheme for the node
   * @returns {Object} Color configuration
   */
  getColorScheme() {
    const colorMap = {
      green: { fill: '#d5e8d4', stroke: '#82b366' },
      red: { fill: '#f8cecc', stroke: '#b85450' },
      blue: { fill: '#dae8fc', stroke: '#6c8ebf' },
      orange: { fill: '#fff2cc', stroke: '#d6b656' },
      endpoint: { fill: '#e1d5e7', stroke: '#9673a6' },
      database_table: { fill: '#f0f0f0', stroke: '#666666' }
    };
    
    const colorKey = this.color || this.type;
    return colorMap[colorKey] || { fill: '#f0f0f0', stroke: '#666666' };
  }

  /**
   * Exports node as generic object
   * @returns {Object} Serializable node data
   */
  toObject() {
    return {
      componentId: this.componentId,
      name: this.name,
      type: this.type,
      color: this.color,
      fields: this.fields,
      colorScheme: this.getColorScheme()
    };
  }
}

/**
 * Represents a connection between nodes
 */
class DiagramConnection {
  constructor({ id, sourceId, targetId, type, label, order = 0 }) {
    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type; // 'trigger', 'dependency', 'response'
    this.label = label;
    this.order = order;
  }

  /**
   * Exports connection as generic object
   * @returns {Object} Serializable connection data
   */
  toObject() {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      type: this.type,
      label: this.label,
      order: this.order
    };
  }
}

/**
 * Represents layout information for the diagram
 */
class DiagramLayout {
  constructor(nodePositions) {
    this.nodePositions = nodePositions; // Map<componentId, position>
  }

  /**
   * Gets position for a specific node
   * @param {string} componentId - Component ID
   * @returns {Object|null} Position data or null
   */
  getNodePosition(componentId) {
    return this.nodePositions.get(componentId) || null;
  }

  /**
   * Sets position for a node
   * @param {string} componentId - Component ID
   * @param {Object} position - Position data
   */
  setNodePosition(componentId, position) {
    this.nodePositions.set(componentId, position);
  }

  /**
   * Exports layout as generic object
   * @returns {Object} Serializable layout data
   */
  toObject() {
    const positions = {};
    this.nodePositions.forEach((position, componentId) => {
      positions[componentId] = position;
    });
    return { nodePositions: positions };
  }
}

// Register with module registry
(function() {
  'use strict';
  
  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('DiagramModel', DiagramModel);
    window.moduleRegistry.register('DiagramNode', DiagramNode);
    window.moduleRegistry.register('DiagramConnection', DiagramConnection);
    window.moduleRegistry.register('DiagramLayout', DiagramLayout);
  }
})();