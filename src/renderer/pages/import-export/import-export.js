document.addEventListener('DOMContentLoaded', () => {
  const jsonEditorContainer = document.getElementById('jsoneditor');
  const saveBtn = document.getElementById('save-btn');
  let editor;

  // Load database contents into editor
  const loadDatabaseContents = async () => {
    try {
      const components = await window.api.getComponents();
      const databaseContents = { components: components || [] };
      
      if (editor) {
        editor.set(databaseContents);
      }
    } catch (error) {
      console.error('Error loading database contents:', error);
      if (editor) {
        editor.set({ components: [] });
      }
    }
  };

  // Initialize JSON Editor
  if (jsonEditorContainer && window.JSONEditor) {
    editor = new JSONEditor(jsonEditorContainer, { 
      mode: 'code', 
      mainMenuBar: false, 
      navigationBar: false
    });
    
    // Load current database contents after editor is initialized
    loadDatabaseContents();
  } else {
    console.error('JSONEditor not available');
  }

  // Save button handler
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      try {
        if (!editor) {
          alert('Editor not initialized');
          return;
        }

        const data = editor.get();
        
        // Validate the data structure
        if (!data || !Array.isArray(data.components)) {
          alert('Invalid data format. Expected: { "components": [...] }');
          return;
        }

        // Get existing components to determine which ones to delete
        const existingComponents = await window.api.getComponents();
        const existingIds = new Set(existingComponents.map(comp => comp.id));
        const newIds = new Set(data.components.map(comp => comp.id).filter(id => id));

        // Delete components that are no longer in the new data
        for (const existingId of existingIds) {
          if (!newIds.has(existingId)) {
            await window.api.deleteComponent(existingId);
          }
        }

        // Add or update components from the imported data
        for (const component of data.components) {
          if (component.id && existingIds.has(component.id)) {
            // Update existing component
            await window.api.updateComponent(component);
          } else {
            // Add new component (remove id to let the system generate a new one)
            const newComponent = { ...component };
            delete newComponent.id;
            await window.api.addComponent(newComponent);
          }
        }

        alert('Database imported successfully!');
        
        // Reload the current contents to reflect the changes
        await loadDatabaseContents();
        
      } catch (error) {
        console.error('Error saving database:', error);
        alert('Error saving database. Please check the JSON format and try again.');
      }
    });
  }
});