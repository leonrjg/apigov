document.addEventListener('htmx:afterSettle', async (event) => {
    const endpointForm = event.detail.target.querySelector('#endpoint-form');
    if (!endpointForm) return;

    // Wait for all required modules to be available
    const requiredModules = [
      'DependencyValidationService',
      'MappingService', 
      'Mappings',
      'TagUtils',
      'ComponentDataManager',
      'FieldOperations',
      'DropdownUtils'
    ];
    
    const [
      FieldDependency,
      MappingService,
      Mappings,
      TagUtils,
      ComponentDataManager,
      FieldOperations,
      DropdownUtils
    ] = await window.waitForModules(requiredModules);

    const dependencyValidationService = new FieldDependency();
    const mappingService = new MappingService();
    const missingMappings = new Mappings(dependencyValidationService, mappingService);

    const endpointId = document.getElementById('endpoint-id');
    const endpointName = document.getElementById('endpoint-name');
    const endpointBody = document.getElementById('endpoint-body');
    const consumesSelect = document.getElementById('endpoint-consumes');
    const jsonEditorContainer = document.getElementById('jsoneditor');
    const fieldsTableBody = document.getElementById('fields-table-body');

    const allComponents = await window.api.getComponents();

    let componentId = null;
    if (event.detail.xhr && event.detail.xhr.responseURL) {
        const responseUrl = new URL(event.detail.xhr.responseURL);
        componentId = responseUrl.searchParams.get('id');
    }

    missingMappings.render('missing-mappings-container');

    // Set up callback for mapping changes
    missingMappings.setOnMappingAdded((mapping, updatedComponent) => {
      missingMappings.updateMappingTable(updatedComponent.mappings || [], allComponents, endpointId.value);
    });

    missingMappings.setOnMappingRemoved(async (mappingRemoved, updatedComponent) => {
        missingMappings.updateMappingTable(updatedComponent.mappings || [], allComponents, endpointId.value);
    })

    // Initialize managers with injected services (modules already loaded above)
    const dataManager = new ComponentDataManager();
    const fieldOps = new FieldOperations(fieldsTableBody, dataManager);
    let dropdown = null;

    // Set up event-driven synchronization
    dataManager.onDataChange((data) => {
      fieldOps.updateFieldsTable(data);
      checkFieldDependencies();
    });

    let editor;

    // Delegate to fieldOps
    const updateFieldsTable = (jsonData) => fieldOps.updateFieldsTable(jsonData);

    // Delegates to fieldOps
    const handleAddField = () => {
      fieldOps.handleAddField();
      checkFieldDependencies();
    };

    // Get available fields for resolution (current component + consumed components)
    // Check field dependencies and populate the interactive table
    const checkFieldDependencies = (componentData = null) => {
      const componentTypeSelect = document.getElementById('component-type');

      // Use provided component data or build from current state
      const tempComponent = componentData || {
        id: endpointId.value,
        type: componentTypeSelect?.value,
        input: dataManager.getCurrentData(),
        consumes: dropdown.getSelectedValues(),
      };

      // Use dependency validation service to get missing fields and build available fields map
      const currentFields = dataManager.getCurrentFields();
        dependencyValidationService.validateFieldDependencies(tempComponent, allComponents, currentFields);
    };

    dropdown = DropdownUtils.createDropdown(consumesSelect, {
        placeholder: 'Type to search components...',
        maxItemCount: -1,
        onSelect: (selectedComponent) => {
            //checkFieldDependencies(selectedComponent);
        },
        onRemove: (removedComponent) => {

        }
    });

    // Add event listener for Add Field button
    const addFieldBtn = document.getElementById('add-field-btn');
    if (addFieldBtn) {
      addFieldBtn.addEventListener('click', handleAddField);
    }

    // Add event listener for input/output toggle
    const viewToggleContainer = document.getElementById('view-toggle-container');
      if (viewToggleContainer) {
      viewToggleContainer.addEventListener('change', (event) => {
              if (event.target.name === 'view-toggle') {
                  dataManager.switchToView(event.target.value);
        }
      });
    }


    editor = new JSONEditor(jsonEditorContainer, {
        mode: 'code',
        mainMenuBar: false,
        navigationBar: false,
        onChange: () => {
            try {
                const jsonData = editor.get();
                dataManager.updateCurrentComponentData(jsonData);
                updateFieldsTable(jsonData);
                checkFieldDependencies();
            } catch (ignored) {
            }
        }
    });

    dataManager.setEditor(editor);

    // If textarea has value, set it in the editor
    if (endpointBody.value) {
        let jsonData = {};
        try {
            jsonData = JSON.parse(endpointBody.value);
        } catch (e) {
            console.warn('❌ Form: Invalid JSON, initializing with empty object.', e);
        }
        editor.set(jsonData);
        updateFieldsTable(jsonData);
    }

    if (componentId) {
        // Prefill form with existing component data
        let component = await window.api.getComponent(componentId);
        if (!component) {
            console.warn(`Component with ID ${componentId} not found`);
        }

        dataManager.initializeForEdit(component);

        endpointId.value = component.id;
        endpointName.value = component.name;

        // Set component type
        const componentTypeSelect = document.getElementById('component-type');
        if (component.type) {
            componentTypeSelect.value = component.type;
        }

        dropdown.updateItems(
            allComponents.filter(c => c.id !== componentId).map(c => c.name),
            allComponents.filter(c => component.consumes.includes(c.id)).map(c => c.name)
        );

        endpointBody.value = JSON.stringify(component.input || {});
        if (editor) {
            try {
                dataManager.updateDisplay();
            } catch (e) {
                editor.set({});
                dataManager.notifyDataChange({});
            }
        }

        // Check field dependencies after loading the component
        checkFieldDependencies(component);

        // Update mapping table with component's mappings
        missingMappings.updateMappingTable(component.mappings || [], allComponents, component.id);
    }
    // Initialize empty component data for new components
    //dataManager.setComponentData(null);

    endpointForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      let bodyJson;
      try {
        if (editor) {
          bodyJson = editor.get();
          endpointBody.value = JSON.stringify(bodyJson);
        } else {
          bodyJson = JSON.parse(endpointBody.value);
        }
      } catch (e) {
        alert('Body must be valid JSON.');
        return;
      }
      const componentTypeSelect = document.getElementById('component-type');
      const submissionData = dataManager.prepareForSubmission();

      const component = {
        name: endpointName.value,
        input: submissionData.input,
        output: submissionData.output,
          // 'consumes' is an array of component IDs, not names; getSelectedValues returns names
        consumes: allComponents.filter(c => (dropdown.getSelectedValues() || []).includes(c.name)).map(c => c.id),
        type: componentTypeSelect.value
      };

      if (endpointId.value) {
        component.id = endpointId.value;
        await window.api.updateComponent(component);
      } else {
        component['color'] = TagUtils.getRandomColor();
        await window.api.addComponent(component);
      }
      endpointForm.reset();
      endpointId.value = '';

      if (window.htmx && document.getElementById('main-content')) {
        htmx.ajax('GET', 'components.html', '#main-content');
      }
    });
});