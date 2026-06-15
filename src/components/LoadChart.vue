<template>
  <div class="load-chart-container">
    <div class="chart-header">
      <h3>载荷分布图表</h3>
      <div class="chart-tabs">
        <button
          class="tab-btn"
          :class="{ active: chartType === 'deck' }"
          @click="chartType = 'deck'"
        >
          甲板载荷
        </button>
        <button
          class="tab-btn"
          :class="{ active: chartType === 'bar' }"
          @click="chartType = 'bar'"
        >
          舱位分布
        </button>
        <button
          class="tab-btn"
          :class="{ active: chartType === 'radar' }"
          @click="chartType = 'radar'"
        >
          均衡雷达
        </button>
        <button
          class="tab-btn"
          :class="{ active: chartType === 'compare' }"
          @click="chartType = 'compare'"
          :disabled="!recommendedBalance"
        >
          方案对比
        </button>
      </div>
    </div>
    <div class="chart-content">
      <v-chart
        v-if="chartType === 'deck'"
        :option="deckBarOption"
        :autoresize="true"
        class="chart"
      />
      <v-chart
        v-if="chartType === 'bar'"
        :option="barOption"
        :autoresize="true"
        class="chart"
      />
      <v-chart
        v-if="chartType === 'radar'"
        :option="radarOption"
        :autoresize="true"
        class="chart"
      />
      <v-chart
        v-if="chartType === 'compare' && recommendedBalance"
        :option="compareOption"
        :autoresize="true"
        class="chart"
      />
      <div v-if="chartType === 'compare' && !recommendedBalance" class="no-compare">
        <p>暂无对比数据</p>
        <p class="sub">请先生成推荐装载方案进行对比</p>
      </div>
    </div>
    <div class="chart-summary">
      <div class="summary-item">
        <span class="label">货物数量</span>
        <span class="value">{{ cargos.length }} 件</span>
      </div>
      <div class="summary-item">
        <span class="label">总载重</span>
        <span class="value" :class="{ danger: balance.loadPercentage > 100 }">
          {{ balance.totalWeight.toFixed(1) }} / {{ ship.maxLoad }} 吨
        </span>
      </div>
      <div class="summary-item">
        <span class="label">载重率</span>
        <span class="value" :class="getPercentageClass(balance.loadPercentage)">
          {{ balance.loadPercentage.toFixed(1) }}%
        </span>
      </div>
      <div class="summary-item">
        <span class="label">稳性评分</span>
        <span class="value" :class="getScoreClass(balance.stabilityScore)">
          {{ balance.stabilityScore.toFixed(0) }} 分
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useShipStore } from '@/stores/shipStore'
import { calculateHoldDistribution } from '@/utils/physics'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  RadarComponent
])

const store = useShipStore()
const { ship, cargos, balance, recommendedBalance, recommendedCargos, showComparison } = storeToRefs(store)

const chartType = ref<'deck' | 'bar' | 'radar' | 'compare'>('deck')

const holdDistribution = computed(() => calculateHoldDistribution(cargos.value, ship.value))
const recommendedHoldDistribution = computed(() => {
  if (!recommendedCargos.value) return null
  return calculateHoldDistribution(recommendedCargos.value, ship.value)
})

