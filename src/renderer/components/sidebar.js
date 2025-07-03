function createSidebar() {
  return `
    <div class="w-48 bg-gray-800 text-white flex flex-col p-4 shadow-lg h-full">
      <h2 class="text-3xl font-bold mb-6 text-gray-100 text-center">APIGov</h2>
      <ul class="space-y-2">
        <li>
          <button hx-get="components.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-endpoints" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <i data-lucide="layers" class="h-5 w-5 mr-3"></i>
            Components
          </button>
        </li>
        <li class="border-t border-gray-700 my-2"></li>
        <li>
          <button hx-get="graph.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-graph-view" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <i data-lucide="network" class="h-5 w-5 mr-3"></i>
            Graph View
          </button>
        </li>
        <li>
          <button hx-get="diagram.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-diagram" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <i data-lucide="workflow" class="h-5 w-5 mr-3"></i>
            Diagram
          </button>
        </li>
        <li class="border-t border-gray-700 my-2"></li>
        <li>
          <button hx-get="import-export.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-import-export" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <i data-lucide="arrow-up-down" class="h-5 w-5 mr-3"></i>
            Import/Export
          </button>
        </li>
      </ul>
    </div>
  `;
}

function processDynamicContent(element) {
  if (typeof htmx !== 'undefined') {
    htmx.process(element);
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Register module with explicit dependencies
(function() {
  'use strict';

  const SidebarModule = {
    processDynamicContent
  };
  window.moduleRegistry.register('Sidebar', SidebarModule);
})();

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = createSidebar();
    window.processDynamicContent(sidebarContainer);
        setupNavigation();
  }
});

function setupNavigation() {
  document.addEventListener('htmx:beforeRequest', function(event) {
      });

  document.addEventListener('htmx:responseError', function(event) {
    console.error('HTMX: Response error', event.detail);
  });

  document.addEventListener('htmx:sendError', function(event) {
    console.error('HTMX: Send error', event.detail);
  });

  document.addEventListener('htmx:afterRequest', function(event) {
      });

  // Add event listener for HTMX content loading
  document.addEventListener('htmx:afterSettle', function(event) {
    if (typeof window.processDynamicContent === 'function') {
      window.processDynamicContent(event.target);
    }
  });
}