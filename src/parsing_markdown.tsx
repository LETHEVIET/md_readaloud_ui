import { marked } from 'marked';
import * as cheerio from 'cheerio';
import { split } from 'sentence-splitter';

// Function to generate structure-based IDs for HTML elements
function generateStructureBasedIds($, rootElement, padLength = 3) {
  let counter = 0; // Tracks the order of elements

  function assignId(element) {
    if (element.name) {
      // Ensure it’s a valid tag
      counter++; // Increment for each element
      const paddedIndex = String(counter).padStart(padLength, '0');
      const id = `element-${paddedIndex}`; // e.g., element-001
      $(element).attr('id', id); // Assign the ID

      // Process all child elements recursively
      $(element)
        .children()
        .each((_, child) => assignId(child));
    }
  }

  assignId(rootElement); // Start from the root
}

// Function to find the next HTML tag in a string
// function getNextTag(text) {
//     const openTagPattern = /<([a-z]+)(?![^>]*\/>)[^>]*>/;
//     const closeTagPattern = /<\/([a-z]+)(?![^>]*\/>)[^>]*>/;

//     const openMatch = text.match(openTagPattern);
//     const closeMatch = text.match(closeTagPattern);

//     if (openMatch && closeMatch) {
//         return openMatch.index < closeMatch.index
//             ? { type: 'open', match: openMatch }
//             : { type: 'close', match: closeMatch };
//     }
//     if (openMatch) return { type: 'open', match: openMatch };
//     if (closeMatch) return { type: 'close', match: closeMatch };
//     return null;
// }

// Function to split HTML into sentences while preserving tags

function splitHtmlToSentences(htmlText) {
  // const $ = cheerio.load(htmlText);

  let con_offset = 0;

  const indices = [];
  const rawText = htmlText.replace(/<[^>]+>/g, (match, offset) => {
    indices.push({
      position: offset - con_offset,
      tag: match,
    });
    con_offset += match.length;
    return '';
  });

  indices.splice(0, 1);
  indices.splice(indices.length - 1, 1);

  const splitResult = split(rawText);
  const sentences = splitResult.filter((item) => item.type === 'Sentence');
  const splits = sentences.map((sent) => ({
    start: sent.range[0],
    end: sent.range[1],
  }));

  const htmlResults = [];
  const textResults = [];
  let currentSplit = 0;
  let currentHtmlSent = '';
  let currentTextSent = '';

  let currentTag = 0;

  for (let i = 0; i < rawText.length; i++) {
    while (currentTag < indices.length && i == indices[currentTag].position) {
      currentHtmlSent += indices[currentTag].tag;
      currentTag++;
    }
    if (currentSplit < splits.length && i >= splits[currentSplit].end) {
      htmlResults.push(currentHtmlSent);
      textResults.push(currentTextSent);
      currentHtmlSent = '';
      currentTextSent = '';
      currentSplit++;
    }
    // if (currentSplit < splits.length && i >= splits[currentSplit].start) {
    currentHtmlSent += rawText[i];
    currentTextSent += rawText[i];
    // }
  }
  if (currentHtmlSent) {
    htmlResults.push(currentHtmlSent);
    textResults.push(currentTextSent);
  }

  return { htmlResults, textResults };
}

// Function to process an HTML element, splitting its content into tagged sentences
function process($, element) {
  const htmlStr = $.html(element).trim();
  if (!htmlStr) return { newHtml: $.html(element), sentences: {} };

  const { htmlResults, textResults } = splitHtmlToSentences(htmlStr);
  const sentences = {};
  let newHtml = `<${element.name} id="${$(element).attr('id')}">`;

  htmlResults.forEach((htmlSent, i) => {
    if (htmlSent) {
      // console.log(htmlSent)
      const padLength = 3;
      const paddedIndex = String(i).padStart(padLength, '0');
      const id = `${$(element).attr('id')}-sent${paddedIndex}`;
      newHtml += `<span class="sent" id="${id}">${htmlSent}</span>`;
      sentences[id] = textResults[i];
    }
  });

  newHtml += `</${element.name}>`;
  // console.log(sentences)
  return { newHtml, sentences };
}

// Function to tag sentences in <p> and header tags
function taggingSentences($) {
  const tagsToReplace = ['p', 'pp', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const sentences = {};

  for (let i = 0; i < tagsToReplace.length; i++) {
    const tag = tagsToReplace[i];
    const elements = $(tag); // Get the jQuery-like object of elements for the current tag

    for (let j = 0; j < elements.length; j++) {
      const el = elements[j]; // Get the raw DOM element
      // console.log($(el).attr('id'))
      if (!$(el).attr('id')) {
        $(el).attr('id', 'default-id');
      }

      const result = process($, el); // Pass the element to process function
      const { newHtml, sentences: newSentences } = result;

      Object.assign(sentences, newSentences);
      $(el).replaceWith(newHtml);
    }
  }

  // console.log(sentences);
  return { html: $.html(), sentences };
}

// Function to wrap <li> content with <p> tags if needed
function wrapLiContentWithSpan($, element) {
  $(element)
    .find('li')
    .each((_, li) => {
      const contents = $(li).contents();
      let tempHtml = '';
      let pContent = '';

      if (contents.length == 2 && contents[0].name === 'p') {
        tempHtml = $.html(contents[0]);
      } else {
        contents.each((_, content) => {
          const tagName = content.name;
          if (tagName && ['ul', 'li', 'ol'].includes(tagName)) {
            if (pContent) {
              tempHtml += `<pp>${pContent}</pp>`;
              pContent = '';
            }
            // Recursively apply the function to nested ul elements
            $ = wrapLiContentWithSpan($, content);

            tempHtml += $.html(content);
          } else {
            pContent += content.type === 'text' ? content.data : $.html(content);
          }
        });

        if (pContent) tempHtml += `<pp>${pContent}</pp>`;
      }
      $(li).html(tempHtml);
    });

  return $;
}

function fix_pp_tags($, element) {
  $(element)
    .find('pp')
    .each((_, pp) => {
      console.log(pp.name);
      const $pp = $(pp);
      $pp.replaceWith($('<p>').html($pp.html()));
    });

  return $('body').html();
}

// Main parsing function
export function parsing(markdownText) {
  const htmlString = marked.parse(markdownText);
  let $ = cheerio.load(htmlString, { decodeEntities: false });

  // Wrap <li> content with <p>
  // wrapLiContentWithP($);

  // Set document ID (simulating soup.name)
  $('body').attr('id', 'doc');

  $ = wrapLiContentWithSpan($, $('body')[0]);

  generateStructureBasedIds($, $('body')[0]);

  // return { html: $.html(),};
  // Tag sentences
  const { html: t_html, sentences } = taggingSentences($);

  $ = cheerio.load(t_html, { decodeEntities: false });

  const html = fix_pp_tags($, $('body')[0]);
  return { html, sentences };
}
