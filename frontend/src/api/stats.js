import request from '@/utils/request'

export function getOverview() {
  return request({
    url: '/stats/overview',
    method: 'get'
  })
}

export function getByCategory() {
  return request({
    url: '/stats/by-category',
    method: 'get'
  })
}

export function getByBox() {
  return request({
    url: '/stats/by-box',
    method: 'get'
  })
}

export function getRecordTrend(days) {
  return request({
    url: '/stats/record-trend',
    method: 'get',
    params: { days }
  })
}

export function getLocationStats() {
  return request({
    url: '/stats/location-stats',
    method: 'get'
  })
}

export function getUsageFrequency(days = 30) {
  return request({
    url: '/stats/usage-frequency',
    method: 'get',
    params: { days }
  })
}

export function getSpaceUtilization() {
  return request({
    url: '/stats/space-utilization',
    method: 'get'
  })
}

export function getHeatmapData(weeks = 4) {
  return request({
    url: '/stats/heatmap-data',
    method: 'get',
    params: { weeks }
  })
}

export function getSeasonalAnalysis() {
  return request({
    url: '/stats/seasonal-analysis',
    method: 'get'
  })
}

export function getSmartSuggestions(days = 30) {
  return request({
    url: '/stats/smart-suggestions',
    method: 'get',
    params: { days }
  })
}
