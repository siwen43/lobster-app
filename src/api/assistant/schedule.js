import request from '@/utils/request'

export function listSchedule(query) {
  return request({
    url: '/assistant/schedule/list',
    method: 'get',
    params: query
  })
}

export function getSchedule(id) {
  return request({
    url: '/assistant/schedule/' + id,
    method: 'get'
  })
}

export function addSchedule(data) {
  return request({
    url: '/assistant/schedule',
    method: 'post',
    data: data
  })
}

export function updateSchedule(data) {
  return request({
    url: '/assistant/schedule',
    method: 'put',
    data: data
  })
}

export function delSchedule(id) {
  return request({
    url: '/assistant/schedule/' + id,
    method: 'delete'
  })
}
