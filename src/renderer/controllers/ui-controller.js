(function() {
  'use strict';

  // Get dependencies
  const DependencyUtils = window.requireModule('DependencyUtils');
  const TagUtils = window.requireModule('TagUtils');

  class UIController {
    constructor(dataController, graphController) {
      this.dataController = dataController;
      this.graphController = graphController;
      this.initializeEventListeners();
    }

    initializeEventListeners() {
      // Use event delegation for dynamically created content
      document.addEventListener('click', (event) => this.handleClick(event));

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
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
      const components = await this.dataController.getComponents();
      const componentToDelete = this.dataController.findComponentById(id);
      const consumingComponents = this.dataController.findComponentsConsuming(id);
      
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
          return '<i data-lucide="link" class="h-4 w-4"></i>';
        case 'database_table':
          return '<i data-lucide="database" class="h-4 w-4"></i>';
        default:
          return '<i data-lucide="box" class="h-4 w-4"></i>';
      }
    }

    async createComponentRow(component, components) {
      const tr = document.createElement('tr');
      tr.classList.add('endpoint-row');
      tr.dataset.id = component.id;

      // Check dependencies
      const dependencyCheck = await DependencyUtils.check(component.id);
      const dependencyIcon = dependencyCheck.hasMissingDependencies
          ? '<i data-lucide="alert-triangle" class="h-4 w-4 text-warning" title="Missing dependencies"></i>'
          : '<i data-lucide="check-circle" class="h-4 w-4 text-success" title="All dependencies satisfied"></i>';

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
        return TagUtils.renderTagsAsHtml(tagNames, colorMapping);
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
              <i data-lucide="edit" class="h-3 w-3"></i>
            </button>
            <button class="btn btn-sm btn-secondary clone-component-btn" data-id="${component.id}">
              <i data-lucide="copy" class="h-3 w-3"></i>
            </button>
            <button class="btn btn-sm btn-error" data-id="${component.id}">
              <i data-lucide="trash-2" class="h-3 w-3"></i>
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
                    <i data-lucide="copy" class="h-3 w-3 mr-1"></i>
                    Copy
                  </button>
                </th>
                <th class="w-1/2">
                  Output
                  <button class="btn btn-xs btn-outline float-right copy-btn" data-copy-type="output" data-component-id="${component.id}">
                    <i data-lucide="copy" class="h-3 w-3 mr-1"></i>
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
      
      // Process dynamic content for HTMX and Lucide icons
      const Sidebar = window.requireModule('Sidebar');
      if (Sidebar && Sidebar.processDynamicContent) {
        Sidebar.processDynamicContent(componentsList);
      } else if (typeof window.processDynamicContent === 'function') {
        window.processDynamicContent(componentsList);
      }
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

  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('UIController', UIController, ['DataController', 'GraphController', 'DependencyUtils', 'TagUtils']);
    window.moduleRegistry.register('renderComponents', renderComponents);
    window.moduleRegistry.register('renderGraphView', renderGraphView);
  } else {
    window.UIController = UIController;
    window.renderComponents = renderComponents;
    window.renderGraphView = renderGraphView;
  }
})();