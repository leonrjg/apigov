class FieldOperations {
  constructor(fieldsTableBody, dataManager) {
    this.fieldsTableBody = fieldsTableBody;
    this.dataManager = dataManager;
    
    // Get dependencies from module system
    this.DependencyUtils = window.requireModule('DependencyUtils');
  }

  updateFieldsTable(jsonData) {
    if (!jsonData || typeof jsonData !== 'object' || Object.keys(jsonData).length === 0) {
      this.fieldsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 italic">No fields defined</td></tr>';
      return;
    }

    const fields = this.DependencyUtils.flattenObject(jsonData);
    if (fields.length === 0) {
      this.fieldsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 italic">No fields defined</td></tr>';
      return;
    }

    this.fieldsTableBody.innerHTML = fields.map((field, index) => `
      <tr>
        <td class="font-mono text-sm">
          <input type="text" value="${field.path}" 
                 class="input input-xs input-bordered w-full field-path-input"
                 style="width:100%"
                 data-original-path="${field.path}" 
                 data-field-index="${index}">
        </td>
        <td><span class="badge badge-outline badge-sm">${field.type}</span></td>
        <td class="font-mono text-sm max-w-xs break-words">${field.value}</td>
        <td>
          <button type="button" class="btn btn-xs btn-error delete-field-btn" data-field-path="${field.path}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
    
    this.attachEventListeners();
  }

  attachEventListeners() {
    const pathInputs = this.fieldsTableBody.querySelectorAll('.field-path-input');
    pathInputs.forEach(input => {
      input.addEventListener('blur', (e) => this.handlePathChange(e));
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') e.target.blur();
      });
    });

    const deleteButtons = this.fieldsTableBody.querySelectorAll('.delete-field-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleDeleteField(e));
    });
  }

  handlePathChange(event) {
    const input = event.target;
    const originalPath = input.dataset.originalPath;
    const newPath = input.value.trim();
    
    if (newPath === originalPath || !newPath) return;
    
    try {
      const currentData = this.dataManager.getCurrentData();
      const updatedData = this.updateObjectPath(currentData, originalPath, newPath);
      
      this.dataManager.updateCurrentComponentData(updatedData);
      this.dataManager.editor.set(updatedData);
      this.updateFieldsTable(updatedData);
    } catch (e) {
      console.error('Error updating path:', e);
      input.value = originalPath;
    }
  }

  handleDeleteField(event) {
    event.stopPropagation();
    event.preventDefault();

    const fieldPath = event.target.closest('.delete-field-btn').dataset.fieldPath;
    if (!fieldPath) return;

    try {
      const currentData = this.dataManager.getCurrentData();
      this.deleteObjectPath(currentData, fieldPath);

      this.dataManager.updateCurrentComponentData(currentData);
      this.dataManager.editor.set(currentData);
      this.updateFieldsTable(currentData);

    } catch (e) {
      console.error('Error deleting field:', e);
      alert('Error deleting field.');
    }
  }

  handleAddField() {
    try {
      const currentData = this.dataManager.getCurrentData();
      
      let uniquePath = 'field1';
      let counter = 1;
      while (currentData.hasOwnProperty(uniquePath)) {
        counter++;
        uniquePath = `field${counter}`;
      }
      
      this.setObjectPath(currentData, uniquePath, '');
      
      this.dataManager.updateCurrentComponentData(currentData);
      this.dataManager.editor.set(currentData);
      this.updateFieldsTable(currentData);
    } catch (e) {
      console.error('Error adding field:', e);
      alert('Error adding field.');
    }
  }

  updateObjectPath(obj, oldPath, newPath) {
    const clone = JSON.parse(JSON.stringify(obj));
    const oldKeys = oldPath.split('.');
    
    let value = clone;
    for (const key of oldKeys) {
      value = value[key];
    }
    
    this.deleteObjectPath(clone, oldPath);
    this.setObjectPath(clone, newPath, value);
    
    return clone;
  }

  deleteObjectPath(obj, path) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      current = current[key];
    }
    
    delete current[lastKey];
  }

  setObjectPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
  }
}

// Register with module system
(function() {
  'use strict';

  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('FieldOperations', FieldOperations, ['DependencyUtils']);
  } else {
    // Fallback for backwards compatibility
    window.FieldOperations = FieldOperations;
  }
})();