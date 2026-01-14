<script setup lang="ts">
/**
 * IvrTree - Visual IVR menu tree component
 *
 * Displays the IVR navigation tree with interactive nodes,
 * expandable/collapsible branches, and current position highlighting.
 */
import { ref, computed, watch } from 'vue'
import type { IvrNode } from '@/composables/useIvrTester'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'

interface Props {
  /** Root node of the IVR tree */
  rootNode: IvrNode | null
  /** Currently active node ID */
  currentNodeId?: string | null
  /** Whether to show annotations */
  showAnnotations?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentNodeId: null,
  showAnnotations: true,
})

const emit = defineEmits<{
  /** Emitted when a node is clicked */
  (e: 'node-click', nodeId: string): void
  /** Emitted when annotation is updated */
  (e: 'annotate', nodeId: string, text: string): void
  /** Emitted when endpoint status changes */
  (e: 'mark-endpoint', nodeId: string, isEndpoint: boolean): void
}>()

// Local state
const expandedNodes = ref<Set<string>>(new Set())
const editingNodeId = ref<string | null>(null)
const annotationText = ref('')
const showAnnotationDialog = ref(false)

// Initialize all nodes as expanded
watch(
  () => props.rootNode,
  (root) => {
    if (root) {
      expandAll(root)
    }
  },
  { immediate: true }
)

/**
 * Expand all nodes recursively
 */
function expandAll(node: IvrNode): void {
  expandedNodes.value.add(node.id)
  for (const child of node.children.values()) {
    expandAll(child)
  }
}

/**
 * Toggle node expansion
 */
