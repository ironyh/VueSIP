#!/usr/bin/env node
/**
 * Post-process TypeDoc markdown output to prevent VitePress Vue compilation errors.
 *
 * VitePress treats .md files as Vue SFCs and attempts to compile content as Vue.
 * This script:
 * 1. Changes ```vue to ```html to prevent Vue code block compilation
 * 2. Escapes TypeScript generics in prose text (e.g., Map<K, V> → Map\<K, V\>)
 *    to prevent them being parsed as HTML tags
 * 3. Escapes Vue SFC tags (<script>, <template>) inside ```html/```vue code blocks
 *    to prevent the Vue compiler from treating them as real SFC component tags
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
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', content: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  const processed = parts
    .map((part) => {
      if (part.type === 'code') {
        return part.content
      }
      return part.content.replace(
        /(\w+)<([^>]+(?:<[^>]+>)?[^>]*)>/g,
        (match, typeName, genericContent) => {
          const htmlTags = [
            'a', 'b', 'i', 'p', 'br', 'hr', 'div', 'span', 'img',
            'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'em', 'strong',
            'blockquote', 'details', 'summary',
          ]
          if (htmlTags.includes(typeName.toLowerCase())) {
            return match
          }
          return `${typeName}\\<${genericContent}\\>`
        }
      )
    })
    .join('')

  return processed
}

/**
 * Escape potentially problematic HTML-like tokens inside ```ts code blocks.
 *
 * TypeDoc generates TypeScript code blocks (```ts) containing generic types like
 * `Promise<void>`, `AmiMessage<T>`, `Array<T>`. The Vue SFC compiler sees <void>
 * as an unclosed HTML tag and errors out.
 *
 * We escape < as &lt; for tokens that look like HTML tag openings (letter followed
 * by word chars). This prevents the Vue compiler from seeing them as tags while
 * markdown renders &lt; as < in the output.
 *
 * Also handles html/vue blocks for SFC-tag escapes (existing behavior).
 *
 * Handles nested fences by tracking depth.
 */
function escapeCodeBlockTags(content) {
  /**
   * Escape potentially problematic HTML-like tokens inside code blocks.
   *
   * VitePress compiles .md files as Vue SFCs. The Vue compiler sees ALL content
   * in the file (including markdown fenced code blocks) as raw Vue template content.
   *
   * TypeDoc generates ```ts blocks with TypeScript generics like `Promise<void>`,
   * `AmiMessage<T>`. The Vue compiler sees <void> as an unclosed HTML tag and errors.
   *
   * For ```html/```vue blocks: escape <script>, <template>, <style> tags (existing).
   * For ```ts/```tsx/```jsx blocks: escape ALL <tag-like tokens (new).
   *
   * markdown-it renders &lt; as < in output, so escaping preserves display correctly.
   */

  const FENCE_TYPES = ['```ts\n', '```tsx\n', '```jsx\n', '```html\n', '```vue\n', '```typescript\n']
  const CLOSE_FENCE = '\n```\n'

  const parts = []
  let i = 0
  const len = content.length

  while (i < len) {
    // Check for any opening fence
    let fenceType = null
    for (const ft of FENCE_TYPES) {
      if (content.slice(i, i + ft.length) === ft) {
        fenceType = ft
        break
      }
    }

    if (!fenceType) {
      parts.push(content[i])
      i++
      continue
    }

    // Found opening fence at i
    const blockStart = i
    i += fenceType.length // skip opening fence

    // Find matching closing fence (no nesting for ts/html/vue)
    while (i < len) {
      if (content.slice(i, i + CLOSE_FENCE.length) === CLOSE_FENCE) {
        i += CLOSE_FENCE.length
        break
      }
      i++
    }

    const blockContent = content.slice(blockStart + fenceType.length, i - CLOSE_FENCE.length)
    const isSfcBlock = fenceType === '```html\n' || fenceType === '```vue\n'
    const isTsBlock = fenceType === '```ts\n' || fenceType === '```tsx\n' || fenceType === '```jsx\n' || fenceType === '```typescript\n'

    let escaped = blockContent
    if (isSfcBlock) {
      // Escape Vue SFC tags
      if (/<(?:script|template|style)(\s|>)/i.test(blockContent)) {
        escaped = blockContent
          .replace(/<script(\s|>)/gi, '&lt;script$1')
          .replace(/<\/script>/gi, '&lt;/script&gt;')
          .replace(/<template(\s|>)/gi, '&lt;template$1')
          .replace(/<\/template>/gi, '&lt;/template&gt;')
          .replace(/<style(\s|>)/gi, '&lt;style$1')
          .replace(/<\/style>/gi, '&lt;/style&gt')
      }
    } else if (isTsBlock) {
      // Escape HTML-like tokens: <Letter... with no = or / immediately after <
      escaped = blockContent.replace(/<([a-zA-Z][a-zA-Z0-9]*)(?![=>/])/g, '&lt;$1')
    }

    parts.push(fenceType, escaped, CLOSE_FENCE)
  }

  return parts.join('')
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Replace ```vue with ```html to prevent Vue compilation
  content = content.replace(/```vue\n/g, '```html\n')

  // Escape TypeScript generics in prose text
  content = escapeTypeScriptGenerics(content)

  // Escape HTML-like tokens in code blocks (ts, html, vue)
  content = escapeCodeBlockTags(content)

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
