

const queue: Array<any> = []
const p = Promise.resolve()

let isFlushPending = false
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  queueFlush()
}

function queueFlush() {
  if (isFlushPending) return
  isFlushPending = true

  nextTick(flushJobs)
}

function flushJobs() {
  isFlushPending = false
  let job
  while (job = queue.shift()) {
    if (job) {
      job()
    }
  }
}

export function nextTick(fn) {
  return fn ? p.then(fn) : p
}