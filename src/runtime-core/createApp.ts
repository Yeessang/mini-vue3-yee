
import { createVNode } from './vnode'


export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        const vnode = createVNode(rootComponent)
        // console.log(vnode)
        render(vnode, rootContainer)
      }
    }
  }
}


