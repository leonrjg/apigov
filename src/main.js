// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, globalShortcut, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const Component = require('./models/component');

const dbPath = path.join(app.getPath('userData'), 'database.json');

let currentDatabaseContents;

// Helper function to read from database.json
const readDatabase = () => {
  try {
    if (!currentDatabaseContents) currentDatabaseContents = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(currentDatabaseContents);
  } catch (error) {
    console.error('Error reading database:', error);
    return { components: [] };
  }
};

// Helper function to write to database.json
const writeDatabase = (data) => {
  try {
    const databaseString = JSON.stringify(data, null, 2);
    fs.writeFileSync(dbPath, databaseString, 'utf8');
    currentDatabaseContents = databaseString
  } catch (error) {
    console.error('Error writing database:', error);
  }
};

ipcMain.handle('save-database', async (_, data) => {
    try {
        // Validate mappings integrity using centralized model
        const validationErrors = Component.validateMappings(data.components);
        if (validationErrors.length > 0) {
          console.warn('Validation errors found:', validationErrors);
          throw new Error('Database validation failed. See console for details.');
        }
        writeDatabase(data);
        return true;
    } catch (error) {
        console.error('Error saving database:', error.message);
        throw error;
    }
});

ipcMain.handle('get-components', async () => {
  const db = readDatabase();
  
  // Validate mappings integrity on read using centralized model
  const validationErrors = Component.validateMappings(db.components);
  if (validationErrors.length > 0) {
    console.warn('Database integrity issues found:', validationErrors);
  }
  
  return db.components;
});

ipcMain.handle('get-component', async (_, id, name) => {
    const db = readDatabase();
    const component = db.components.find(comp => comp.id === id || comp.name === name);

    if (!component) {
        throw new Error(`Component with values id=${id}, name=${name} not found`);
    }

    try {
        return new Component(component);
    } catch (error) {
        console.error('Error validating component:', error.message);
        throw error;
    }
});

ipcMain.handle('get-database', async () => {
  return readDatabase();
});

ipcMain.handle('validate-database', async () => {
  const db = readDatabase();
  const validationErrors = Component.validateMappings(db.components);
  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors
  };
});

ipcMain.handle('add-component', async (_, componentData) => {
  const db = readDatabase();
  if (!db.components || !Array.isArray(db.components)) {
    db.components = [];
  }
  
  try {
    // Create a new component using the constructor
    const component = new Component(componentData);
    
    // Add random color if not provided
    if (!component.color) {
      component.color = Component.generateRandomColor();
    }
    
    // Validate mappings before adding
    const tempComponents = [...db.components, component];
    const validationErrors = Component.validateMappings(tempComponents);
    if (validationErrors.length > 0) {
      console.warn('Validation errors when adding component:', validationErrors);
    }
    
    db.components.push(component);
    writeDatabase(db);
    return component;
  } catch (error) {
    console.error('Error creating component:', error.message);
    throw new Error(`Failed to create component: ${error.message}`);
  }
});

ipcMain.handle('update-component', async (_, updatedComponentData) => {
  const db = await readDatabase();
  const index = db.components.findIndex(comp => comp.id === updatedComponentData.id);
  
  if (index !== -1) {
    try {
      // Merge updates with existing component, preserving fields not in the update
      const existingComponent = db.components[index];
      const mergedComponent = { ...existingComponent, ...updatedComponentData };
      
      // Validate the merged component using the constructor
      db.components[index] = new Component(mergedComponent);
      
      // Validate mappings after update
      const validationErrors = Component.validateMappings(db.components);
      if (validationErrors.length > 0) {
        console.warn('Validation errors after component update:', validationErrors);
      }
      
      await writeDatabase(db);
      return true;
    } catch (error) {
      console.error('Error updating component:', error.message);
      throw new Error(`Failed to update component: ${error.message}`);
    }
  }
  return false;
});

ipcMain.handle('delete-component', async (_, id) => {
  const db = readDatabase();
  const initialLength = db.components.length;
  
  // Find the component to delete
  const componentToDelete = db.components.find(comp => comp.id === id);
  if (!componentToDelete) {
    return false;
  }
  
  // Remove the component from the database
  db.components = db.components.filter(comp => comp.id !== id);
  
  // Remove the deleted component ID from other components' consumes lists
  db.components.forEach(component => {
    if (component.consumes && component.consumes.includes(id)) {
      component.consumes = component.consumes.filter(consumedId => consumedId !== id);
    }
  });
  
  // Clean orphaned mappings that reference the deleted component using centralized model
  db.components = Component.cleanOrphanedMappings(db.components, id);
  
  writeDatabase(db);
  return db.components.length < initialLength;
});

ipcMain.handle('clone-component', async (_, id) => {
  const db = readDatabase();
  
  // Find the component to clone
  const originalComponent = db.components.find(comp => comp.id === id);
  if (!originalComponent) {
    return null;
  }
  
  try {
    // Create a clone using the centralized model
    const clonedComponent = Component.clone(originalComponent, '');
    clonedComponent.name = `${originalComponent.name} (Copy)`;
    
    // Add the cloned component to the database
    db.components.push(clonedComponent);
    writeDatabase(db);
    
    return clonedComponent;
  } catch (error) {
    console.error('Error cloning component:', error.message);
    throw new Error(`Failed to clone component: ${error.message}`);
  }
});

ipcMain.handle('find-in-page', async (event, searchTerm) => {
  const webContents = event.sender;
  if (searchTerm && searchTerm.trim()) {
    webContents.findInPage(searchTerm);
  }
});

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    backgroundColor: '#2e2c29',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer/preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('src/renderer/markup/index.html')

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Handle window closed - unregister shortcuts
  mainWindow.on('closed', () => {
    globalShortcut.unregisterAll()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
