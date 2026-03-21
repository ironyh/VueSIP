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
 * Escape Vue SFC tags (<script>, <template>, <style>) inside html/vue code blocks.
 *
 * VitePress compiles .md files as Vue SFCs. The Vue compiler does NOT understand
 * markdown fenced code blocks — it sees ALL content in the file as Vue SFC content.
 * When typedoc generates code blocks containing <script setup> or <template> tags
 * (as example code), the Vue compiler tries to parse them as real SFC component tags,
 * causing "Element is missing end tag" errors.
 *
 * We escape these tags by replacing < with &lt; inside html/vue code blocks only.
 * This prevents the Vue compiler from seeing them as SFC tags while keeping
 * the markdown rendering intact (markdown-it ignores entities inside code fences).
 *
 * Handles nested fences by tracking depth.
 */
function escapeVueSfcTagsInCodeBlocks(content) {
  const OPEN_HTML = '```html\n'
  const OPEN_VUE = '```vue\n'
  const OPEN_LEN = 7
  const CLOSE_FENCE = '\n```\n'
  const CLOSE_LEN = 4 // '\n```\n' is 4 chars

  const resultParts = []
  let pos = 0
  const len = content.length

  while (pos < len) {
    // Check for opening fence
    const slice7 = content.slice(pos, pos + OPEN_LEN)
    let isHtml = slice7 === OPEN_HTML
    let isVue = slice7 === OPEN_VUE

    if (!isHtml && !isVue) {
      resultParts.push(content[pos])
      pos++
      continue
    }

    // Found opening fence at pos
    const blockStart = pos
    pos += OPEN_LEN // skip opening fence

    // Find closing fence with depth tracking for nested blocks
    let depth = 1
    while (pos < len && depth > 0) {
      const remaining = content.slice(pos, pos + OPEN_LEN)
      if (remaining === OPEN_HTML || remaining === OPEN_VUE) {
        depth++
        pos += OPEN_LEN
      } else if (content.slice(pos, pos + CLOSE_LEN) === CLOSE_FENCE) {
        depth--
        if (depth > 0) pos += CLOSE_LEN // skip inner closing fence
      } else {
        pos++
      }
    }

    // pos now points to the character after the final closing fence
    // The content of this block is from blockStart+OPEN_LEN to pos-CLOSE_LEN
    const blockContent = content.slice(blockStart + OPEN_LEN, pos - CLOSE_LEN)

    // Append opening fence + (escaped or original) content + closing fence
    const openFence = isHtml ? OPEN_HTML : OPEN_VUE
    if (/<(?:script|template|style)(\s|>)/i.test(blockContent)) {
      const escaped = blockContent
        .replace(/<script(\s|>)/gi, '&lt;script$1')
        .replace(/<\/script>/gi, '&lt;/script&gt;')
        .replace(/<template(\s|>)/gi, '&lt;template$1')
        .replace(/<\/template>/gi, '&lt;/template&gt;')
        .replace(/<style(\s|>)/gi, '&lt;style$1')
        .replace(/<\/style>/gi, '&lt;/style&gt;')
      resultParts.push(openFence, escaped, CLOSE_FENCE)
    } else {
      resultParts.push(openFence, blockContent, CLOSE_FENCE)
    }
  }

  return resultParts.join('')
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Replace ```vue with ```html to prevent Vue compilation
  content = content.replace(/```vue\n/g, '```html\n')

  // Escape TypeScript generics in prose text
  content = escapeTypeScriptGenerics(content)

  // Escape Vue SFC tags inside html/vue code blocks
  content = escapeVueSfcTagsInCodeBlocks(content)

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
