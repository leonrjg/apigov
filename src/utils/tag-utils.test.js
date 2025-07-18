const TagUtils = require('./tag-utils.js');

describe('TagUtils.renderTagsAsHtml', () => {
  test('should handle edge cases (null, undefined, empty array)', () => {
    expect(TagUtils.renderTagsAsHtml(null)).toBe('');
    expect(TagUtils.renderTagsAsHtml(undefined)).toBe('');
    expect(TagUtils.renderTagsAsHtml([])).toBe('');
  });

  test('should render tags with default styling when no color mapping provided', () => {
    const singleTag = TagUtils.renderTagsAsHtml(['test-tag']);
    expect(singleTag).toBe('<span class="badge badge-primary badge-sm mr-1">test-tag</span>');

    const multipleTags = TagUtils.renderTagsAsHtml(['tag1', 'tag2']);
    expect(multipleTags).toBe('<span class="badge badge-primary badge-sm mr-1">tag1</span><span class="badge badge-primary badge-sm mr-1">tag2</span>');
  });

  test('should apply color mapping when provided and fallback to default for unmapped tags', () => {
    const colorMapping = {
      'important': 'red',
      'success': 'green'
    };
    
    const mappedTags = TagUtils.renderTagsAsHtml(['important', 'success'], colorMapping);
    expect(mappedTags).toBe('<span class="badge badge-error badge-sm mr-1">important</span><span class="badge badge-success badge-sm mr-1">success</span>');

    const mixedTags = TagUtils.renderTagsAsHtml(['important', 'unmapped'], colorMapping);
    expect(mixedTags).toBe('<span class="badge badge-error badge-sm mr-1">important</span><span class="badge badge-primary badge-sm mr-1">unmapped</span>');
  });
});