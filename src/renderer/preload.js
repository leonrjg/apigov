/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

contextBridge.exposeInMainWorld('api', {
  getComponents: () => ipcRenderer.invoke('get-components'),
  getComponent: (id) => ipcRenderer.invoke('get-component', id),
  getComponentByName: (name) => ipcRenderer.invoke('get-component', null, name),
  addComponent: (component) => ipcRenderer.invoke('add-component', component),
  updateComponent: (component) => ipcRenderer.invoke('update-component', component),
  deleteComponent: (id) => ipcRenderer.invoke('delete-component', id),
  cloneComponent: (id) => ipcRenderer.invoke('clone-component', id),
  validateDatabase: () => ipcRenderer.invoke('validate-database'),
  saveDatabase: (data) => ipcRenderer.invoke('save-database', data),
  getDatabase: () => ipcRenderer.invoke('get-database'),
})

