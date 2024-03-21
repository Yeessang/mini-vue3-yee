
import { track, trigger } from './effect'
import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}

export const reactiveMap = new WeakMap()
export const readonlyMap = new WeakMap()
export const shallowReadonlyMap = new WeakMap()

function createReactive(target, proxyMap, baseHandlers) {

  const existingProxy = proxyMap.get(target)
  if (existingProxy) return existingProxy

  const proxy = new Proxy(target, baseHandlers)

  proxyMap.set(target, proxy)
  return proxy
}

export function reactive(raw) {
  return createReactive(raw, reactiveMap, mutableHandlers)
}

export function readonly(raw) {
  return createReactive(raw, readonlyMap, readonlyHandlers)
}

export function shallowReadonly(raw) {
  return createReactive(raw, shallowReadonlyMap, shallowReadonlyHandlers)
}

export function isReactive(target) {
  return !!target[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(target) {
  return !!target[ReactiveFlags.IS_READONLY]
}

export function isProxy(target) {
  return isReactive(target) || isReadonly(target)
}

export function toRaw(target) {
  if (!target[ReactiveFlags.RAW]) return target
  return target[ReactiveFlags.RAW]
}