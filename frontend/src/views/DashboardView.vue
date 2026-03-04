<template>
  <div class="jira-replica">
    <el-alert
      v-if="showBanner"
      title="Complete Component Library now available!"
      type="info"
      :closable="true"
      show-icon
      @close="showBanner = false"
      class="system-banner"
    />

    <section class="hero">
      <div>
        <h1>Jira Component Library</h1>
        <p>Atlassian 风格 UI 复刻页（当前为占位数据版本，用于先完整搭建交互壳层）。</p>
        <div class="crumb">Components / Jira Library</div>
      </div>
      <div class="hero-actions">
        <el-button>Search (⌘K)</el-button>
        <el-badge :value="3">
          <el-button :icon="Bell" circle />
        </el-badge>
        <el-button type="primary">Create</el-button>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="replica-tabs">
      <el-tab-pane label="Overview" name="overview">
        <section class="grid-4">
          <el-card v-for="card in metricCards" :key="card.title" shadow="never" class="metric-card">
            <div class="metric-icon" :style="{ background: card.tint }">{{ card.icon }}</div>
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
          </el-card>
        </section>

        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="block-title">Quick Start</div>
          </template>
          <el-alert title="Library Ready! All components are placeholders for now." type="success" :closable="false" />
          <div class="quick-grid">
            <div v-for="item in quickItems" :key="item.title" class="quick-item">
              <h4>{{ item.title }}</h4>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="block-card">
          <template #header>
            <div class="block-title">Core Issue Components</div>
          </template>
          <div class="issue-columns">
            <div>
              <h4 class="sub-title">Issue Cards</h4>
              <div class="issue-stack">
                <article v-for="issue in issues" :key="issue.key" class="issue-card">
                  <div class="issue-head">
                    <div class="issue-meta">
                      <span class="issue-type" :class="issue.type.toLowerCase()"></span>
                      <span>{{ issue.key }}</span>
                    </div>
                    <span class="priority">{{ issue.priority }}</span>
                  </div>
                  <h5>{{ issue.title }}</h5>
                  <div class="issue-foot">
                    <el-tag size="small" :type="issue.statusType">{{ issue.status }}</el-tag>
                    <el-avatar :size="24">{{ issue.assignee }}</el-avatar>
                  </div>
                </article>
              </div>
            </div>
            <div>
              <h4 class="sub-title">Status & Priority</h4>
              <div class="status-list">
                <div class="status-row"><el-tag>To Do</el-tag><span>待处理任务</span></div>
                <div class="status-row"><el-tag type="warning">In Progress</el-tag><span>进行中任务</span></div>
                <div class="status-row"><el-tag type="info">In Review</el-tag><span>待评审任务</span></div>
                <div class="status-row"><el-tag type="success">Done</el-tag><span>已完成任务</span></div>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Navigation" name="navigation">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">Navigation Hierarchy</div></template>
          <div class="nav-demo">
            <aside class="nav-tree">
              <div class="node root">Your work</div>
              <div class="node">Projects</div>
              <div class="children">
                <div class="node active">Project Alpha</div>
                <div class="children">
                  <div class="node">Board</div>
                  <div class="node">Backlog</div>
                  <div class="node">Timeline</div>
                  <div class="node">Reports</div>
                </div>
              </div>
              <div class="node">Dashboards</div>
              <div class="node">People</div>
            </aside>
            <div class="nav-preview">右侧内容区（占位）</div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Data Tables" name="data">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">Advanced Data Table</div></template>
          <el-table :data="tableData" border>
            <el-table-column prop="key" label="Issue" width="120" />
            <el-table-column prop="summary" label="Summary" />
            <el-table-column prop="assignee" label="Assignee" width="130" />
            <el-table-column prop="status" label="Status" width="120" />
            <el-table-column prop="priority" label="Priority" width="120" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Text Editor" name="editor">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">Rich Text Editor (Placeholder)</div></template>
          <div class="toolbar-placeholder">
            <el-button size="small">B</el-button>
            <el-button size="small"><i>I</i></el-button>
            <el-button size="small">Link</el-button>
            <el-button size="small">List</el-button>
          </div>
          <el-input type="textarea" :rows="10" placeholder="Start typing your content here..." />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Email" name="email">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">Email Template Gallery</div></template>
          <div class="mail-grid">
            <div v-for="template in mailTemplates" :key="template" class="mail-card">
              <div class="mail-thumb"></div>
              <h4>{{ template }}</h4>
              <p>邮件模板占位卡片</p>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Accordion" name="accordion">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">Accordion Showcase</div></template>
          <el-collapse v-model="openAccordions">
            <el-collapse-item name="1" title="Project Planning">
              <p class="accordion-text">占位内容：里程碑拆分、负责人、风险与依赖关系。</p>
            </el-collapse-item>
            <el-collapse-item name="2" title="Execution Tracking">
              <p class="accordion-text">占位内容：迭代进展、阻塞事项、吞吐与交付节奏。</p>
            </el-collapse-item>
            <el-collapse-item name="3" title="Release Readiness">
              <p class="accordion-text">占位内容：测试覆盖、发布清单、回滚预案。</p>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Messages" name="messages">
        <el-card shadow="never" class="block-card">
          <template #header><div class="block-title">System Messages</div></template>
          <div class="message-stack">
            <el-alert title="System Update: Maintenance at 2 AM." type="info" :closable="false" />
            <el-alert title="Storage Warning: approaching limit." type="warning" :closable="false" />
            <el-alert title="Service Disruption: API latency detected." type="error" :closable="false" />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Forms" name="forms">
        <div class="form-grid">
          <el-card shadow="never" class="block-card">
            <template #header><div class="block-title">Buttons</div></template>
            <div class="button-row">
              <el-button type="primary">Create Issue</el-button>
              <el-button>Cancel</el-button>
              <el-button text>More Actions</el-button>
            </div>
          </el-card>

          <el-card shadow="never" class="block-card">
            <template #header><div class="block-title">Controls</div></template>
            <div class="control-stack">
              <el-input placeholder="Search issues..." />
              <el-select placeholder="Select project">
                <el-option label="Project Alpha" value="a" />
                <el-option label="Project Beta" value="b" />
                <el-option label="Project Gamma" value="c" />
              </el-select>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Bell } from '@element-plus/icons-vue'

