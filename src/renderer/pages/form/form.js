document.addEventListener('htmx:afterSettle', async (event) => {
    console.log('🔍 Form.js: htmx:afterSettle event fired');
    console.log('🔍 Form.js: Event target:', event.detail.target);
    console.log('🔍 Form.js: Looking for #endpoint-form...');
    
    const endpointForm = event.detail.target.querySelector('#endpoint-form');
    console.log('🔍 Form.js: Found #endpoint-form:', !!endpointForm);
    
    if (!endpointForm) return;
      
    console.log('🔍 Form.js: Starting form initialization...');

    // Wait for all required modules to be available
    const requiredModules = [
      'DependencyValidationService',
      'MappingService', 
      'Mappings',
      'DependencyUtils',
      'TagUtils',
      'ComponentDataManager',
      'FieldOperations',
      'TagManager',
      'DropdownUtils'
    ];
    
    const [
      FieldDependency,
      MappingService,
      Mappings,
      DependencyUtils,
      TagUtils,
      ComponentDataManager,
      FieldOperations,
      TagManager
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
    const tagManager = new TagManager(consumesSelect);

    // Set up event-driven synchronization
    dataManager.onDataChange((data) => {
      fieldOps.updateFieldsTable(data);
      checkFieldDependencies();
    });

    let allComponents = [];
    let editor;

    // Delegate to fieldOps
    const updateFieldsTable = (jsonData) => fieldOps.updateFieldsTable(jsonData);

    // Delegates to fieldOps
    const handleAddField = () => {
      fieldOps.handleAddField();
      checkFieldDependencies();
    };

    // Get available fields for resolution (current component + consumed components)
    const getAvailableFieldsForResolution = (excludeComponent) => {
      let availableFields = [];

      // Add current component's body fields
      const currentFields = dataManager.getCurrentFields();
      const currentComponentName = endpointName.value || 'Current Component';
      currentFields.forEach(field => {
        availableFields.push({
          field: field,
          source: currentComponentName,
          display: `${field} (from ${currentComponentName})`
        });
      });

      // Add fields from consumed components (except the one we're resolving from)
      tagManager.getSelectedTags().forEach(consumedComponentId => {
        const consumedComponent = allComponents.find(comp => comp.id === consumedComponentId);
        if (!consumedComponent || consumedComponent.name === excludeComponent || !consumedComponent.output) return;

        const consumedFields = DependencyUtils.getFieldPaths(consumedComponent.output);
        consumedFields.forEach(field => {
          availableFields.push({
            field: field,
            source: consumedComponent.name,
            sourceId: consumedComponent.id,
            display: `${field} (from ${consumedComponent.name})`
          });
        });
      });

      return availableFields;
    };

    // Check field dependencies and populate the interactive table
    const checkFieldDependencies = (componentData = null) => {
      const componentTypeSelect = document.getElementById('component-type');

      // Use provided component data or build from current state
      const tempComponent = componentData || {
        id: endpointId.value,
        type: componentTypeSelect?.value,
        input: dataManager.getCurrentData(),
        consumes: tagManager.getSelectedTags(),
        mappings: []
      };

      // Use dependency validation service to get missing fields and build available fields map
      const currentFields = dataManager.getCurrentFields();
      const validationResult = dependencyValidationService.validateFieldDependencies(tempComponent, allComponents, currentFields);
    };

    // Load all components for autocomplete
    const loadComponents = async () => {
      console.log('🔍 loadComponents: Starting...');
      console.log('🔍 window.api available:', !!window.api);
      console.log('🔍 window.api.getComponents available:', !!window.api?.getComponents);

      try {
        console.log('🔍 loadComponents: Calling window.api.getComponents...');
        allComponents = await window.api.getComponents();
        console.log('🔍 loadComponents: Got components:', allComponents?.length || 0);
        
        tagManager.setComponents(allComponents);
        console.log('🔍 loadComponents: Set components on tagManager');

        // Trigger dependency check after components are loaded
        checkFieldDependencies();
        console.log('🔍 loadComponents: Completed successfully');
      } catch (e) {
        console.error('❌ loadComponents: Error loading components:', e);
        allComponents = [];
      }
    };

  // Initialize managers and load data
    console.log('🔍 Form: Starting loadComponents...');
    loadComponents().then(() => {
      tagManager.initializeAutocomplete();
    }).catch(error => {
      console.error('❌ Form: loadComponents failed:', error);
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


    if (jsonEditorContainer && window.JSONEditor) {
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
          } catch (ignored) { }
        }
      });

      dataManager.setEditor(editor);

      // If textarea has value, set it in the editor
      if (endpointBody.value) {
        try {
          const jsonData = JSON.parse(endpointBody.value);
          editor.set(jsonData);
          updateFieldsTable(jsonData);
        } catch (e) {
          editor.set({});
          updateFieldsTable({});
        }
      }
    }

    // Prefill form if editing - get editId from HTMX response URL
    let editId = null;
    if (event.detail.xhr && event.detail.xhr.responseURL) {
      const responseUrl = new URL(event.detail.xhr.responseURL);
      editId = responseUrl.searchParams.get('id');
    }
    if (editId) {
      window.api.getComponents().then(components => {
        const component = components.find(comp => comp.id === editId);
        if (component) {
          // Initialize managers with component data
          dataManager.initializeForEdit(component);
          tagManager.loadTagsFromComponent(component);

          endpointId.value = component.id;
          endpointName.value = component.name;

          // Set component type
          const componentTypeSelect = document.getElementById('component-type');
          if (component.type) {
            componentTypeSelect.value = component.type;
          }

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
      });
    } else {
      // Initialize empty component data for new components
      dataManager.setComponentData(null);
    }

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
        consumes: tagManager.getSelectedTags() || [],
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
      tagManager.clearAll();

      if (window.htmx && document.getElementById('main-content')) {
        htmx.ajax('GET', 'components.html', '#main-content');
      }
    });
});