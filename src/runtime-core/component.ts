import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { initProps } from './componentProps'
import { shallowReadonly } from '../reactivity/reactive'
import { emit } from './componentEmit'
import { initSlots } from './componentSlot'
import { proxyRefs } from '../reactivity'

export function createComponentInstance(vnode, parentComponent) {
  const instance = {
    vnode,
    type: vnode.type,
    proxy: null,
    ctx: {},
    parent: parentComponent as any,
    setupState: {},
    provides: parentComponent ? parentComponent.provides : {},
    slots: {},
    isMounted: false,
    update: () => {},
    emit: () => {}
  }

  instance.ctx = {
    _: instance
  }

  instance.emit = emit.bind(null, instance) as any
  
  return instance
}


export function setupComponent(instance) {
  // * initProps
  initProps(instance, instance.vnode.props)
  // * initSlots
  initSlots(instance, instance.vnode.children)
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {

  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  const Component = instance.type


  const { setup } = Component

  if (setup) {
    setCurrentInstance(instance)
    
    const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
    
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = proxyRefs(setupResult)
  }

  finishComponentSetup(instance)
}


function finishComponentSetup(instance) {

  const Component = instance.type

  instance.render = Component.render
  if (!Component.render) {
    
  }
}

let currentInstance: any = {}

export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance) {
  currentInstance = instance
}