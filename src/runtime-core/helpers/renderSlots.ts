import { createVNode, Fragment } from "../vnode"


export function renderSlots(slots, name: string, props = {}) {
  const slot = slots[name]
  console.log(`渲染插槽 slot --> ${name}`)
  if (slot) {
    const slotContent = slot(props)
    console.log(slotContent)
    return createVNode(Fragment, {}, slotContent)
  }
}