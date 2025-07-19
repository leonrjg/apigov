(function() {
  'use strict';

  // Get dependencies
  const Component = window.requireModule('ComponentModel');
  const Tag = window.requireModule('Tag');

  class UIController {
    constructor(dataController, graphController) {
      this.dataController = dataController;
      this.graphController = graphController;
      this.initializeEventListeners();
    }

    initializeEventListeners() {
      // Use event delegation for dynamically created content
      document.addEventListener('click', (event) => this.handleClick(event));
    }

    async handleClick(event) {
      // Only handle clicks within the components list
      if (!event.target.closest('#endpoints-list')) return;

      // Handle copy buttons
      if (event.target.classList.contains('copy-btn')) {
        await this.handleCopyButton(event);
        return;
      }
      
      // Handle clone button
      const cloneButton = event.target.closest('.clone-component-btn');
      if (cloneButton) {
        await this.handleCloneButton(event, cloneButton);
        return;
      }
      
      // Handle delete button
      const deleteButton = event.target.closest('.btn-error');
      if (deleteButton && deleteButton.dataset.id) {
        await this.handleDeleteButton(event, deleteButton);
        return;
      }

      // Handle accordion toggle
      const tr = event.target.closest('tr.endpoint-row');
      if (tr) {
        this.handleAccordionToggle(tr);
      }
    }

    async handleCopyButton(event) {
      event.stopPropagation();
      const componentId = event.target.dataset.componentId;
      const copyType = event.target.dataset.copyType;
      const components = await this.dataController.getComponents();
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
    }

    async handleCloneButton(event, cloneButton) {
      event.stopPropagation();
      const id = cloneButton.dataset.id;
      
      const clonedComponent = await this.dataController.cloneComponent(id);
      if (clonedComponent) {
        this.renderComponents();
      }
    }

    async handleDeleteButton(event, deleteButton) {
      const id = deleteButton.dataset.id;
      
      // Check if component is consumed by other components
      const componentToDelete = await this.dataController.findComponentById(id);
      const consumingComponents = await this.dataController.findComponentsConsuming(id);

      if (consumingComponents.length > 0) {
        const componentNames = consumingComponents.map(comp => comp.name).join(', ');
        const confirmed = confirm(
          `Component "${componentToDelete.name}" is required by [${componentNames}]\n\n` +
          `Continue?`
        );
        
        if (!confirmed) {
          return;
        }
      }
      
      const success = await this.dataController.deleteComponent(id);
      if (success) {
        this.renderComponents();
      }
    }

    handleAccordionToggle(tr) {
      const id = tr.dataset.id;
      const accordionRow = document.querySelector(`tr.accordion-row[data-id="accordion-${id}"]`);
      
      if (accordionRow) {
        const isHidden = accordionRow.classList.contains('hidden');
        if (isHidden) {
          accordionRow.classList.remove('hidden');
        } else {
          accordionRow.classList.add('hidden');
        }
      }
    }

    getTypeIcon(type) {
      switch(type) {
        case 'endpoint':
          return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /> </svg>';
        case 'database_table':
          return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /> </svg>';
        default:
          return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /> </svg>';
      }
    }

    async createComponentRow(component, components) {
      const tr = document.createElement('tr');
      tr.classList.add('endpoint-row');
      tr.dataset.id = component.id;

      // Check dependencies
      const dependencyCheck = await Component.check(component.id);
      const dependencyIcon = dependencyCheck.hasMissingDependencies
          ? '<span class="h-4 w-4 text-warning" title="Missing dependencies"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /> </svg></span>'
          : '<span class="h-4 w-4 text-success text-center" title="All dependencies satisfied"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /> </svg></span>';

      // Render consumed components as tags
      const consumedTags = (() => {
        if (!component.consumes || component.consumes.length === 0) return '';
        const tagNames = component.consumes.map(id => {
          const consumedComp = components.find(c => c.id === id);
          return consumedComp ? consumedComp.name : id;
        });
        const colorMapping = {};
        component.consumes.forEach(id => {
          const consumedComp = components.find(c => c.id === id);
          if (consumedComp && consumedComp.color) {
            colorMapping[consumedComp.name] = consumedComp.color;
          }
        });
        return Tag.renderTagsAsHtml(tagNames, colorMapping);
      })();

      tr.innerHTML = `
        <td class="cursor-pointer">
          <div class="flex items-center gap-2">
            ${this.getTypeIcon(component.type || 'endpoint')}
            <span class="text-sm text-base-content/70">${component.type || 'endpoint'}</span>
          </div>
        </td>
        <td class="font-bold cursor-pointer">${component.name}</td>
        <td class="cursor-pointer">${consumedTags}</td>
        <td class="cursor-pointer">${dependencyIcon}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary edit-endpoint-btn" data-id="${component.id}" hx-get="form.html" hx-vals='{"id":"${component.id}"}' hx-target="#main-content" hx-swap="innerHTML">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3"> <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /> </svg>
            </button>
            <button class="btn btn-sm btn-secondary clone-component-btn" data-id="${component.id}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /> </svg>
            </button>
            <button class="btn btn-sm btn-error" data-id="${component.id}">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3"> <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /> </svg>
            </button>
          </div>
        </td>
      `;

      return tr;
    }

    createAccordionRow(component) {
      const accordionTr = document.createElement('tr');
      accordionTr.className = 'accordion-row hidden';
      accordionTr.dataset.id = `accordion-${component.id}`;
      const td = document.createElement('td');
      td.colSpan = 5;
      td.innerHTML = `
        <div class="bg-base-200 rounded">
          <table class="table w-full">
            <thead>
              <tr>
                <th class="w-1/2">
                  Input
                  <button class="btn btn-xs btn-outline float-right copy-btn" data-copy-type="input" data-component-id="${component.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /> </svg>
                    Copy
                  </button>
                </th>
                <th class="w-1/2">
                  Output
                  <button class="btn btn-xs btn-outline float-right copy-btn" data-copy-type="output" data-component-id="${component.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"> <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /> </svg>
                    Copy
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="align-top">
                  <pre class="text-xs whitespace-pre-wrap">${JSON.stringify(component.input || {}, null, 2)}</pre>
                </td>
                <td class="align-top">
                  <pre class="text-xs whitespace-pre-wrap">${JSON.stringify(component.output || {}, null, 2)}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      accordionTr.appendChild(td);
      return accordionTr;
    }

    async renderComponents() {
      const components = await this.dataController.getComponents(true);
      const componentsList = document.getElementById('endpoints-list');
      
      if (!componentsList) {
        console.warn('Components list element not found');
        return;
      }
      
      componentsList.innerHTML = '';

      if (!components || components.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'flex flex-col items-center justify-center py-16 text-center';
        emptyState.innerHTML = `<p class="text-base-content/60">Click the button above to create your first component</p>`;
        componentsList.appendChild(emptyState);
        return;
      }
      
      // Create table structure
      const table = document.createElement('table');
      table.className = 'table w-full';
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th>Type</th>
          <th>Name</th>
          <th>Requires</th>
          <th>Dependencies</th>
          <th>Actions</th>
        </tr>
      `;
      table.appendChild(thead);
      
      const tbody = document.createElement('tbody');
      for (const component of components) {
        const componentRow = await this.createComponentRow(component, components);
        const accordionRow = this.createAccordionRow(component);
        tbody.appendChild(componentRow);
        tbody.appendChild(accordionRow);
      }

      table.appendChild(tbody);
      componentsList.appendChild(table);
      
      const Sidebar = window.requireModule('Sidebar');
      Sidebar.processDynamicContent(componentsList);
    }

    async renderGraphView() {
      const components = await this.dataController.getComponents();
      this.graphController.render('graph-view-content-inner', components);
    }
  }

  // Export functions for backward compatibility
  const renderComponents = async () => {
    const uiController = window.requireModule('UIController');
    if (uiController) {
      await uiController.renderComponents();
    }
  };

  const renderGraphView = async () => {
    const uiController = window.requireModule('UIController');
    if (uiController) {
      await uiController.renderGraphView();
    }
  };

  window.moduleRegistry.register('UIController', UIController, ['DataController', 'GraphController', 'ComponentModel', 'Tag']);
  window.moduleRegistry.register('renderComponents', renderComponents);
  window.moduleRegistry.register('renderGraphView', renderGraphView);
})();