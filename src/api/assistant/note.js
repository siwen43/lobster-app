import request from '@/utils/request'

export function listNote(query) {
  return request({
    url: '/assistant/note/list',
    method: 'get',
    params: query
  })
}

export function getNote(id) {
  return request({
    url: '/assistant/note/' + id,
    method: 'get'
  })
}

export function addNote(data) {
  return request({
    url: '/assistant/note',
    method: 'post',
    data: data
  })
}

export function updateNote(data) {
  return request({
    url: '/assistant/note',
    method: 'put',
    data: data
  })
}

export function delNote(id) {
  return request({
    url: '/assistant/note/' + id,
    method: 'delete'
  })
}
