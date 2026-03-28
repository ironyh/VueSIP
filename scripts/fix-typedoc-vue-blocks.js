#!/usr/bin/env node
/**
 * Post-process TypeDoc markdown output to prevent VitePress Vue compilation errors.
 *
 * VitePress treats .md files as Vue SFCs and attempts to compile content as Vue.
 * This script:
 * 1. Changes ```vue to ```html to prevent Vue code block compilation
 * 2. Escapes TypeScript generics in prose text (e.g., Map<K, V> → Map\<K, V\>)
 *    to prevent them being parsed as HTML tags
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const GENERATED_DIR = 'docs/api/generated'

/**
 * Escape TypeScript generics in prose text to prevent Vue parsing them as HTML.
 * Only escapes angle brackets that look like TypeScript generics, not actual HTML.
 */
function escapeTypeScriptGenerics(content) {
  // Split content into code blocks and non-code blocks
  const parts = []
  let lastIndex = 0
  const codeBlockRegex = /```[\s\S]*?```|`[^`\n]+`/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add the text before this code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    // Add the code block unchanged
    parts.push({ type: 'code', content: match[0] })
    lastIndex = match.index + match[0].length
  }
  // Add remaining text after last code block
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  // Process only the text parts (not code blocks)
  const processed = parts
    .map((part) => {
      if (part.type === 'code') {
        return part.content
      }

      // Escape TypeScript generics patterns in prose text
      // Match patterns like: Type<Generic>, Map<K, V>, Array<T>, etc.
      // These look like: word followed by <...> where ... contains word chars, commas, spaces, brackets
      return part.content.replace(
        /(\w+)<([^>]+(?:<[^>]+>)?[^>]*)>/g,
        (match, typeName, genericContent) => {
          // Don't escape if it looks like actual HTML (common tags)
          const htmlTags = [
            'a',
            'b',
            'i',
            'p',
            'br',
            'hr',
            'div',
            'span',
            'img',
            'ul',
            'ol',
            'li',
            'table',
            'tr',
            'td',
            'th',
            'thead',
            'tbody',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'pre',
            'code',
            'em',
            'strong',
            'blockquote',
            'details',
            'summary',
          ]
          if (htmlTags.includes(typeName.toLowerCase())) {
            return match
          }
          // Escape the angle brackets
          return `${typeName}\\<${genericContent}\\>`
        }
      )
    })
    .join('')

  return processed
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Replace ```vue with ```html to prevent Vue compilation
  content = content.replace(/```vue\n/g, '```html\n')

  // Escape TypeScript generics in prose text
  content = escapeTypeScriptGenerics(content)

  if (original !== content) {
    writeFileSync(filePath, content)
    console.log(`Fixed Vue/TypeScript issues in: ${filePath}`)
    return true
  }
  return false
}

function processDirectory(dirPath) {
  let filesFixed = 0
  const entries = readdirSync(dirPath)

  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      filesFixed += processDirectory(fullPath)
    } else if (entry.endsWith('.md')) {
      if (processFile(fullPath)) {
        filesFixed++
      }
    }
  }

  return filesFixed
}

console.log('Processing TypeDoc generated markdown files...')
const fixed = processDirectory(GENERATED_DIR)
console.log(`Done! Fixed ${fixed} file(s).`)
