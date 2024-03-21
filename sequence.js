function getSequence(arr) {
  const p = arr.slice()
  const stack = []
  const len = arr.length
  let i, cur, r, l, c
  for (i = 0; i < len; i++) {
    cur = arr[i]
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
const arr = [1, 5, 16, 2, 17, 9, 8, 11, 10, 3, 20]
const arr2 = [2, 1, 5, 3, 6, 4, 8, 9, 7]
console.log(getSequence(arr))
console.log(getSequence(arr2))