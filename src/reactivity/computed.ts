import { createDep } from './dep'
import { trackRefValue, triggerRefValue } from './ref'
import { ReactiveEffect, effect } from './effect'

export class ComputedRefImpl {
  public dep: any
  public effect
  private _dirty: boolean
  private _value: any
  constructor(getter) {
    this._dirty = true
    this.dep = createDep()
    this.effect = effect(getter, {
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true
          triggerRefValue(this)
        }
      },
      lazy: true
    })
  }

  get value() {
    trackRefValue(this)
    if (this._dirty) {
      this._value = this.effect()
      this._dirty = false
    }
    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}