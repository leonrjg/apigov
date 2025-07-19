/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

// Use event delegation since componentsList may not exist at load time
document.addEventListener('click', async (event) => {
  // Only handle clicks within the components list
  if (!event.target.closest('#endpoints-list')) return;
  // Handle copy buttons
  if (event.target.classList.contains('copy-btn')) {
    event.stopPropagation();
    const componentId = event.target.dataset.componentId;
    const copyType = event.target.dataset.copyType;
    const components = await window.api.getComponents();
    const component = components.find(c => c.id === componentId);
    
    if (component) {
      const textToCopy = copyType === 'input' 
        ? JSON.stringify(component.input || {}, null, 2)
        : JSON.stringify(component.output || {}, null, 2);
      
      await navigator.clipboard.writeText(textToCopy);
      
      // Visual feedback
      const originalText = event.target.textContent;
      event.target.textContent = 'Copied!';
      event.target.classList.add('btn-success');
      setTimeout(() => {
        event.target.textContent = originalText;
        event.target.classList.remove('btn-success');
      }, 1000);
    }
    return;
  }
  
  // Handle clone
  const cloneButton = event.target.closest('.clone-component-btn');
  if (cloneButton) {
    event.stopPropagation();
    const id = cloneButton.dataset.id;
    
    const clonedComponent = await window.api.cloneComponent(id);
    if (clonedComponent) {
      renderComponents();
    }
    return;
  }

  // Handle accordion toggle
  let tr = event.target.closest('tr.endpoint-row');
  if (tr) {
    const id = tr.dataset.id;
    // Find the accordion row for this endpoint
    const accordionRow = document.querySelector(`tr.accordion-row[data-id="accordion-${id}"]`);
    const isHidden = accordionRow && accordionRow.classList.contains('hidden');
    if (accordionRow) {
        if (isHidden) {
            accordionRow.classList.remove('hidden');
        } else {
            accordionRow.classList.add('hidden');
        }
    }
  }
});

// Don't render initially since content is loaded dynamically via HTMX