function toggleExpand(nodeId: string): void {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

/**
 * Check if node is expanded
 */
function isExpanded(nodeId: string): boolean {
  return expandedNodes.value.has(nodeId)
}

/**
 * Check if node is current
 */
function isCurrent(nodeId: string): boolean {
  return nodeId === props.currentNodeId
}

/**
 * Handle node click
 */
function handleNodeClick(nodeId: string): void {
  emit('node-click', nodeId)
}

/**
 * Open annotation dialog
 */
function openAnnotationDialog(node: IvrNode): void {
  editingNodeId.value = node.id
  annotationText.value = node.annotations ?? ''
  showAnnotationDialog.value = true
}

/**
 * Save annotation
 */
function saveAnnotation(): void {
  if (editingNodeId.value) {
    emit('annotate', editingNodeId.value, annotationText.value)
  }
  showAnnotationDialog.value = false
  editingNodeId.value = null
  annotationText.value = ''
}

/**
 * Toggle endpoint status
 */
function toggleEndpoint(node: IvrNode): void {
  emit('mark-endpoint', node.id, !node.isEndpoint)
}

/**
 * Get display label for node
 */
function getNodeLabel(node: IvrNode): string {
  if (node.dtmf === null) {
    return 'START'
  }
  return node.dtmf
}

/**
 * Get shortened prompt text
 */
function getPromptPreview(prompt: string, maxLength = 50): string {
  if (!prompt) return '(waiting for prompt...)'
  if (prompt.length <= maxLength) return prompt
  return `${prompt.slice(0, maxLength)}...`
}

/**
 * Get children as sorted array
 */
function getChildren(node: IvrNode): IvrNode[] {
  return Array.from(node.children.values()).sort((a, b) => {
    const aKey = a.dtmf ?? ''
    const bKey = b.dtmf ?? ''
    return aKey.localeCompare(bKey)
  })
}
</script>

<template>
  <div class="ivr-tree">
    <div v-if="!rootNode" class="empty-state">
      <i class="pi pi-sitemap" />
      <p>Start a test to build the IVR tree</p>
    </div>

    <div v-else class="tree-container">
      <!-- Recursive tree rendering -->
      <div class="tree-root">
        <template v-for="(node, _) in [rootNode]" :key="node.id">
          <div class="tree-node-wrapper">
            <!-- Node content -->
            <div
              class="tree-node"
              :class="{
                'is-current': isCurrent(node.id),
                'is-endpoint': node.isEndpoint,
                'has-children': node.children.size > 0,
              }"
              @click="handleNodeClick(node.id)"
            >
              <!-- Expand/collapse button -->
              <button
                v-if="node.children.size > 0"
                class="expand-btn"
                @click.stop="toggleExpand(node.id)"
              >
                <i :class="isExpanded(node.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
              </button>
              <span v-else class="expand-placeholder" />

              <!-- DTMF badge -->
              <span class="dtmf-badge" :class="{ 'is-root': node.dtmf === null }">
                {{ getNodeLabel(node) }}
              </span>

              <!-- Prompt text -->
              <span class="prompt-text">
                {{ getPromptPreview(node.prompt) }}
              </span>

              <!-- Status indicators -->
              <span v-if="node.isEndpoint" class="endpoint-badge">
                <i class="pi pi-flag" />
              </span>
              <span v-if="node.annotations" class="annotation-badge">
                <i class="pi pi-comment" />
              </span>

              <!-- Actions -->
              <div class="node-actions">
                <button
                  class="action-btn"
                  title="Add annotation"
                  @click.stop="openAnnotationDialog(node)"
                >
                  <i class="pi pi-pencil" />
                </button>
                <button
                  class="action-btn"
                  :class="{ active: node.isEndpoint }"
                  title="Mark as endpoint"
                  @click.stop="toggleEndpoint(node)"
                >
                  <i class="pi pi-flag" />
                </button>
              </div>
            </div>

            <!-- Annotation preview -->
            <div v-if="showAnnotations && node.annotations" class="annotation-preview">
              <i class="pi pi-comment" />
              {{ node.annotations }}
            </div>

            <!-- Children -->
            <div v-if="isExpanded(node.id) && node.children.size > 0" class="tree-children">
              <template v-for="child in getChildren(node)" :key="child.id">
                <IvrTreeNode
                  :node="child"
                  :current-node-id="currentNodeId"
                  :show-annotations="showAnnotations"
                  :expanded-nodes="expandedNodes"
                  @node-click="handleNodeClick"
                  @toggle-expand="toggleExpand"
                  @annotate="(id, text) => emit('annotate', id, text)"
                  @mark-endpoint="(id, val) => emit('mark-endpoint', id, val)"
                />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Annotation Dialog -->
    <Dialog
      v-model:visible="showAnnotationDialog"
      header="Add Annotation"
      :style="{ width: '400px' }"
      modal
    >
      <div class="annotation-form">
        <label for="annotation">Note for this menu option:</label>
        <InputText
          id="annotation"
          v-model="annotationText"
          class="w-full"
          placeholder="e.g., 'Press 1 for English'"
          autofocus
        />
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showAnnotationDialog = false" />
        <Button label="Save" icon="pi pi-check" @click="saveAnnotation" />
      </template>
    </Dialog>
  </div>
</template>

<script lang="ts">
/**
 * Recursive tree node component (defined inline for simplicity)
 */
import { defineComponent, type PropType } from 'vue'

