import { camelize, toHandlerKey } from "../shared/index"

export function emit(instance, event, ...args) {
  // console.log(instance, event)
  const props = instance.props

  const handleName = toHandlerKey(camelize(event))
  const handler = props[handleName]
  if (handler) {
    handler(...args)
  }
}