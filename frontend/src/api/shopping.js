import request from '@/utils/request'

export function getShoppingLists() {
  return request({
    url: '/shopping',
    method: 'get'
  })
}

export function getShoppingList(id) {
  return request({
    url: `/shopping/${id}`,
    method: 'get'
  })
}

export function createShoppingList(data) {
  return request({
    url: '/shopping',
    method: 'post',
    data
  })
}

export function updateShoppingList(id, data) {
  return request({
    url: `/shopping/${id}`,
    method: 'put',
    data
  })
}

export function deleteShoppingList(id) {
  return request({
    url: `/shopping/${id}`,
    method: 'delete'
  })
}

export function addShoppingItem(listId, data) {
  return request({
    url: `/shopping/${listId}/items`,
    method: 'post',
    data
  })
}

export function batchAddShoppingItems(listId, items) {
  return request({
    url: `/shopping/${listId}/items/batch`,
    method: 'post',
    data: { items }
  })
}

export function updateShoppingItem(listId, itemId, data) {
  return request({
    url: `/shopping/${listId}/items/${itemId}`,
    method: 'put',
    data
  })
}

export function purchaseShoppingItem(listId, itemId, data) {
  return request({
    url: `/shopping/${listId}/items/${itemId}/purchase`,
    method: 'post',
    data
  })
}

export function deleteShoppingItem(listId, itemId) {
  return request({
    url: `/shopping/${listId}/items/${itemId}`,
    method: 'delete'
  })
}

export function generateShareCode(listId) {
  return request({
    url: `/shopping/${listId}/share`,
    method: 'post'
  })
}

export function getSharedList(code) {
  return request({
    url: `/shopping/share/${code}`,
    method: 'get'
  })
}

export function exportShoppingList(listId) {
  return request({
    url: `/shopping/${listId}/export`,
    method: 'get',
    responseType: 'blob'
  })
}

export function getShoppingStats(month) {
  return request({
    url: '/shopping/stats/monthly',
    method: 'get',
    params: { month }
  })
}

export function addFromExpiring(data) {
  return request({
    url: '/shopping/add-from-expiring',
    method: 'post',
    data
  })
}

export function addFromLowStock(data) {
  return request({
    url: '/shopping/add-from-low-stock',
    method: 'post',
    data
  })
}
