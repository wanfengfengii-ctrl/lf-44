<template>
  <div class="visualization-panel">
    <div class="panel-header">
      <h3>模拟可视化</h3>
      <div class="status-indicator" :class="simulationStatus">
        <span class="dot"></span>
        {{ statusText }}
      </div>
    </div>

    <div v-if="!simulationResult" class="no-result">
      <div class="empty-icon">📊</div>
      <p>暂无模拟数据</p>
      <p class="sub">请完成配置后点击「开始模拟」</p>
    </div>

    <div v-else class="viz-content">
      <div class="viz-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="viz-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'timeline'" class="timeline-container">
          <div class="timeline-header">
            <div class="timeline-legend">
              <div class="legend-item"><span class="legend-color berthing"></span>靠泊</div>
              <div class="legend-item"><span class="legend-color unloading"></span>卸船</div>
              <div class="legend-item"><span class="legend-color loading"></span>装船</div>
              <div class="legend-item"><span class="legend-color departure"></span>离港</div>
            </div>
            <div class="time-range">
              作业时段: {{ formatTime(0) }} — {{ formatTime(simulationResult.totalSimulationTime) }}
            </div>
          </div>
          <v-chart
            v-if="simulationResult"
            :option="timelineOption"
            :autoresize="true"
            class="chart"
          />
        </div>

        <div v-if="activeTab === 'crane'" class="crane-container">
          <div class="utilization-summary">
            <div class="util-card" v-for="cu in simulationResult.craneUtilizations" :key="cu.craneId">
              <div class="util-title">{{ cu.craneName }}</div>
              <div class="util-value" :class="getUtilClass(cu.utilizationRate)">
                {{ (cu.utilizationRate * 100).toFixed(0) }}%
              </div>
              <div class="util-bar">
                <div
                  class="util-fill"
                  :class="getUtilClass(cu.utilizationRate)"
                  :style="{ width: (cu.utilizationRate * 100) + '%' }"
                ></div>
              </div>
              <div class="util-detail">
                <span>作业: {{ cu.operations }}次</span>
                <span>{{ cu.totalWeight.toFixed(0) }}T</span>
              </div>
            </div>
          </div>
          <v-chart
            v-if="simulationResult"
            :option="craneBarOption"
            :autoresize="true"
            class="chart"
          />
        </div>

        <div v-if="activeTab === 'gantt'" class="gantt-container">
          <v-chart
            v-if="simulationResult"
            :option="ganttOption"
            :autoresize="true"
            class="chart gantt-chart"
          />
        </div>

        <div v-if="activeTab === 'queue'" class="queue-container">
          <div class="queue-summary">
            <div class="stat-box">
              <div class="stat-label">平均排队时间</div>
              <div class="stat-value">{{ simulationResult.summary.averageQueueTime.toFixed(1) }} 分</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">拥堵节点数</div>
              <div class="stat-value" :class="{ warning: simulationResult.summary.congestionCount > 0 }">
                {{ simulationResult.summary.congestionCount }}
              </div>
            </div>
            <div class="stat-box">
              <div class="stat-label">平均吊机利用率</div>
              <div class="stat-value" :class="getUtilClass(simulationResult.summary.averageCraneUtilization)">
                {{ (simulationResult.summary.averageCraneUtilization * 100).toFixed(0) }}%
              </div>
            </div>
          </div>

          <div v-if="simulationResult.congestionPoints.length > 0" class="congestion-list">
            <div class="section-title">拥堵详情</div>
            <div
              v-for="(cp, idx) in simulationResult.congestionPoints"
              :key="idx"
              class="congestion-item"
              :class="cp.severity"
            >
              <div class="cong-header">
                <span class="cong-type">{{ cp.type === 'berth' ? '泊位' : cp.type === 'crane' ? '吊机' : '队列' }}</span>
                <span class="cong-name">{{ cp.name }}</span>
                <span class="cong-severity">{{ severityText(cp.severity) }}</span>
              </div>
              <div class="cong-detail">
                {{ formatTime(cp.startTime) }} — {{ formatTime(cp.endTime) }} (持续 {{ cp.duration }}分钟)
              </div>
              <div class="cong-ships">
                影响船舶: {{ cp.affectedShips.join(', ') }}
              </div>
            </div>
          </div>

          <v-chart
            v-if="simulationResult"
            :option="queueBarOption"
            :autoresize="true"
            class="chart"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, CustomChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useSchedulingStore } from '@/stores/schedulingStore'
