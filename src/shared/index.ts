export const extend = Object.assign

export const isObject = (value) => value !== null && typeof value === 'object'

export const hasChanged = (oldValue, newValue) => oldValue !== newValue && (oldValue === oldValue || newValue === newValue)

export const isArray = Array.isArray

export const isSymbol = (v) => typeof v === 'symbol'

export const hasOwn = (v: Object, key) => v.hasOwnProperty(key)

export const capital = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

const camelizeReg = /-(\w)/g
export const camelize = (v: string) => v.replace(camelizeReg, (_, c) => c ? c.toUpperCase() : "")

export const toHandlerKey = (s) => s ? "on" + capital(s) : ""

export const EMPTY_OBJ = {}