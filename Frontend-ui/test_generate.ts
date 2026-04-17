import { generatePreviewHtml } from './src/lib/editor/generatePreviewHtml.ts';
const sections = [{
  id: 1712211624021,
  elements: [{
    id: 1,
    type: 'button',
    content: 'Test Button',
    styles: { actionType: 'section', actionTarget: '1712211624021' }
  }]
}];
const html = generatePreviewHtml(sections);
const lines = html.split('\n');
const aLine = lines.find(l => l.includes('<a '));
console.log(aLine);
