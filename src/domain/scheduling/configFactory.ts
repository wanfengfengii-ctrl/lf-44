import type { ScheduleConfig, ShipTask } from '@/types'

export function getDefaultScheduleConfig(): ScheduleConfig {
  return {
    berths: [
      { id: 'b1', name: '1号泊位', capacity: 10000, craneCount: 2, available: true },
      { id: 'b2', name: '2号泊位', capacity: 8000, craneCount: 2, available: true },
      { id: 'b3', name: '3号泊位', capacity: 15000, craneCount: 3, available: true }
    ],
    cranes: [
      { id: 'c1', name: '吊机A', maxLiftWeight: 50, efficiency: 1.0, currentBerthId: null },
      { id: 'c2', name: '吊机B', maxLiftWeight: 50, efficiency: 1.0, currentBerthId: null },
      { id: 'c3', name: '吊机C', maxLiftWeight: 80, efficiency: 0.9, currentBerthId: null },
      { id: 'c4', name: '吊机D', maxLiftWeight: 30, efficiency: 1.2, currentBerthId: null }
    ],
    shifts: [
      { id: 's1', name: '早班', startTime: 480, endTime: 960, workerCount: 20, efficiencyMultiplier: 1.0 },
      { id: 's2', name: '中班', startTime: 960, endTime: 1440, workerCount: 15, efficiencyMultiplier: 0.9 },
      { id: 's3', name: '夜班', startTime: 0, endTime: 480, workerCount: 10, efficiencyMultiplier: 0.75 }
    ],
    loadingOrderStrategy: 'priority',
    unloadingOrderStrategy: 'fragile_last',
    averageLiftTime: 8,
    queueBufferTime: 5,
    shipPreparationTime: 30
  }
}

export function getDefaultShipTasks(): ShipTask[] {
  return [
    {
      id: 'ship1',
      name: '东方号',
      arrivalTime: 60,
      scheduledDepartureTime: 540,
      requiredBerthCapacity: 8000,
      unloadCargos: [
        { id: 'u1', cargoId: 'c1', cargoName: '机械零件A', weight: 25, fragile: false, priority: 3, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u2', cargoId: 'c2', cargoName: '精密仪器', weight: 10, fragile: true, priority: 5, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u3', cargoId: 'c3', cargoName: '钢材', weight: 40, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 },
        { id: 'u4', cargoId: 'c4', cargoName: '木箱包装', weight: 15, fragile: true, priority: 4, operationType: 'unload', shipId: 'ship1', estimatedArrival: 0 }
      ],
      loadCargos: [
        { id: 'l1', cargoId: 'c5', cargoName: '集装箱1', weight: 30, fragile: false, priority: 2, operationType: 'load', shipId: 'ship1', estimatedArrival: 100 },
        { id: 'l2', cargoId: 'c6', cargoName: '集装箱2', weight: 35, fragile: false, priority: 3, operationType: 'load', shipId: 'ship1', estimatedArrival: 120 },
        { id: 'l3', cargoId: 'c7', cargoName: '陶瓷品', weight: 12, fragile: true, priority: 5, operationType: 'load', shipId: 'ship1', estimatedArrival: 150 }
      ]
    },
    {
      id: 'ship2',
      name: '远航号',
      arrivalTime: 200,
      scheduledDepartureTime: 720,
      requiredBerthCapacity: 12000,
      unloadCargos: [
        { id: 'u5', cargoId: 'c8', cargoName: '大型设备', weight: 60, fragile: false, priority: 4, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 },
        { id: 'u6', cargoId: 'c9', cargoName: '化工原料', weight: 45, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 },
        { id: 'u7', cargoId: 'c10', cargoName: '粮食袋', weight: 20, fragile: false, priority: 1, operationType: 'unload', shipId: 'ship2', estimatedArrival: 200 }
      ],
      loadCargos: [
        { id: 'l4', cargoId: 'c11', cargoName: '工程机械', weight: 55, fragile: false, priority: 4, operationType: 'load', shipId: 'ship2', estimatedArrival: 280 },
        { id: 'l5', cargoId: 'c12', cargoName: '纺织品', weight: 18, fragile: false, priority: 2, operationType: 'load', shipId: 'ship2', estimatedArrival: 300 },
        { id: 'l6', cargoId: 'c13', cargoName: '玻璃制品', weight: 8, fragile: true, priority: 5, operationType: 'load', shipId: 'ship2', estimatedArrival: 320 }
      ]
    },
    {
      id: 'ship3',
      name: '顺风号',
      arrivalTime: 400,
      scheduledDepartureTime: 900,
      requiredBerthCapacity: 6000,
      unloadCargos: [
        { id: 'u8', cargoId: 'c14', cargoName: '海鲜冷藏', weight: 22, fragile: true, priority: 5, operationType: 'unload', shipId: 'ship3', estimatedArrival: 400 },
        { id: 'u9', cargoId: 'c15', cargoName: '建材', weight: 38, fragile: false, priority: 2, operationType: 'unload', shipId: 'ship3', estimatedArrival: 400 }
      ],
      loadCargos: [
        { id: 'l7', cargoId: 'c16', cargoName: '电子产品', weight: 15, fragile: true, priority: 5, operationType: 'load', shipId: 'ship3', estimatedArrival: 480 },
        { id: 'l8', cargoId: 'c17', cargoName: '日用品', weight: 25, fragile: false, priority: 2, operationType: 'load', shipId: 'ship3', estimatedArrival: 500 },
        { id: 'l9', cargoId: 'c18', cargoName: '家具', weight: 32, fragile: false, priority: 3, operationType: 'load', shipId: 'ship3', estimatedArrival: 520 }
      ]
    }
  ]
}
