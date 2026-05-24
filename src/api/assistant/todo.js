import request from '@/utils/request'

export function listTodo(query) {
  return request({
    url: '/assistant/todo/list',
    method: 'get',
    params: query
  })
}

export function getTodo(id) {
  return request({
    url: '/assistant/todo/' + id,
    method: 'get'
  })
}

export function addTodo(data) {
  return request({
    url: '/assistant/todo',
    method: 'post',
    data: data
  })
}

export function updateTodo(data) {
  return request({
    url: '/assistant/todo',
    method: 'put',
    data: data
  })
}

export function delTodo(id) {
  return request({
    url: '/assistant/todo/' + id,
    method: 'delete'
  })
}
