// tag-utils.js - Shared tag functionality

// Color utilities for components
const COMPONENT_COLORS = [
  { name: 'blue', class: 'badge-primary' },     // blue
  { name: 'purple', class: 'badge-secondary' }, // purple
  { name: 'pink', class: 'badge-accent' },      // pink
  { name: 'green', class: 'badge-success' },    // green
  { name: 'yellow', class: 'badge-warning' },   // yellow
  { name: 'red', class: 'badge-error' },        // red
  { name: 'cyan', class: 'badge-info' }         // cyan
];

// Get random color from predefined list
const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * COMPONENT_COLORS.length);
  return COMPONENT_COLORS[randomIndex].name;
};

// Get badge class for color
const getBadgeClassForColor = (colorName) => {
  const color = COMPONENT_COLORS.find(c => c.name === colorName);
  return color ? color.class : 'badge-primary'; // default to primary if color not found
};

// Create tag element
const createTagElement = (tagText, showRemoveButton = false, onRemove = null, colorName = null) => {
  const tag = document.createElement('div');
  const badgeClass = colorName ? getBadgeClassForColor(colorName) : 'badge-primary';
  tag.className = `badge ${badgeClass} badge-sm flex items-center gap-1 px-2 py-1`;
  
  if (showRemoveButton && onRemove) {
    tag.innerHTML = `
      <span>${tagText}</span>
      <button type="button" class="text-xs hover:bg-primary-focus rounded-full w-4 h-4 flex items-center justify-center" onclick="${onRemove}('${tagText}')">
        ×
      </button>
    `;
  } else {
    tag.innerHTML = `<span>${tagText}</span>`;
  }
  
  return tag;
};

// Render tags as HTML string for table display
const renderTagsAsHtml = (tags, colorMapping = {}) => {
  if (!tags || tags.length === 0) return '';
  
  return tags.map(tag => {
    const colorName = colorMapping[tag];
    const badgeClass = colorName ? getBadgeClassForColor(colorName) : 'badge-primary';
    return `<span class="badge ${badgeClass} badge-sm mr-1">${tag}</span>`;
  }).join('');
};

// Export functions for use in other files
const TagUtils = {
  createTagElement,
  renderTagsAsHtml,
  getRandomColor,
  getBadgeClassForColor
};

window.moduleRegistry.register('TagUtils', TagUtils);