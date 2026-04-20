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
  /**
   * 'tabs' (default) renders the outer Demo/Code/Setup tab strip.
   * 'inline' flattens everything into a single scrolling column — use for
   * DemoShell-based demos where variants already carry source + state panels.
   */
  layout?: 'tabs' | 'inline'
}
