import request from '@/utils/request'

export function getTemplates() {
  return request({
    url: '/labels/templates',
    method: 'get'
  })
}

export function getTemplate(id) {
  return request({
    url: `/labels/templates/${id}`,
    method: 'get'
  })
}

export function createTemplate(data) {
  return request({
    url: '/labels/templates',
    method: 'post',
    data
  })
}

export function updateTemplate(id, data) {
  return request({
    url: `/labels/templates/${id}`,
    method: 'put',
    data
  })
}

export function deleteTemplate(id) {
  return request({
    url: `/labels/templates/${id}`,
    method: 'delete'
  })
}

export function generateLabels(data) {
  return request({
    url: '/labels/generate',
    method: 'post',
    data
  })
}
