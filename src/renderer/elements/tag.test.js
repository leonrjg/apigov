const Tag = require('./tag.js');

describe('Tag.renderTagsAsHtml', () => {
  test('should handle edge cases (null, undefined, empty array)', () => {
    expect(Tag.renderTagsAsHtml(null)).toBe('');
    expect(Tag.renderTagsAsHtml(undefined)).toBe('');
    expect(Tag.renderTagsAsHtml([])).toBe('');
  });

  test('should render tags with default styling when no color mapping provided', () => {
    const singleTag = Tag.renderTagsAsHtml(['test-tag']);
    expect(singleTag).toBe('<span class="badge badge-primary badge-sm mr-1">test-tag</span>');

    const multipleTags = Tag.renderTagsAsHtml(['tag1', 'tag2']);
    expect(multipleTags).toBe('<span class="badge badge-primary badge-sm mr-1">tag1</span><span class="badge badge-primary badge-sm mr-1">tag2</span>');
  });

  test('should apply color mapping when provided and fallback to default for unmapped tags', () => {
    const colorMapping = {
      'important': 'red',
      'success': 'green'
    };
    
    const mappedTags = Tag.renderTagsAsHtml(['important', 'success'], colorMapping);
    expect(mappedTags).toBe('<span class="badge badge-error badge-sm mr-1">important</span><span class="badge badge-success badge-sm mr-1">success</span>');

    const mixedTags = Tag.renderTagsAsHtml(['important', 'unmapped'], colorMapping);
    expect(mixedTags).toBe('<span class="badge badge-error badge-sm mr-1">important</span><span class="badge badge-primary badge-sm mr-1">unmapped</span>');
  });
});