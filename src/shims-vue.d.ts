/**
 * Vue single-file component type declarations.
 * Enables TypeScript to resolve .vue file imports.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