const showBanner = ref(true)
const activeTab = ref('overview')
const openAccordions = ref(['1'])

const metricCards = [
  { icon: '▦', title: '50+ Components', desc: 'Complete UI component library', tint: '#deebff' },
  { icon: '◫', title: 'Navigation', desc: 'Hierarchical navigation systems', tint: '#e3fcef' },
  { icon: '▤', title: 'Data Tables', desc: 'Advanced table components', tint: '#fff3e0' },
  { icon: '✎', title: 'Rich Editor', desc: 'Rich text editing capabilities', tint: '#ede7f6' },
]

const quickItems = [
  { title: 'Components', desc: 'Reusable UI components with consistent styling' },
  { title: 'Patterns', desc: 'Design patterns for complex interactions' },
  { title: 'Customizable', desc: 'Flexible components with configuration options' },
]

const issues = [
  { key: 'PROJ-123', title: 'Update user authentication flow', status: 'In Progress', statusType: 'warning', priority: 'High', assignee: 'JD', type: 'Story' },
  { key: 'PROJ-124', title: 'Fix login page responsiveness', status: 'To Do', statusType: '', priority: 'Medium', assignee: 'JS', type: 'Bug' },
]

const tableData = [
  { key: 'PROJ-101', summary: 'Design system migration', assignee: 'John', status: 'In Progress', priority: 'High' },
  { key: 'PROJ-102', summary: 'Landing page revamp', assignee: 'Alice', status: 'To Do', priority: 'Medium' },
  { key: 'PROJ-103', summary: 'Telemetry integration', assignee: 'Leo', status: 'Done', priority: 'Low' },
]

const mailTemplates = ['Sprint Update', 'Incident Notification', 'Weekly Digest', 'Release Notes']
</script>

<style scoped>
.jira-replica {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.system-banner {
  border-radius: 8px;
}

.hero {
  background: #ffffff;
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.hero h1 {
  margin: 0;
  font-size: 28px;
  color: #172b4d;
}

.hero p {
  margin: 6px 0 0;
  color: #5e6c84;
}

.crumb {
  margin-top: 8px;
  font-size: 12px;
  color: #5e6c84;
}

.hero-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

:deep(.replica-tabs .el-tabs__header) {
  margin-bottom: 12px;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.metric-card {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
}

.metric-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #172b4d;
}

.metric-card h3 {
  margin: 10px 0 0;
  color: #172b4d;
  font-size: 17px;
}

.metric-card p {
  margin: 6px 0 0;
  color: #5e6c84;
  font-size: 13px;
}

.block-card {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.block-title {
  font-weight: 600;
  color: #172b4d;
}

.quick-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.quick-item {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  padding: 12px;
  background: #fafbfc;
}

.quick-item h4 {
  margin: 0;
  color: #172b4d;
}

.quick-item p {
  margin: 6px 0 0;
  color: #5e6c84;
  font-size: 12px;
}

.issue-columns {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 12px;
}

.sub-title {
  margin: 0 0 8px;
  color: #42526e;
}

.issue-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.issue-card {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.issue-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5e6c84;
}

.issue-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.issue-type {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: #4bade8;
}

.issue-type.story {
  background: #63ba3c;
}

.issue-type.bug {
  background: #e34935;
}

.issue-card h5 {
  margin: 8px 0;
  color: #172b4d;
  font-size: 14px;
}

.issue-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  color: #5e6c84;
}

.nav-demo {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
}

.nav-tree {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  background: #fafbfc;
  padding: 10px;
}

.node {
  padding: 8px 10px;
  border-radius: 6px;
  color: #42526e;
}

.node.root {
  font-weight: 600;
  color: #172b4d;
}

.node.active {
  background: #deebff;
  color: #0052cc;
}

.children {
  margin-left: 14px;
}

.nav-preview {
  border: 1px dashed #c1c7d0;
  border-radius: 8px;
  min-height: 260px;
  display: grid;
  place-items: center;
  color: #7a869a;
}

.toolbar-placeholder {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.mail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.mail-card {
  border: 1px solid #dfe1e6;
  border-radius: 8px;
  padding: 10px;
}

.mail-thumb {
  height: 80px;
  background: linear-gradient(135deg, #deebff, #f4f5f7);
  border-radius: 6px;
}

.mail-card h4 {
  margin: 10px 0 0;
  color: #172b4d;
}

.mail-card p {
  margin: 6px 0 0;
  color: #5e6c84;
  font-size: 12px;
}

.message-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.accordion-text {
  margin: 0;
  color: #5e6c84;
  font-size: 13px;
  line-height: 1.6;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.button-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.control-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1200px) {
  .grid-4,
  .mail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .issue-columns,
  .form-grid,
  .nav-demo {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .grid-4,
  .quick-grid,
  .mail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
