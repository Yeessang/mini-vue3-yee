import { hasOwn } from "../shared/index"

const PublicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
  $props: (i) => i.vnode.props
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    
    const { setupState, props } = instance
    // console.log(key, 'proxy', props[key])
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }
    const publicGetter = PublicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  }
}