import { formatTime } from '@/utils/scheduling'
import type { SimulationStatus } from '@/types'

use([
  CanvasRenderer,
  BarChart,
  CustomChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  VisualMapComponent
])

const store = useSchedulingStore()
const { simulationResult, simulationStatus } = storeToRefs(store)

const tabs = [
  { key: 'timeline', label: '作业时间线' },
  { key: 'gantt', label: '步骤甘特图' },
  { key: 'crane', label: '设备利用率' },
  { key: 'queue', label: '拥堵分析' }
]

const activeTab = ref('timeline')

watch(
  simulationStatus,
  () => {
    if (simulationResult.value && activeTab.value === '') {
      activeTab.value = 'timeline'
    }
  }
)

const statusText = computed(() => {
  const map: Record<SimulationStatus, string> = {
    idle: '未开始',
    running: '模拟中...',
    paused: '已暂停',
    completed: '已完成'
  }
  return map[simulationStatus.value]
})

function getUtilClass(rate: number): string {
  if (rate >= 0.85) return 'high'
  if (rate >= 0.6) return 'medium'
  return 'low'
}

function severityText(s: string): string {
  return { low: '轻度', medium: '中度', high: '严重' }[s] || s
}

const opColors: Record<string, string> = {
  berthing: '#1e3a5f',
  unloading: '#fa8c16',
  loading: '#1890ff',
  departure: '#52c41a'
}

const timelineOption = computed(() => {
  if (!simulationResult.value) return {}
  const result = simulationResult.value
  const yData: string[] = []
  const seriesData: any[] = []

  for (const bo of result.berthOccupancies) {
    yData.push(bo.berthName)
    for (const interval of bo.intervals) {
      seriesData.push({
        name: bo.berthName,
        value: [
          yData.indexOf(bo.berthName),
          interval.startTime,
          interval.endTime,
          interval.endTime - interval.startTime,
          interval.operationType,
          interval.shipName
        ],
        itemStyle: {
          color: opColors[interval.operationType] || '#999',
          opacity: 0.85
        }
      })
    }
  }

  return {
    tooltip: {
      formatter: (params: any) => {
        const data = params.value
        const opName: Record<string, string> = {
          berthing: '靠泊准备',
          unloading: '卸船作业',
          loading: '装船作业',
          departure: '离港准备'
        }
        return `
          <div style="font-weight:600;margin-bottom:4px;">${data[5]}</div>
          <div>泊位: ${params.name}</div>
          <div>作业: ${opName[data[4]] || data[4]}</div>
          <div>开始: ${formatTime(data[1])}</div>
          <div>结束: ${formatTime(data[2])}</div>
          <div>时长: ${data[3]} 分钟</div>
        `
      }
    },
    grid: {
      left: '8%',
      right: '4%',
      top: '10%',
      bottom: '18%',
      containLabel: false
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: result.totalSimulationTime,
      axisLabel: {
        formatter: (v: number) => formatTime(v),
        fontSize: 10
      },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
    },
    yAxis: {
      type: 'category',
      data: yData,
      inverse: true,
      axisLabel: {
        fontSize: 11
      },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#f0f0f0' } }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        height: 16,
        bottom: 8
      }
    ],
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const categoryIndex = api.value(0)
          const start = api.coord([api.value(1), categoryIndex])
          const end = api.coord([api.value(2), categoryIndex])
          const height = api.size([0, 1])[1] * 0.7
          const rectShape = {
            x: start[0],
            y: start[1] - height / 2,
            width: Math.max(end[0] - start[0], 2),
            height
          }
          const data = params.data
          return {
            type: 'rect',
            transition: ['shape'],
            shape: rectShape,
            style: data?.itemStyle || {}
          }
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        data: seriesData
      }
    ]
  }
})

