import { ShapeFlags } from '../shared/shapeFlags'
import { isArray } from '../shared/index'


export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    key: props?.key,
    shapeFlag: getShapeFlag(type),
    el: null,
    component: {}
  }

  if (isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }

  normalizeChildren(vnode, children)

  return vnode
}

export function normalizeChildren(vnode, children) {
  if (typeof children === 'object') {
    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {

    } else {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  }
}



function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}