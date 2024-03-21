import { trackEffects, triggerEffects, isTracking } from './effect'
import { createDep } from './dep'
import { hasChanged, isObject } from '../shared'
import { reactive } from './reactive'


export class RefImpl {
  private _rawValue: any
  private _value: any
  public dep
  public __v_isRef = true
  constructor(value) {
    this._rawValue = value
    
    this._value = convert(value)

    this.dep = createDep()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(this._value, newValue)) {
      console.log('======= ref value change ======')
      this._value = convert(newValue)
      this._rawValue = newValue
      triggerRefValue(this)
    }
  }
}

export function ref(value) {
  return createRef(value)
}

export function createRef(value) {
  const refImpl = new RefImpl(value)
  return refImpl
}

export function convert(value) {
  return isObject(value) ? reactive(value) : value
}

export function triggerRefValue(ref) {
  triggerEffects(ref.dep)
}

export function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

export const shallowUnwrapHandlers = {
  get(target, key, receiver) {
    return unRef(Reflect.get(target, key, receiver))
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      return target[key].value = value
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

export function unRef(target) {
  return isRef(target) ? target.value : target
}

export function isRef(target) {
  return !!target.__v_isRef
}