export const IvrTreeNode = defineComponent({
  name: 'IvrTreeNode',
  props: {
    node: { type: Object as PropType<IvrNode>, required: true },
    currentNodeId: { type: String, default: null },
    showAnnotations: { type: Boolean, default: true },
    expandedNodes: { type: Object as PropType<Set<string>>, required: true },
  },
  emits: ['node-click', 'toggle-expand', 'annotate', 'mark-endpoint'],
  setup(props, { emit }) {
    const isExpanded = (nodeId: string) => props.expandedNodes.has(nodeId)
    const isCurrent = (nodeId: string) => nodeId === props.currentNodeId

    const getNodeLabel = (node: IvrNode): string => {
      if (node.dtmf === null) return 'START'
      return node.dtmf
    }

    const getPromptPreview = (prompt: string, maxLength = 50): string => {
      if (!prompt) return '(waiting for prompt...)'
      if (prompt.length <= maxLength) return prompt
      return `${prompt.slice(0, maxLength)}...`
    }

    const getChildren = (node: IvrNode): IvrNode[] => {
      return Array.from(node.children.values()).sort((a, b) => {
        const aKey = a.dtmf ?? ''
        const bKey = b.dtmf ?? ''
        return aKey.localeCompare(bKey)
      })
    }

    return {
      isExpanded,
      isCurrent,
      getNodeLabel,
      getPromptPreview,
      getChildren,
    }
  },
  template: `
    <div class="tree-node-wrapper">
      <div
        class="tree-node"
        :class="{
          'is-current': isCurrent(node.id),
          'is-endpoint': node.isEndpoint,
          'has-children': node.children.size > 0,
        }"
        @click="$emit('node-click', node.id)"
      >
        <button
          v-if="node.children.size > 0"
          class="expand-btn"
          @click.stop="$emit('toggle-expand', node.id)"
        >
          <i :class="isExpanded(node.id) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
        </button>
        <span v-else class="expand-placeholder" />

        <span class="dtmf-badge">
          {{ getNodeLabel(node) }}
        </span>

        <span class="prompt-text">
          {{ getPromptPreview(node.prompt) }}
        </span>

        <span v-if="node.isEndpoint" class="endpoint-badge">
          <i class="pi pi-flag" />
        </span>
        <span v-if="node.annotations" class="annotation-badge">
          <i class="pi pi-comment" />
        </span>

        <div class="node-actions">
          <button
            class="action-btn"
            title="Add annotation"
            @click.stop="$emit('annotate', node.id, node.annotations || '')"
          >
            <i class="pi pi-pencil" />
          </button>
          <button
            class="action-btn"
            :class="{ active: node.isEndpoint }"
            title="Mark as endpoint"
            @click.stop="$emit('mark-endpoint', node.id, !node.isEndpoint)"
          >
            <i class="pi pi-flag" />
          </button>
        </div>
      </div>

      <div v-if="showAnnotations && node.annotations" class="annotation-preview">
        <i class="pi pi-comment" />
        {{ node.annotations }}
      </div>

      <div v-if="isExpanded(node.id) && node.children.size > 0" class="tree-children">
        <IvrTreeNode
          v-for="child in getChildren(node)"
          :key="child.id"
          :node="child"
          :current-node-id="currentNodeId"
          :show-annotations="showAnnotations"
          :expanded-nodes="expandedNodes"
          @node-click="$emit('node-click', $event)"
          @toggle-expand="$emit('toggle-expand', $event)"
          @annotate="$emit('annotate', $event)"
          @mark-endpoint="$emit('mark-endpoint', $event)"
        />
      </div>
    </div>
  `,
})
</script>

<style scoped>
.ivr-tree {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.tree-container {
  padding: 16px;
  overflow-x: auto;
}

.tree-node-wrapper {
  margin-left: 20px;
  border-left: 1px solid var(--surface-300);
  padding-left: 12px;
}

.tree-root > .tree-node-wrapper {
  margin-left: 0;
  border-left: none;
  padding-left: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  background: var(--surface-100);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tree-node:hover {
  background: var(--surface-200);
}

.tree-node.is-current {
  background: var(--primary-100);
  border: 1px solid var(--primary-300);
}

.tree-node.is-endpoint {
  border-left: 3px solid var(--orange-500);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-color-secondary);
  border-radius: 4px;
}

.expand-btn:hover {
  background: var(--surface-300);
}

.expand-placeholder {
  width: 20px;
  height: 20px;
}

.dtmf-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: var(--primary-500);
  color: white;
  font-weight: 600;
  border-radius: 4px;
  font-size: 0.8rem;
}

.dtmf-badge.is-root {
  background: var(--gray-500);
}

.prompt-text {
  flex: 1;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endpoint-badge,
.annotation-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.7rem;
}

.endpoint-badge {
  background: var(--orange-100);
  color: var(--orange-600);
}

.annotation-badge {
  background: var(--blue-100);
  color: var(--blue-600);
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tree-node:hover .node-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--surface-200);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--surface-300);
  color: var(--text-color);
}

.action-btn.active {
  background: var(--orange-100);
  color: var(--orange-600);
}

.annotation-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  margin: 0 0 4px 48px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  background: var(--blue-50);
  border-radius: 4px;
}

.annotation-preview i {
  font-size: 0.7rem;
  color: var(--blue-500);
}

.tree-children {
  position: relative;
}

.annotation-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.annotation-form label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}
</style>
