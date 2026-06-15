<template>
  <div class="load-chart-container">
    <div class="chart-header">
      <h3>载荷分布图表</h3>
      <div class="chart-tabs">
        <button
          class="tab-btn"
          :class="{ active: chartType === 'bar' }"
          @click="chartType = 'bar'"
        >
          柱状图
        </button>
        <button
          class="tab-btn"
          :class="{ active: chartType === 'pie' }"
          @click="chartType = 'pie'"
        >
          饼图
        </button>
        <button
          class="tab-btn"
          :class="{ active: chartType === 'radar' }"
          @click="chartType = 'radar'"
        >
          雷达图
        </button>
      </div>
    </div>
    <div class="chart-content">
      <v-chart
        v-if="chartType === 'bar'"
        :option="barOption"
        :autoresize="true"
        class="chart"
      />
      <v-chart
        v-if="chartType === 'pie'"
        :option="pieOption"
        :autoresize="true"
        class="chart"
      />
      <v-chart
        v-if="chartType === 'radar'"
        :option="radarOption"
        :autoresize="true"
        class="chart"
      />
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
const { ship, cargos, balance } = storeToRefs(store)

const chartType = ref<'bar' | 'pie' | 'radar'>('bar')

const holdDistribution = computed(() => calculateHoldDistribution(cargos.value, ship.value))

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
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: holdDistribution.value.map((d) => d.name),
    axisLabel: {
      rotate: 30,
      fontSize: 11,
      interval: 0
    }
  },
  yAxis: {
    type: 'value',
    name: '载荷 (吨)',
    nameTextStyle: {
      fontSize: 12
    },
    axisLabel: {
      fontSize: 11
    }
  },
  series: [
    {
      type: 'bar',
      data: holdDistribution.value.map((d, idx) => ({
        value: d.weight,
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
        fontSize: 11
      }
    }
  ]
}))

const pieOption = computed(() => {
  const data = holdDistribution.value
    .filter((d) => d.weight > 0)
    .map((d) => ({
      name: d.name,
      value: parseFloat(d.weight.toFixed(2))
    }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} 吨 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 11
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.length > 0
          ? data
          : [{ name: '暂无数据', value: 1, itemStyle: { color: '#ddd' } }]
      }
    ]
  }
})

const radarOption = computed(() => {
  const maxWeight = Math.max(
    ship.value.maxLoad / 3,
    ...holdDistribution.value.map((d) => d.weight),
    10
  )

  return {
    tooltip: {
      trigger: 'item'
    },
    radar: {
      indicator: holdDistribution.value.map((d) => ({
        name: d.name,
        max: Math.ceil(maxWeight / 10) * 10
      })),
      radius: '65%',
      center: ['50%', '55%'],
      axisName: {
        fontSize: 11
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
        data: [
          {
            value: holdDistribution.value.map((d) => parseFloat(d.weight.toFixed(2))),
            name: '载荷分布',
            areaStyle: {
              color: 'rgba(74, 144, 217, 0.3)'
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
              fontSize: 10,
              color: '#333'
            }
          }
        ]
      }
    ]
  }
})

function getPercentageClass(pct: number): string {
  if (pct > 100) return 'danger'
  if (pct > 90) return 'warning'
  return 'normal'
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
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.chart-header h3 {
  font-size: 16px;
  color: #333;
}

.chart-tabs {
  display: flex;
  gap: 0;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}

.tab-btn {
  padding: 5px 14px;
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

.tab-btn:hover:not(.active) {
  background: #f5faff;
  color: #1890ff;
}

.chart-content {
  flex: 1;
  padding: 12px;
  min-height: 0;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-summary {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-item .label {
  font-size: 11px;
  color: #888;
}

.summary-item .value {
  font-size: 16px;
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