const deckBarOption = computed(() => {
  const decks = balance.value.deckLoads
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const item = params[0]
        const dl = decks[item.dataIndex]
        const ratio = (dl.load / dl.maxLoad * 100).toFixed(1)
        return `${item.name}<br/>载荷: <b>${dl.load.toFixed(1)}</b> / ${dl.maxLoad.toFixed(1)} 吨<br/>占比: <b>${ratio}%</b>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: decks.map((d) => d.deckName),
      axisLabel: {
        fontSize: 12,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '载荷 (吨)',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: decks.map((d, idx) => ({
          value: parseFloat(d.load.toFixed(1)),
          itemStyle: {
            color: d.overload ? '#ff4d4f' : d.load > d.maxLoad * 0.9 ? '#fa8c16' : ['#1890ff', '#52c41a', '#722ed1'][idx % 3]
          }
        })),
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => p.value > 0 ? p.value : '',
          fontSize: 11
        },
        markLine: {
          silent: true,
          data: decks.map((d, idx) => ({
            yAxis: parseFloat(d.maxLoad.toFixed(1)),
            lineStyle: { color: ['#1890ff', '#52c41a', '#722ed1'][idx % 3], type: 'dashed', width: 1 },
            label: { show: false }
          }))
        }
      }
    ]
  }
})

const barOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const item = params[0]
      return `${item.name}<br/>载荷: <b>${item.value.toFixed(1)}</b> 吨`
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: holdDistribution.value.map((d) => d.name),
    axisLabel: {
      rotate: 25,
      fontSize: 10,
      interval: 0
    }
  },
  yAxis: {
    type: 'value',
    name: '载荷 (吨)',
    nameTextStyle: { fontSize: 11 },
    axisLabel: { fontSize: 11 }
  },
  series: [
    {
      type: 'bar',
      data: holdDistribution.value.map((d, idx) => ({
        value: parseFloat(d.weight.toFixed(1)),
        itemStyle: {
          color: [
            '#4A90D9',
            '#E67E22',
            '#27AE60',
            '#8E44AD',
            '#C0392B',
            '#16A085'
          ][idx % 6]
        }
      })),
      barWidth: '50%',
      label: {
        show: true,
        position: 'top',
        formatter: (p: any) => (p.value > 0 ? p.value.toFixed(1) : ''),
        fontSize: 10
      }
    }
  ]
}))

const radarOption = computed(() => {
  const maxWeight = Math.max(
    ship.value.maxLoad / 3,
    ...holdDistribution.value.map((d) => d.weight),
    ...(recommendedHoldDistribution.value || []).map((d) => d.weight),
    10
  )

  const seriesData: any[] = [
    {
      value: holdDistribution.value.map((d) => parseFloat(d.weight.toFixed(2))),
      name: '当前方案',
      areaStyle: {
        color: 'rgba(74, 144, 217, 0.35)'
      },
      lineStyle: {
        color: '#4A90D9',
        width: 2
      },
      itemStyle: {
        color: '#4A90D9'
      },
      label: {
        show: true,
        formatter: (p: any) => (p.value > 0 ? p.value : ''),
        fontSize: 9,
        color: '#333'
      }
    }
  ]

  if (recommendedHoldDistribution.value) {
    seriesData.push({
      value: recommendedHoldDistribution.value.map((d) => parseFloat(d.weight.toFixed(2))),
      name: '推荐方案',
      areaStyle: {
        color: 'rgba(82, 196, 26, 0.2)'
      },
      lineStyle: {
        color: '#52c41a',
        width: 2,
        type: 'dashed'
      },
      itemStyle: {
        color: '#52c41a'
      }
    })
  }

  return {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      show: !!recommendedHoldDistribution.value,
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 }
    },
    radar: {
      indicator: holdDistribution.value.map((d) => ({
        name: d.name,
        max: Math.ceil(maxWeight / 10) * 10
      })),
      radius: '62%',
      center: ['50%', '50%'],
      axisName: {
        fontSize: 10
      },
      splitArea: {
        areaStyle: {
          color: ['#f8f9fa', '#eef1f5']
        }
      }
    },
    series: [
      {
        type: 'radar',
        data: seriesData
      }
    ]
  }
})

const compareOption = computed(() => {
  if (!recommendedBalance.value) return {}
  const metrics = [
    { name: '稳性评分', manual: balance.value.stabilityScore, rec: recommendedBalance.value.stabilityScore, max: 100 },
    { name: '横倾角(°)', manual: Math.abs(balance.value.leftRightTilt), rec: Math.abs(recommendedBalance.value.leftRightTilt), max: 15, lowerBetter: true },
    { name: '纵倾角(°)', manual: Math.abs(balance.value.frontBackTilt), rec: Math.abs(recommendedBalance.value.frontBackTilt), max: 15, lowerBetter: true },
    { name: '重心高(m)', manual: balance.value.centerOfGravity.z, rec: recommendedBalance.value.centerOfGravity.z, max: ship.value.hullDepth, lowerBetter: true },
    { name: '左右差(吨)', manual: Math.abs(balance.value.leftRightDiff), rec: Math.abs(recommendedBalance.value.leftRightDiff), max: ship.value.maxLoad * 0.3, lowerBetter: true },
    { name: '前后差(吨)', manual: Math.abs(balance.value.frontBackDiff), rec: Math.abs(recommendedBalance.value.frontBackDiff), max: ship.value.maxLoad * 0.4, lowerBetter: true }
  ]

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['当前方案', '推荐方案'],
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: metrics.map((m) => m.name),
      axisLabel: { fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '当前方案',
        type: 'bar',
        data: metrics.map((m) => parseFloat(m.manual.toFixed(2))),
        itemStyle: { color: '#1890ff' },
        barWidth: '30%',
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          formatter: (p: any) => p.value
        }
      },
      {
        name: '推荐方案',
        type: 'bar',
        data: metrics.map((m) => parseFloat(m.rec.toFixed(2))),
        itemStyle: { color: '#52c41a' },
        barWidth: '30%',
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          formatter: (p: any) => p.value
        }
      }
    ]
  }
})

function getPercentageClass(pct: number): string {
  if (pct > 100) return 'danger'
  if (pct > 90) return 'warning'
  return 'normal'
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'normal'
  if (score >= 60) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.load-chart-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.chart-header h3 {
  font-size: 15px;
  color: #333;
  margin: 0;
}

.chart-tabs {
  display: flex;
  gap: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.tab-btn {
  padding: 4px 10px;
  font-size: 12px;
  background: #fff;
  color: #666;
  border: none;
  border-right: 1px solid #d9d9d9;
  border-radius: 0;
  transition: all 0.2s;
}

.tab-btn:last-child {
  border-right: none;
}

.tab-btn.active {
  background: #1890ff;
  color: #fff;
}

.tab-btn:hover:not(.active):not(:disabled) {
  background: #f5faff;
  color: #1890ff;
}

.chart-content {
  flex: 1;
  padding: 10px;
  min-height: 0;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.no-compare {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.no-compare .sub {
  font-size: 12px;
  margin-top: 6px;
}

.chart-summary {
  display: flex;
  justify-content: space-around;
  padding: 10px 14px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.summary-item .label {
  font-size: 10px;
  color: #888;
}

.summary-item .value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.summary-item .value.danger {
  color: #ff4d4f;
}

.summary-item .value.warning {
  color: #fa8c16;
}

.summary-item .value.normal {
  color: #52c41a;
}
</style>
