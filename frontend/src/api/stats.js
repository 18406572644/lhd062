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
