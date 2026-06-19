import request from '@/utils/request'

export function getRecordList(params) {
  return request({
    url: '/records',
    method: 'get',
    params
  })
}

export function borrowItem(data) {
  return request({
    url: '/records/borrow',
    method: 'post',
    data
  })
}

export function returnItem(data) {
  return request({
    url: '/records/return',
    method: 'post',
    data
  })
}

export function getRecordStats() {
  return request({
    url: '/records/stats',
    method: 'get'
  })
}
