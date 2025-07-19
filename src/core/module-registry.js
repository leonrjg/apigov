(function() {
  'use strict';

  class ModuleRegistry {
    constructor() {
      this.modules = new Map();
      this.dependencies = new Map();
      this.pendingModules = new Map();
    }
    
    register(name, module, deps = []) {
      if (this.modules.has(name)) {
        console.warn(`Module ${name} already registered, overwriting`);
      }
      
      this.modules.set(name, module);
      this.dependencies.set(name, deps);
      
      // Resolve any pending promises for this module
      if (this.pendingModules.has(name)) {
        const resolvers = this.pendingModules.get(name);
        resolvers.forEach(resolve => resolve(module));
        this.pendingModules.delete(name);
      }
    }
    
    get(name) {
      const module = this.modules.get(name);
      if (!module) {
        throw new Error(`Module '${name}' not found. Available modules: ${Array.from(this.modules.keys()).join(', ')}`);
      }
      return module;
    }
    
    waitFor(name) {
      return new Promise((resolve) => {
        // If module is already registered, resolve immediately
        if (this.modules.has(name)) {
          resolve(this.modules.get(name));
          return;
        }
        
        // Otherwise, add to pending list
        if (!this.pendingModules.has(name)) {
          this.pendingModules.set(name, []);
        }
        this.pendingModules.get(name).push(resolve);
      });
    }
    
    waitForMultiple(moduleNames) {
      const promises = moduleNames.map(name => this.waitFor(name));
      return Promise.all(promises);
    }
  }

  window.moduleRegistry = new ModuleRegistry();
  
  window.requireModule = function(name) {
    return window.moduleRegistry.get(name);
  };
  
  window.waitForModule = function(name) {
    return window.moduleRegistry.waitFor(name);
  };
  
  window.waitForModules = function(moduleNames) {
    return window.moduleRegistry.waitForMultiple(moduleNames);
  };

})();