const ganttOption = computed(() => {
  if (!simulationResult.value) return {}
  const result = simulationResult.value
  const sortedSteps = [...result.operationSteps].sort((a, b) => a.startTime - b.startTime)

  const shipNames = Array.from(new Set(sortedSteps.map((s) => s.shipName)))
  const yData = shipNames

  const seriesData: any[] = sortedSteps.map((step) => {
    const yIdx = yData.indexOf(step.shipName)
    return {
      name: step.cargoName,
      value: [
        yIdx,
        step.startTime,
        step.endTime,
        step.endTime - step.startTime,
        step.operationType,
        step.cargoName,
        step.weight,
        step.craneName,
        step.berthName
      ],
      itemStyle: {
        color: step.operationType === 'load' ? '#1890ff' : '#fa8c16',
        opacity: 0.9
      }
    }
  })

  return {
    tooltip: {
      formatter: (params: any) => {
        const data = params.value
        return `
          <div style="font-weight:600;margin-bottom:4px;">${data[5]} (${data[6]}T)</div>
          <div>船舶: ${params.name}</div>
          <div>操作: ${data[4] === 'load' ? '装船' : '卸船'}</div>
          <div>泊位: ${data[8]}</div>
          <div>吊机: ${data[7]}</div>
          <div>开始: ${formatTime(data[1])}</div>
          <div>结束: ${formatTime(data[2])}</div>
          <div>时长: ${data[3]} 分钟</div>
        `
      }
    },
    grid: {
      left: '10%',
      right: '4%',
      top: '6%',
      bottom: '18%'
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: result.totalSimulationTime,
      axisLabel: {
        formatter: (v: number) => formatTime(v),
        fontSize: 10
      },
      splitLine: { show: true, lineStyle: { type: 'dashed', color: '#eee' } }
    },
    yAxis: {
      type: 'category',
      data: yData,
      inverse: true,
      axisLabel: { fontSize: 11 }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100,
        height: 16,
        bottom: 8
      }
    ],
    series: [
      {
        type: 'custom',
        renderItem: (params: any, api: any) => {
          const categoryIndex = api.value(0)
          const start = api.coord([api.value(1), categoryIndex])
          const end = api.coord([api.value(2), categoryIndex])
          const height = api.size([0, 1])[1] * 0.55
          const rectShape = {
            x: start[0],
            y: start[1] - height / 2,
            width: Math.max(end[0] - start[0], 2),
            height
          }
          const data = params.data
          return {
            type: 'rect',
            shape: rectShape,
            style: {
              ...(data?.itemStyle || {}),
              stroke: '#fff',
              lineWidth: 1
            }
          }
        },
        encode: { x: [1, 2], y: 0 },
        data: seriesData
      }
    ]
  }
})

const craneBarOption = computed(() => {
  if (!simulationResult.value) return {}
  const result = simulationResult.value
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p1 = params[0]
        const p2 = params[1]
        return `
          <div style="font-weight:600;">${p1.name}</div>
          <div>工作时间: ${p1.value} 分钟 (${((p1.value / (p1.value + (p2?.value || 0))) * 100).toFixed(0)}%)</div>
          <div>空闲时间: ${p2?.value || 0} 分钟</div>
        `
      }
    },
    legend: {
      data: ['工作时间', '空闲时间'],
      bottom: 2,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: result.craneUtilizations.map((c) => c.craneName),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '工作时间',
        type: 'bar',
        stack: 'total',
        data: result.craneUtilizations.map((c) => c.totalWorkTime),
        itemStyle: { color: '#1890ff' },
        barWidth: '30%',
        label: {
          show: true,
          position: 'inside',
          formatter: (p: any) => p.value > 20 ? p.value : '',
          fontSize: 9,
          color: '#fff'
        }
      },
      {
        name: '空闲时间',
        type: 'bar',
        stack: 'total',
        data: result.craneUtilizations.map((c) => c.totalIdleTime),
        itemStyle: { color: '#f0f0f0' },
        barWidth: '30%'
      }
    ]
  }
})

