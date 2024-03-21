import { getCurrentInstance } from "./component";


export function provide(key, value) {
  const currentInstance = getCurrentInstance()
  if (currentInstance) {
    let { provides } = currentInstance

    const parentProvides = currentInstance.parent?.provides

    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    provides[key] = value
  }

}

export function inject(key, defaultVal?) {
  const currentInstance = getCurrentInstance()

  if (currentInstance) {
    const provides = currentInstance.parent?.provides

    if (key in provides) {
      return provides[key]
    } else if (defaultVal) {
      if (typeof defaultVal === 'function') {
        return defaultVal()
      } 
      return defaultVal
    }
  }
}