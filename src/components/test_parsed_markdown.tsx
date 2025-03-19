// src/TestPage.tsx
import React from 'react';
import { parsing } from '@/parsing_markdown';
import markdownContent from '@/test.md?raw'; // Import Markdown file as raw string
import { html as beautifyHtml } from 'js-beautify';
import { marked } from 'marked';

const TestPage: React.FC = () => {
  const result = parsing(markdownContent);

  const prettyHtml = beautifyHtml(result.html, { indent_size: 2 });

  const htmlString = marked.parse(markdownContent);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Markdown Test Page</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Panel 1: Raw HTML */}
        <div
          class="prose"
          style={{ flex: 1, backgroundColor: '#fff', padding: '10px', border: '1px solid #ddd' }}
        >
          <h2>Rendered HTML</h2>
          <div dangerouslySetInnerHTML={{ __html: htmlString }} />
        </div>
        {/* Panel 2: Rendered HTML */}
        <div
          class="prose"
          style={{ flex: 1, backgroundColor: '#fff', padding: '10px', border: '1px solid #ddd' }}
        >
          <h2>Rendered parsed HTML</h2>
          <div dangerouslySetInnerHTML={{ __html: prettyHtml }} />
        </div>
      </div>
    </div>
  );
};

export default TestPage;
