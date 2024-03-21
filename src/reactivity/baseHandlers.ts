import { pauseTracking, resetTrack, track, trigger, TriggerType } from './effect'
import { reactive, readonly, ReactiveFlags, toRaw, reactiveMap, readonlyMap, shallowReadonlyMap } from './reactive'
import { hasChanged, isArray, isObject, isSymbol } from '../shared/'

export const ITERATE_KEY = Symbol('iterate_key')



const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet= createGetter(true, true)

function createGetter(isReadonly = false, isShallow = false) {
  return function(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? isShallow
            ? shallowReadonlyMap
            : readonlyMap
          : reactiveMap
        ).get(target)
      ) {
      return target
    }
    if (isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    
    const res = Reflect.get(target, key)
    if (isSymbol(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, key)
    }

    
    if (isShallow) {
      return res
    }

    return isObject(res) 
      ? isReadonly 
        ? readonly(res) 
        : reactive(res) 
      : res
  }
}

function createSetter(isReadonly = false, isShallow = false) {
  return function(target, key, value, receiver) {

    const type = isArray(target) 
      ? Number(key) < target.length 
        ? TriggerType.SET
        : TriggerType.ADD
      : Object.prototype.hasOwnProperty.call(target, key) 
        ? TriggerType.SET 
        : TriggerType.ADD

    const oldValue = target[key]
    const res = Reflect.set(target, key, value)
    // * 由于继承的关系，如果实例访问原型上的属性（实例本身没有），这种情况设置实例的属性时，会触发实例的setter，和原型的setter
    // * 会触发两次，但是这种情况，原型上的receiver是实例的代理对象，所以可以根据这种情况去过滤到原型上的setter
    if (target === toRaw(receiver)) {
      // * 如果值没变化去触发依赖
      if (hasChanged(oldValue, value)) {
        trigger(target, key, type, value)
      }
    }
    return res
  }
}

const arrayInstrumentations = createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations = {};
  ['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originMethod = Array.prototype[method]
    instrumentations[method] = function(...args) {
      let res = originMethod.apply(this, args)

      if (res === false || res === -1) {
        return originMethod.apply(toRaw(this), args)
      } 
      return res
    }
  });
  ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
    const originMethod = Array.prototype[method]
    instrumentations[method] = function(...args) {
      pauseTracking()
      let res = originMethod.apply(this, args)
      resetTrack()
      return res
    }
  })
  return instrumentations
}

export const mutableHandlers = {
  get,
  set,
  has(target, key) {
    track(target, key)
    return Reflect.has(target, key)
  },
  ownKeys(target) {
    track(target, isArray(target) ? 'length' : ITERATE_KEY)
    return Reflect.ownKeys(target)
  },
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const res = Reflect.deleteProperty(target, key)

    if (res && hadKey) {
      trigger(target, key, TriggerType.DELETE)
    }
    return res
  }
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return true
  }
}

export const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set(target, key) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return true
  }
}