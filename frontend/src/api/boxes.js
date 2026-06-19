import request from '@/utils/request'

export function getBoxList(params) {
  return request({
    url: '/boxes',
    method: 'get',
    params
  })
}

export function getAllBoxes() {
  return request({
    url: '/boxes/all',
    method: 'get'
  })
}

export function getBoxDetail(id) {
  return request({
    url: `/boxes/${id}`,
    method: 'get'
  })
}

export function createBox(data) {
  return request({
    url: '/boxes',
    method: 'post',
    data
  })
}

export function updateBox(id, data) {
  return request({
    url: `/boxes/${id}`,
    method: 'put',
    data
  })
}

export function deleteBox(id) {
  return request({
    url: `/boxes/${id}`,
    method: 'delete'
  })
}

export function uploadBoxImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  return request({
    url: '/boxes/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