const queueBarOption = computed(() => {
  if (!simulationResult.value) return {}
  const result = simulationResult.value
  const shipMap = new Map<string, { wait: number; count: number; name: string }>()

  for (const step of result.operationSteps) {
    const key = step.shipId
    if (!shipMap.has(key)) {
      shipMap.set(key, { wait: 0, count: 0, name: step.shipName })
    }
    const entry = shipMap.get(key)!
    entry.wait += step.queueWaitTime
    entry.count += 1
  }

  const entries = Array.from(shipMap.values())

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const entry = entries[p.dataIndex]
        return `
          <div style="font-weight:600;">${entry.name}</div>
          <div>总等待时间: ${p.value} 分钟</div>
          <div>作业次数: ${entry.count} 次</div>
          <div>平均等待: ${(entry.wait / entry.count).toFixed(1)} 分钟</div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: entries.map((e) => e.name),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '排队时间(分)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        type: 'bar',
        data: entries.map((e, idx) => ({
          value: parseFloat(e.wait.toFixed(1)),
          itemStyle: {
            color: e.wait / e.count > 10 ? '#ff4d4f' : e.wait / e.count > 5 ? '#fa8c16' : ['#52c41a', '#1890ff', '#722ed1'][idx % 3]
          }
        })),
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          formatter: (p: any) => p.value
        }
      }
    ]
  }
})
</script>

<style scoped>
.visualization-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
}

.panel-header h3 {
  font-size: 15px;
  color: #333;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  background: #f5f5f5;
  color: #666;
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #bfbfbf;
}

.status-indicator.idle .dot { background: #bfbfbf; }
.status-indicator.running .dot { background: #1890ff; animation: pulse 1s infinite; }
.status-indicator.paused .dot { background: #fa8c16; }
.status-indicator.completed .dot { background: #52c41a; }

.status-indicator.running { background: #e6f7ff; color: #1890ff; }
.status-indicator.paused { background: #fff7e6; color: #fa8c16; }
.status-indicator.completed { background: #f6ffed; color: #52c41a; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.no-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  padding: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-result p {
  margin: 2px 0;
  font-size: 13px;
}

.no-result .sub {
  font-size: 11px;
  color: #bbb;
}

.viz-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.viz-tabs {
  display: flex;
  gap: 0;
  padding: 8px 12px 0;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
  overflow-x: auto;
}

.viz-tab {
  padding: 6px 14px;
  font-size: 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.viz-tab:hover {
  color: #1890ff;
}

.viz-tab.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  font-weight: 600;
}

.tab-content {
  flex: 1;
  padding: 10px;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.timeline-container,
.crane-container,
.gantt-container,
.queue-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px 10px;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.timeline-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #666;
}

.legend-color {
  width: 14px;
  height: 10px;
  border-radius: 2px;
}

.legend-color.berthing { background: #1e3a5f; }
.legend-color.unloading { background: #fa8c16; }
.legend-color.loading { background: #1890ff; }
.legend-color.departure { background: #52c41a; }

.time-range {
  font-size: 11px;
  color: #999;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 200px;
}

.gantt-chart {
  min-height: 280px;
}

.utilization-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.util-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px 10px;
}

.util-title {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.util-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.util-value.high { color: #52c41a; }
.util-value.medium { color: #1890ff; }
.util-value.low { color: #fa8c16; }

.util-bar {
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.util-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

.util-fill.high { background: #52c41a; }
.util-fill.medium { background: #1890ff; }
.util-fill.low { background: #fa8c16; }

.util-detail {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: #999;
}

.queue-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.stat-box {
  background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 8px 10px;
  text-align: center;
}

.stat-label {
  font-size: 10px;
  color: #8c8c8c;
  margin-bottom: 3px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #389e0d;
}

.stat-value.warning {
  color: #fa8c16;
}

.stat-value.high { color: #52c41a; }
.stat-value.medium { color: #1890ff; }
.stat-value.low { color: #fa8c16; }

.congestion-list {
  margin-bottom: 10px;
  flex-shrink: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.congestion-item {
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 11px;
}

.congestion-item.low {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}

.congestion-item.medium {
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #d46b08;
}

.congestion-item.high {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
}

.cong-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  font-weight: 600;
}

.cong-type {
  font-size: 9px;
  padding: 0 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.cong-severity {
  margin-left: auto;
  font-size: 10px;
}

.cong-detail,
.cong-ships {
  font-size: 10px;
  opacity: 0.85;
  margin-top: 1px;
}
</style>
