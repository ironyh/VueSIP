import type { Component } from 'vue'

export type ExampleCategory = 'sip' | 'ami' | 'utility'

export interface CodeSnippet {
  title: string
  description: string
  code: string
}

export interface ExampleDefinition {
  id: string
  icon: string
  title: string
  description: string
  category: ExampleCategory
  tags: string[]
  component: Component
  setupGuide: string
  codeSnippets: CodeSnippet[]
}
