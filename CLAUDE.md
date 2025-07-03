# APIGov - Microservice Schema Governance Tool

## Overview
APIGov is an Electron-based desktop application for managing API components and their dependencies. It provides a visual interface for creating, editing, and visualizing component relationships in a system architecture.

## Project Structure
- **Main Process**: `src/main.js` - Electron main process with IPC handlers for database operations
- **Renderer Process**: `src/renderer/` - Frontend UI components and pages
- **Database**: JSON-based storage in user data directory (`database.json`) with sample at `src/data/database.sample.json`
- **Styling**: TailwindCSS with DaisyUI components

## Key Features
- Component management operations (CRUD)
- Schema dependency tracking between components (field-level)
- Graph and diagram visualization
- Import/export functionality

## Technology Stack
- **Framework**: Electron 35.0.0
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: TailwindCSS 4.1.10, DaisyUI 5.0.43
- **Visualization**: D3.js 7.9.0
- **Storage**: JSON file-based database
- This app does not have a build step excluding Electron packaging.

## Component Schema
Components are stored with the following structure (sample: `src/data/database.sample.json`:
- `id`: UUID identifier
- `name`: Component name
- `type`: Component type (Possible values: "endpoint", "database_table")
- `consumes`: Array of component names this component depends on
- `input`: Input schema definition
- `output`: Output schema definition
- `mappings`: Field mappings between components

## Development Notes
- Database is stored in Electron's userData directory
- IPC communication handles all database operations
- Graph view implementation uses D3.js for dependency visualization
- Form validation and autocomplete utilities are available
- Supports component deletion with automatic cleanup of dependencies

### HTMX Parameter Passing
When using `hx-vals` to pass parameters to dynamically loaded content:
1. **HTMX converts `hx-vals` to URL query parameters** - these appear in the request URL but are NOT available via `window.location.search` or `document.location.search` in the loaded content
2. **Parameters are accessible via the HTMX response URL** - use `htmx:afterSettle` event to capture `event.detail.xhr.responseURL` and parse parameters from there
3. **Why this works**: HTMX loads content into the existing page context, so `window.location` remains the original page URL, but the actual request URL (with parameters) is available through the XHR response URL

## Important guidelines for AI
- **Avoid Global State**: Never use `window.*` for data sharing between modules. Use dependency injection or callback patterns instead.
- **Single Responsibility**: Each class should have one clear purpose. Don't mix data management, UI rendering, and coordination logic.
- **Explicit Dependencies**: Always pass required data as parameters rather than accessing it implicitly through globals.
- **Observer Pattern**: Use callbacks/events for loose coupling when child components need to notify parents of changes.
- **Avoid Mixed Responsibilities**: Classes that manage data and UI and coordination logic.
- Use existing utilities if possible.
- Never use setTimeout hacks to handle initialization.
- Don't use fallbacks, choose a way to do things and stick to it.