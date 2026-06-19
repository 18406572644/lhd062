import request from '@/utils/request'

export function getItemList(params) {
  return request({
    url: '/items',
    method: 'get',
    params
  })
}

export function searchItems(keyword) {
  return request({
    url: '/items/search',
    method: 'get',
    params: { keyword }
  })
}

export function getCategories() {
  return request({
    url: '/items/categories',
    method: 'get'
  })
}

export function getExpiringItems(days) {
  return request({
    url: '/items/expiring',
    method: 'get',
    params: { days }
  })
}

export function getItemDetail(id) {
  return request({
    url: `/items/${id}`,
    method: 'get'
  })
}

export function createItem(data) {
  return request({
    url: '/items',
    method: 'post',
    data
  })
}

export function updateItem(id, data) {
  return request({
    url: `/items/${id}`,
    method: 'put',
    data
  })
}

export function deleteItem(id) {
  return request({
    url: `/items/${id}`,
    method: 'delete'
  })
}
