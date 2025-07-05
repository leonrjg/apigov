document.addEventListener('htmx:afterSettle', async (event) => {
  // Only initialize if this is the import-export content being loaded
  if (!event.detail.target.querySelector('#import-export-content')) return;

  const EditorClass = window.requireModule('JsonEditorUtils');
  let editor = Editor.initializeEditor('jsoneditor-import');

  // Load database contents into editor
  const loadDatabaseContents = async () => {
    try {
      const databaseContents = await window.api.getDatabase();
      EditorClass.setEditorData(editor, databaseContents);
    } catch (error) {
      console.error('Error loading database contents:', error);
      if (editor) {
        EditorClass.setEditorData(editor, { components: [] });
      }
    }
  };

  await loadDatabaseContents();

  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    try {
      if (!editor) {
        alert('Editor not initialized');
        return;
      }

      const data = Editor.getEditorData(editor);

      await window.api.validateDatabase();

      await window.api.saveDatabase(data);

      alert('Database imported successfully!');

      // Reload the current contents to reflect the changes
      await loadDatabaseContents();

    } catch (error) {
      console.error('Error saving database:', error);
      alert('Error saving database. Please check the JSON format and try again.');
    }
  });

});