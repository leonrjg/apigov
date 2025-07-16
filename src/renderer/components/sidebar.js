function createSidebar() {
  return `
    <div class="w-48 bg-gray-800 text-white flex flex-col p-4 shadow-lg h-full">
      <img src="../../assets/icon.png" alt="Logo" class="w-20 h-20 mx-auto mb-4 rounded-full">
      <h2 class="text-3xl font-bold mb-6 text-gray-100 text-center">APIGov</h2>
      <ul class="space-y-2">
        <li>
          <button hx-get="components.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-endpoints" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <span class="h-5 w-5 mr-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z" /> </svg></span>
            Components
          </button>
        </li>
        <li class="border-t border-gray-700 my-2"></li>
        <li>
          <button hx-get="graph.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-graph-view" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <span class="h-5 w-5 mr-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75 2.25-1.313M12 21.75V19.5m0 2.25-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" /> </svg></span>
            Graph View
          </button>
        </li>
        <li>
          <button hx-get="diagram.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-diagram" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <span class="h-5 w-5 mr-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /> <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /> </svg></span>
            Diagram
          </button>
        </li>
        <li class="border-t border-gray-700 my-2"></li>
        <li>
          <button hx-get="import-export.html?v=${new Date().getTime()}" hx-target="#main-content" hx-swap="innerHTML" id="nav-import-export" class="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200">
            <span class="h-5 w-5 mr-3"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /> </svg></span>
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