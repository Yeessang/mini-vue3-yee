import { createRenderer } from '../runtime-core/index'
function createElement(type) {
  return document.createElement(type)
}
const isOn = (key) => /^on[A-Z]/.test(key)
function patchProp(el, key, prevVal, newVal) {
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.removeEventListener(event, prevVal)
    el.addEventListener(event, newVal)
  } else {
    if (newVal === undefined || newVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, newVal)
    }
  }
}

function insert(el, container, anchor) {
  // console.log(el, container, anchor)
  // container.append(el)
  container.insertBefore(el, anchor)
}

function setElementText(el, text) {
  el.textContent = text
}

function remove(el) {
  const parentNode = el.parentNode
  if (parentNode) {
    parentNode.removeChild(el)
  }
}
let render: any = null

function ensureRender() {
  return (
    render || 
    (render = createRenderer({
      createElement,
      patchProp,
      insert,
      setElementText,
      remove
    }))
  )
}

export const createApp = (...args) => {
  return ensureRender().createApp(...args)
}

export * from '../runtime-core'