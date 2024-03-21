import { createComponentInstance, setupComponent } from './component'
import { ShapeFlags } from '../shared/shapeFlags'
import { Fragment, Text } from './vnode'
import { createAppAPI } from './createApp'
import { effect } from '../reactivity'
import { EMPTY_OBJ } from '../shared'
import { shouldUpdateComponent } from './componentRenderUtil'
import { queueJob } from './scheduler'


export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    setElementText: hostSetElementText,
    remove: hostRemove
  } = options
  function render(vnode, container) {
    patch(null, vnode, container, null, null)
  }
  
  
  function patch(
    n1, 
    n2, 
    container,
    anchor = null, 
    parentComponent
  ) {
    const { shapeFlag, type } = n2
    
    switch(type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break;
      case Text: 
        processText(n1, n2, container)
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
    }
  }
  
  function processText(n1, n2, container) {
    if (!n1) {
      container.append(n2.children)
    }
  }
  
  function processFragment(n1, n2, container, parentComponent) {
    if (!n1) {
      mountChildren(n2, container, parentComponent)
    } else {
      
    }
  }
  
  function processElement(n1, n2, container, anchor, parentComponent) {
    if (!n1) {
      mountElement(n2, container, anchor, parentComponent)
    } else {
      patchElement(n1, n2, container, anchor, parentComponent)
    }
  }

  function patchElement(n1, n2, container, anchor, parentComponent) {
    console.log("patch-element  n1", n1)
    console.log("patch-element  n2", n2)
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    const el = (n2.el = n1.el)
    patchProps(el, oldProps, newProps)

    patchChildren(n1, n2, el, anchor, parentComponent)
  }
  
  function patchProps(el, oldProps, newProps) {
    // console.log(oldProps, newProps, 'patchProps')
    for (const key in newProps) {
      const prevProp = oldProps[key]
      const newProp = newProps[key]
      if (prevProp !== newProp) {
        hostPatchProp(el, key, prevProp, newProp)
      }
    }
    for (const key in oldProps) {
      const prevProp = oldProps[key];
      const nextProp = null;
      if (!(key in newProps)) {
        // 这里是以 oldProps 为基准来遍历，
        // 而且得到的值是 newProps 内没有的
        // 所以交给 host 更新的时候，把新的值设置为 null
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }
  }

  function patchChildren(n1, n2, container, anchor, parentComponent) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1
    const { shapeFlag, children: c2 } = n2
    console.log('patchChildren', n1, n2)
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (c2 !== c1) {
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(c1, c2, container, anchor, parentComponent)
        }
      }
    }
  }

  // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  //   console.log('patchKeyedChildren')
  //   console.log('n1', c1)
  //   console.log('n2', c2)
  //   console.log('anchor', parentAnchor)
  //   let i = 0
  //   const l2 = c2.length
  //   let e1 = c1.length - 1
  //   let e2 = l2 - 1
  //   console.log(i, e1, e2)
  //   const isSameVNodeType = (n1, n2) => {
  //     return n1.type === n2.type && n1.key === n2.key
  //   }

  //   // * 1. 从新老children的头部进行对比
  //   // * 相同则patch更新，不同则进入下一步
  //   while (i <= e1 && i <= e2) {
  //     const prevChild = c1[i]
  //     const nextChild = c2[i]
  //     if (!isSameVNodeType(prevChild, nextChild)) {
  //       console.log('新老孩子头部对比不是同类型vnode')
  //       console.log('prevChild', prevChild)
  //       console.log('nextChild', nextChild)
  //       break
  //     }
  //     patch(prevChild, nextChild, container, parentAnchor, parentComponent)
  //     i++
  //   } 

  //   // * 2. 从新老children的尾部进行对比
  //   // * 相同则patch更新，不同则进入下一步
  //   while (i <= e1 && i <= e2) {
  //     const prevChild = c1[e1]
  //     const nextChild = c2[e2]
  //     if (!isSameVNodeType(prevChild, nextChild)) {
  //       console.log('新老孩子尾部对比不是同类型vnode')
  //       console.log('prevChild', prevChild)
  //       console.log('nextChild', nextChild)
  //       break
  //     }
  //     patch(prevChild, nextChild, container, parentAnchor, parentComponent)
  //     e1--
  //     e2--
  //   }
  //   console.log(i, e1, e2)
  //   // * 3. 检查老的children是否diff完，如果老的diff完，并且新的children存在没diff的
  //   // * 也就是需要新增的节点
  //   if (i > e1 && i <= e2) {
  //     const nextPos = e2 + 1
  //     const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor  
  //     while (i <= e2) {
  //       console.log(`创建新的child节点：key --> ${c2[i].key}`)
  //       patch(
  //         null,
  //         c2[i],
  //         container,
  //         anchor,
  //         parentComponent
  //       )
  //       i++
  //     }
  //   } 
  //   // * 4. 检查老的children是否diff完，如果老的没diff完，并且新的children已经diff完成
  //   // * 此时就需要删除掉旧的节点
  //   else if (i <= e1 && i > e2) {
  //     while (i <= e1) {
  //       console.log(`删除旧的child节点：key --> ${c1[i].key}`)
  //       hostRemove(c1[i].el)
  //       i++
  //     }
  //   }

  //   else {
  //     // debugger
  //     // * 5. 此时从头部以及从尾部的diff完成，剩下的只是新老children节点的中间未知序列部分
  //     // * 接下来就是处理未知序列部分
  //     const s1 = i // * 老孩子的未知序列起始索引
  //     const s2 = i // * 新孩子的未知序列起始所以
  //     // * 5.1 构建新孩子的key与新index的索引图
  //     const keyToNewIndexMap = new Map()
  //     for (i = s2; i <= e2; i++) {
  //       keyToNewIndexMap.set(c2[i].key, i)
  //     }

  //     // * 5.2 遍历老孩子的序列，找到匹配的节点更新，删除不存在新孩子中的节点，判断是否有节点移动
  //     let patched = 0 // * 新序列已经更新的数量
  //     const toBePatched = e2 - s2 + 1 // * 新孩子需要更新的数量
  //     let moved = false // * 判断是否需要移动
  //     let maxNewIndexSoFar = 0 // * 跟踪判断是否有节点移动
  //     const newIndexToOldIndexMap = new Array(toBePatched) // * 存放新孩子在老孩子中的索引，用于后续确定最长递增子序列
  //     for (i = 0; i < toBePatched; i++) {
  //       newIndexToOldIndexMap[i] = 0
  //     }

  //     for (i = s1; i <= e1; i++) {
  //       const prevChild = c1[i]
        
  //       if (patched >= toBePatched) {
  //         // * 所有新的child都已经diff完成，这时老的节点肯定是多余的，所以删除掉老的节点
  //         hostRemove(prevChild.el)
  //         continue
  //       }
        
  //       let newIndex
  //       if (prevChild.key !== null) {
  //         newIndex = keyToNewIndexMap.get(prevChild.key)
  //       } else {
  //         // * 如果老节点没key的话，那么只能遍历所有的新节点来确定当前节点存在不存在
  //         for (let j = s2; j <= e2; j++) {
  //           if (isSameVNodeType(prevChild, c2[j])) {
  //             newIndex = j
  //             break
  //           }
  //         }
  //       }
  //       if (newIndex === undefined) {
  //         // * 如果老节点的key不在新节点children中，那么就是说需要删除该老节点
  //         hostRemove(prevChild.el)
  //       }
  //       else {
  //         // * 老节点和新节点都存在，更新newIndexToOldIndexMap
  //         // * 因为 0 这个值用来识别新节点是否在老节点中了
  //         // * 所以当保存新节点到老序列的oldIndex时，需要将oldIndex + 1保存
  //         newIndexToOldIndexMap[newIndex - s2] = i + 1
  //         // * 下面来确定新节点是否需要移动
  //         // * 因为现在是正序遍历老节点，所以如果发现相同的节点
  //         // * 并且找到的新孩子中的节点在新孩子中的索引newIndex一直升序的话
  //         // * 说明不会产生移动
  //         // * 相反如果newIndex一旦不产生升序，那就是说明需要移动
  //         if (newIndex >= maxNewIndexSoFar) {
  //           maxNewIndexSoFar = newIndex
  //         } else {
  //           moved = true
  //         }

  //         patch(prevChild, c2[newIndex], container, null, parentComponent)
  //         patched++
  //       }
  //     }
  //     // * 5.3 这一步的情况是：老孩子中只存在存在于新孩子中的节点
  //     // * 但是顺序可能不是新孩子中的顺序，并且新孩子中可能还会有新的节点未创建
  //     // * 所以这一步就是去移动这些可以复用的节点，以及将新的节点创建
  //     // * 移动老孩子的话，是需要借助最长递增子序列的
      // const increasingNewIndexSequence = moved
      //   ? getSequence(newIndexToOldIndexMap)
      //   : []
      // console.log(newIndexToOldIndexMap, 'newIndexToOldIndexMap')
      // console.log(increasingNewIndexSequence, 'increasingNewIndexSequence')
      // let j = increasingNewIndexSequence.length - 1
      // // * 倒序遍历是为了插入节点时，便于获取到锚点
      // for (i = toBePatched - 1; i >= 0; i--) {
      //   const nextIndex = s2 + i
      //   const nextChild = c2[nextIndex]
      //   const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor

      //   // * 之前说过，这个数组中保存的0是为了区分新孩子是否是新增的
      //   if (newIndexToOldIndexMap[i] === 0) {
      //     patch(null, nextChild, container, anchor, parentComponent)
      //   } else if (moved) {
      //     // * 这里就是说如果需要移动
      //     // * 判断依据就是，j是最长递增子序列的倒序遍历索引
      //     // * 如果j < 0了就说明最长递增子序列已经排完了，此时的元素都是需要移动的
      //     // * 如果当前的i索引不是最长递增子序列中保存的索引就说明也需要移动
      //     if (j < 0 || i !== increasingNewIndexSequence[j]) {
      //       hostInsert(nextChild.el, container, anchor)
      //     } else {
      //       // * 这里是如果当前索引i在最长递增子序列中也就是说不需要移动
      //       // * 所以只需要更新j指针，用来更新当前遍历的最长递增子序列的位置即可
      //       j--
      //     } 
      //   }
  //     }
  //   }

    
   
  // }

  // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  //   let i = 0;
  //   const l2 = c2.length
  //   let e1 = c1.length - 1
  //   let e2 = l2 - 1

  //   const isSameVNode = (n1, n2) => {
  //     return n1.type === n2.type && n1.key === n2.key
  //   }
  //   // 1.
  //   while (i <= e1 && i <= e2) {
  //     const prevChild = c1[i]
  //     const nextChild = c2[i]
  //     if (isSameVNode(prevChild, nextChild)) {
  //       patch(
  //         prevChild,
  //         nextChild,
  //         container,
  //         parentAnchor,
  //         parentComponent
  //       )
  //     } else {
  //       break
  //     }
  //     i++
  //   }
  //   // 2.
  //   while (i <= e1 && i <= e2) {
  //     const prevChild = c1[e1]
  //     const nextChild = c2[e2]
  //     if (isSameVNode(prevChild, nextChild)) {
  //       patch(
  //         prevChild,
  //         nextChild,
  //         container,
  //         parentAnchor,
  //         parentComponent
  //       )
  //     } else {
  //       break
  //     }
  //     e1--
  //     e2--
  //   }

  //   // 3. 添加新节点
  //   if (i > e1 && i <= e2) {
  //     const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
  //     while (i <= e2) {
  //       patch(
  //         null,
  //         c2[i],
  //         container,
  //         anchor,
  //         parentComponent
  //       )
  //       i++
  //     }    
  //   } 
  //   // 4. 删除老节点
  //   else if (i > e2 && i <= e1) {
  //     while (i <= e1) {
  //       hostRemove(c1[i].el)
  //       i++
  //     }
  //   }
  //   // 5. 未知序列 
  //   else {
  //     const s1 = i
  //     const s2 = i
  //     const keyToNewIndexMap = new Map()
  //     for (i = s2; i <= e2; i++) {
  //       keyToNewIndexMap.set(c2[i].key, i)
  //     }

  //     let patched = 0
  //     let toBePatched = e2 - s2 + 1
  //     let moved
  //     let patchedSoFar = 0
  //     let newIndexToOldIndexMap = new Array(toBePatched)
  //     for (i = 0; i < toBePatched; i++) {
  //       newIndexToOldIndexMap[i] = 0
  //     }

  //     for (let i = s1; i <= e1; i++) {
  //       const prevChild = c1[i]
        
  //       if (patched > toBePatched) {
  //         hostRemove(prevChild.el)
  //       }

  //       let newIndex
  //       if (prevChild.key !== null) {
  //         newIndex = keyToNewIndexMap.get(prevChild.key)
  //       } else {
  //         for (let i = s2; i <= e2; i++) {
  //           if (isSameVNode(prevChild, c2[i])) {
  //             newIndex = i
  //             break
  //           } 
  //         }
  //       }

  //       if (newIndex === undefined) {
  //         hostRemove(prevChild.el)
  //       } else {
  //         newIndexToOldIndexMap[newIndex - s2] = i + 1
  //         if (newIndex >= patchedSoFar) {
  //           patchedSoFar = newIndex
  //         } else {
  //           moved = true
  //         }
  //         patch(
  //           prevChild, 
  //           c2[newIndex], 
  //           container, 
  //           parentAnchor, 
  //           parentComponent
  //         )
  //         patched++
  //       }
  //     }

  //     const increasingNewIndexSequence = moved
  //       ? getSequence(newIndexToOldIndexMap)
  //       : []
  //     let j = increasingNewIndexSequence.length - 1

  //     for (let i = toBePatched - 1; i >= 0; i--) {
  //       const nextPos = s2 + i
  //       const anchor = nextPos + 1 < l2 ? c2[nextPos + 1].el : parentAnchor 
  //       if (newIndexToOldIndexMap[i] === 0) {
  //         patch(
  //           null,
  //           c2[nextPos],
  //           container,
  //           anchor,
  //           parentComponent
  //         )
  //       } else {
  //         if (j < 0 || increasingNewIndexSequence[j] !== i) {
  //           hostInsert(c2[nextPos].el, container, anchor)
  //         } else {
  //           j--
  //         }
  //       }
  //     }
  //   }
  // }

  // * vue2 双端对比diff算法
  // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
  //   let oldStartIndex = 0
  //   let oldEndIndex = c1.length - 1
  //   let newStartIndex = 0
  //   let newEndIndex = c2.length - 1

  //   let oldStartVNode = c1[oldStartIndex]
  //   let oldEndVNode = c1[oldEndIndex]
  //   let newStartVNode = c2[newStartIndex]
  //   let newEndVNode = c2[newEndIndex]

  //   let keyToOldIdx
  //   const isSameVNode = (n1, n2) => {
  //     return n1.type === n2.type && n1.key === n2.key
  //   }
  //   while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
  //     oldStartVNode = c1[oldStartIndex]
  //     oldEndVNode = c1[oldEndIndex]
  //     newStartVNode = c2[newStartIndex]
  //     newEndVNode = c2[newEndIndex]
  //     if (keyToOldIdx && keyToOldIdx.get(oldStartVNode.key) === -1) {
  //       oldStartIndex++
  //     } else if (keyToOldIdx && keyToOldIdx.get(oldEndVNode.key) === -1) {
  //       oldEndIndex--
  //     } else if (isSameVNode(oldStartVNode, newStartVNode)) {
  //       patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent)
  //       oldStartIndex++
  //       newStartIndex++
  //     } else if (isSameVNode(oldEndVNode, newEndVNode)) {
  //       patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent)
  //       oldEndIndex--
  //       newEndIndex--
  //     } else if (isSameVNode(oldStartVNode, newEndVNode)) {
  //       patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent)
  //       hostInsert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
  //       oldStartIndex++
  //       newEndIndex--
  //     } else if (isSameVNode(oldEndVNode, newStartVNode)) {
  //       patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent)
  //       hostInsert(oldEndVNode.el, container, oldStartVNode.el)
  //       oldEndIndex--
  //       newStartIndex++
  //     } else {
  //       if (!keyToOldIdx) keyToOldIdx = generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2)
  //       const key = newStartVNode.key
  //       const oldIdx = keyToOldIdx.get(key)
  //       if (oldIdx >= 0) {
  //         const oldVNode = c1[oldIdx]
  //         patch(oldVNode, newStartVNode, container, parentAnchor, parentComponent)
  //         hostInsert(oldVNode.el, container, oldStartVNode.el)
  //         keyToOldIdx.set(key, -1)
  //       } else {
  //         patch(null, newStartVNode, container, oldStartVNode.el, parentComponent)
  //       }
  //       newStartIndex++
  //     }
  //   }

  //   if (oldStartIndex > oldEndIndex && newStartIndex <= newEndIndex) {
  //     const anchor = c2[newEndIndex + 1] ? c2[newEndIndex + 1].el : null
  //     console.log(anchor)
  //     while (newStartIndex <= newEndIndex) {
  //       patch(null, c2[newStartIndex], container, anchor, parentComponent)
  //       newStartIndex++
  //     } 
  //   } else if (newStartIndex > newEndIndex && oldStartIndex <= oldEndIndex) {
  //     while (oldStartIndex <= oldEndIndex) {
  //       hostRemove(c1[oldStartIndex].el)
  //       oldStartIndex++
  //     } 
  //   }
  // }

  // function generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2) {
  //   const map = new Map()
  //   for (let i = newStartIndex; i <= newEndIndex; i++) {
  //     const key = c2[i].key
  //     map.set(key, -1)
  //   }
  //   for (let i = oldStartIndex; i <= oldEndIndex; i++) {
  //     const oldKey = c1[i].key
  //     if (map.has(oldKey)) {
  //       map.set(oldKey, i)
  //     }
  //   }
  //   return map
  // }

  function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    let oldStartIndex = 0
    let newStartIndex = 0
    let oldEndIndex = c1.length - 1
    let newEndIndex = c2.length - 1

    const isSameVNode = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key
    }
    let oldStartVNode = c1[oldStartIndex]
    let newStartVNode = c2[newStartIndex]
    let oldEndVNode = c1[oldEndIndex]
    let newEndVNode = c2[newEndIndex]
    let keyToOldIndex
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      oldStartVNode = c1[oldStartIndex]
      newStartVNode = c2[newStartIndex]
      oldEndVNode = c1[oldEndIndex]
      newEndVNode = c2[newEndIndex]
      debugger
      if (keyToOldIndex && keyToOldIndex.get(oldStartVNode.key) === -1) {
        oldStartIndex++
      } else if (keyToOldIndex && keyToOldIndex.get(oldEndVNode.key) === -1) {
        oldEndIndex--
      } else if (isSameVNode(oldStartVNode, newStartVNode)) {
        patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent)
        oldStartIndex++
        newStartIndex++
      } else if (isSameVNode(oldEndVNode, newEndVNode)) {
        patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent)
        oldEndIndex--
        newEndIndex--
      } else if (isSameVNode(oldStartVNode, newEndVNode)) {
        patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent)
        hostInsert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        oldStartIndex++
        newEndIndex--
      } else if (isSameVNode(oldEndVNode, newStartVNode)) {
        patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent)
        hostInsert(oldEndVNode.el, container, oldStartVNode.el)
        oldEndIndex--
        newStartIndex++
      } else {
        keyToOldIndex = keyToOldIndex || generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2)
        let oldIndex = keyToOldIndex.get(newStartVNode.key)
        if (oldIndex !== -1) {
          let oldVNode = c1[oldIndex]
          patch(oldVNode, newStartVNode, container, parentAnchor, parentComponent)
          hostInsert(oldVNode.el, container, oldStartVNode.el)
          keyToOldIndex.set(newStartVNode.key, -1)
        } else {
          patch(null, newStartVNode, container, oldStartVNode.el, parentComponent)
        }
        newStartIndex++
      }
    }

    if (oldStartIndex <= oldEndIndex) {
      while (oldStartIndex <= oldEndIndex) {
        hostRemove(c1[oldStartIndex].el)
        oldStartIndex++
      }
    } else if (newStartIndex <= newEndIndex) {
      // const anchor = oldEndIndex === c1.length - 1 ? null : oldEndVNode.el
      const anchor = newEndIndex > c2.length - 1 ? null : c2[newEndIndex + 1].el
      while (newStartIndex <= newEndIndex) {
        patch(null, c2[newStartIndex], container, anchor, parentComponent)
        newStartIndex++
      }
    }
  }

  function generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2) {
    const map = new Map()
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      map.set(c2[i].key, -1)
    }
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      if (map.has(c1[i].key)) {
        map.set(c1[i].key, i)
      }
    }
    return map
  }


  function mountElement(vnode, container, anchor, parentComponent) {
    const el = document.createElement(vnode.type)
    hostCreateElement(vnode.type)
    const { props = {}, children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent)
    }
    
    
    
    for (let key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
      
    }
    hostInsert(el, container, anchor)
    vnode.el = el
  }
  
  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach(child => {
      patch(null, child, container, null, parentComponent)
    })
  }
  
  function processComponent(n1, n2, container, parentComponent) {
    console.log('processComponent', n2, 'component vnode')
    if (!n1) {
      mountComponent(n2, container, parentComponent)
    } else {
      updateComponent(n1, n2, container)
    }
    
  }
  function updateComponent(n1, n2, container) {
    console.log('updateComponent')
    const instance = (n2.component = n1.component)
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2
      instance.update()
    } else {
      console.log('should not update')
      n2.el = n1.el
      n2.component = n1.component
      instance.vnode = n2
    }
  }
  
  function mountComponent(vnode, container, parentComponent) {
    const instance = (vnode.component = createComponentInstance(vnode, parentComponent))
    setupComponent(instance)
  
    setupRenderEffect(instance, container, parentComponent)
  }
  
  function setupRenderEffect(instance, container, parentComponent) {
    function componentRenderEffect() {
      if (!instance.isMounted) {
        const { proxy, vnode } = instance
        const subTree = instance.render.call(proxy)
        // 子树subTree
        // vnode -> patch
        patch(null, subTree, container, null, instance)
        instance.subTree = subTree
        vnode.el = subTree.el
        instance.isMounted = true
        console.log(`组件${vnode.type.name} 完成初次挂载`)
      } else {
        // console.log('update effect componentRender', instance)
        const { next, vnode, proxy } = instance

        if (next) {
          next.el = vnode.el
          updateComponentPreRender(instance, next)
        }

        const prevSubTree = instance.subTree
        const nextSubTree = instance.render.call(proxy)
        nextSubTree.el = prevSubTree.el
        patch(
          prevSubTree, 
          nextSubTree, 
          container, 
          null,
          instance
        )
        instance.subTree = nextSubTree
        vnode.el = nextSubTree.el
      }
    }
    instance.update = effect(componentRenderEffect, {
      scheduler() {
        console.log('scheduler')
        queueJob(instance.update)
      }
    })

  }

  function updateComponentPreRender(instance, nextVNode) {
    nextVNode.component = instance
    instance.vnode = nextVNode
    instance.next = null

    const { props } = nextVNode
    instance.props = props
  }


  return {
    createApp: createAppAPI(render)
  }
}



function getSequence(arr) {
  const p = arr.slice()
  const stack: number[] = []
  const len = arr.length
  let i, cur, r, l, c
  for (i = 0; i < len; i++) {
    cur = arr[i]
    if (cur === 0) continue
    r = stack.length - 1
    if (r >= 0 && cur > arr[stack[r]]) {
      p[i] = stack[r]
      stack.push(i)
    } else {
      l = 0
      while (l < r) {
        c = Math.floor((l + r) / 2)
        if (cur > arr[stack[c]]) {
          l = c + 1
        } else {
          r = c
        }
      }
      
      if (l > 0) {
        p[i] = stack[l - 1]
      }
      stack[l] = i
    }
  }
  let n = stack.length - 1
  let last = stack[n]
  while (n--) {
    last = p[last]
    stack[n] = last
  }
  return stack
}
