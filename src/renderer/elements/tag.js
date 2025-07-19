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
const Tag = {
  renderTagsAsHtml,
  getRandomColor,
  getBadgeClassForColor
};

// For browser environment
if (typeof window !== 'undefined' && window.moduleRegistry) {
  window.moduleRegistry.register('Tag', Tag);
}

// For Node.js/Jest environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tag;
}