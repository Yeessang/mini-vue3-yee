
export function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode
  const { props: nextProps } = nextVNode

  // * props 没变化，不需要更新
  if (prevProps === nextProps) return false
  // * 之前没有props，但是现在有props就需要更新，现在没有props就不需要更新
  if (!prevProps) return !!nextProps
  // * 之前有props，但是现在没有props，需要更新
  if (!nextProps) return true

  return hasPropsChanged(prevProps, nextProps)
  
}

function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)

  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }

  return false
}