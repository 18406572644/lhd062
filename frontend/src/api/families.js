import request from '@/utils/request'

export function getFamilyList() {
  return request({
    url: '/families',
    method: 'get'
  })
}

export function getFamilyDetail(id) {
  return request({
    url: `/families/${id}`,
    method: 'get',
    headers: {
      'X-Family-ID': id
    }
  })
}

export function createFamily(data) {
  return request({
    url: '/families',
    method: 'post',
    data
  })
}

export function updateFamily(id, data) {
  return request({
    url: `/families/${id}`,
    method: 'put',
    data,
    headers: {
      'X-Family-ID': id
    }
  })
}

export function deleteFamily(id) {
  return request({
    url: `/families/${id}`,
    method: 'delete',
    headers: {
      'X-Family-ID': id
    }
  })
}

export function createInvitation(id, data) {
  return request({
    url: `/families/${id}/invite`,
    method: 'post',
    data,
    headers: {
      'X-Family-ID': id
    }
  })
}

export function joinFamilyByCode(data) {
  return request({
    url: '/families/join',
    method: 'post',
    data
  })
}

export function updateMemberRole(familyId, userId, role) {
  return request({
    url: `/families/${familyId}/members/${userId}/role`,
    method: 'put',
    data: { role },
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function transferFamily(familyId, newOwnerId) {
  return request({
    url: `/families/${familyId}/transfer`,
    method: 'post',
    data: { new_owner_id: newOwnerId },
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function removeMember(familyId, userId) {
  return request({
    url: `/families/${familyId}/members/${userId}`,
    method: 'delete',
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function leaveFamily(familyId, userId) {
  return request({
    url: `/families/${familyId}/members/${userId}`,
    method: 'delete',
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function revokeInvitation(familyId, invitationId) {
  return request({
    url: `/families/${familyId}/invitations/${invitationId}`,
    method: 'delete',
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function updateSharedBoxes(familyId, boxIds) {
  return request({
    url: `/families/${familyId}/share-boxes`,
    method: 'post',
    data: { box_ids: boxIds },
    headers: {
      'X-Family-ID': familyId
    }
  })
}

export function convertBoxesSpace(familyId, boxIds, toFamily) {
  return request({
    url: `/families/${familyId}/convert-boxes`,
    method: 'post',
    data: { box_ids: boxIds, to_family: toFamily },
    headers: {
      'X-Family-ID': familyId
    }
  })
}
