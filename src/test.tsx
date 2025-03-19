// src/test.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import TestPage from '@/components/test_parsed_markdown';
import '@/highlight_sentences.js';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<TestPage />);
