import { extend, isArray } from '../shared/'
import { ITERATE_KEY } from './baseHandlers'
import { createDep } from './dep'

export const enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'DELETE'
}

export class ReactiveEffect {
  private _fn: any
  private deps: Array<any> = []
  private _active = true
  onStop?: () => void
  lazy = false
  constructor(fn) {
    this._fn = fn
  }
  run() {
    if (!this._active) return this._fn()
    if (!effectStack.includes(this)) {
      cleanupEffect(this)
      enableTrack()
      effectStack.push(activeEffect = this)
      

      const res = this._fn()

      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
      resetTrack()
      
      return res
    }
  }
  stop() {
    if (this._active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this._active = false
    }
  }
}

function cleanupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let dep of deps) {
      dep.delete(effect)
    }
    deps.length = 0
  }
}

export function stop(runner) {
  runner.effect.stop()
}

const targetMap = new WeakMap()

export function track(target, key) {
  if (!isTracking()) return
  // target --> key -- > set([effect])
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, depsMap = new Map())
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, dep = createDep())
  }
  trackEffects(dep)
} 

export function trackEffects(dep) {
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function trigger(target, key, type, newVal?) {
  // console.log('trigger[------------------------------]', target, key, type)
  const depsMap = targetMap.get(target) 
  if (!depsMap) return
  
  const dep = depsMap.get(key) || []
  const effectDep: Array<any> = []
  const targetIsArray = isArray(target)
  if (targetIsArray && key === 'length') {
    depsMap.forEach((effects, key) => {
      if (key >= newVal) {
        effectDep.push(...effects)
      }
    })
  } else {
    effectDep.push(...dep)
  }
  // * 由于对象存在添加删除属性，这种情况会影响对对象的keys遍历，以及key in obj，两种操作
  // * 所以设置了一个ITERATE_KEY 作为这种情况的依赖收集和触发响应的媒介
  if (type === TriggerType.ADD) {
    if (targetIsArray) {
      effectDep.push(...(depsMap.get('length') || []))
    } else {
      effectDep.push(...(depsMap.get(ITERATE_KEY) || []))
    }
  } 
  if (type === TriggerType.DELETE) {
    effectDep.push(...(depsMap.get(ITERATE_KEY) || []))
  }
  triggerEffects(createDep(effectDep))
}

export function triggerEffects(dep) {
  for (const effect of isArray(dep) ? dep : [...dep]) {
    // * 过滤掉当前运行的effect，是因为有可能在effect既读取，又进行设置的情况，所以需要过滤掉当前的effect
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler()
      } else {
        effect.run()
      }
    }
  }
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}


let shouldTrack = false
let trackStack: Array<any> = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTrack() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}
export function resetTrack() {
  const last = trackStack.pop()
  shouldTrack = last !== undefined ? last : true
}


let activeEffect
let effectStack: Array<any> = []

export function effect(fn, options = {}) {

  const _effect =  new ReactiveEffect(fn)

  extend(_effect, options)

  // * effect是否立即执行，该配置会在computed以及watch中存在
  if (!_effect.lazy) {
    _effect.run()
  }

  // * 设置effect的返回工作函数，以便方便调用，同时保留个链接到_effect实例身上
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner

} 