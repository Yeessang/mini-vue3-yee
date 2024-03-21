import { h, provide, inject, getCurrentInstance } from "../../lib/guide-mini-vue.esm.js"


export default {
  name: 'App',
  setup() {
    provide("foo", "fooVal")
    provide("bar", "barVal")
    console.log(getCurrentInstance(), 'app')
  },
  render() {
    return h("div", {}, [
      h(Middle, { msg: 'you are child' }, ""),
      h("p", {}, "text-pppp")
    ])
  }
}
const Middle = {
  name: 'middle',
  setup() {
    provide("foo", "middle-foo")
    console.log(getCurrentInstance(), 'middle')
  },
  render() {
    return h("div", {}, [
      h(Child, {}, "")
  ])
  }
}

const Child = {
  name: 'child',
  setup() {
    const injectFoo = inject("foo", "defaultFooVal")
    console.log(getCurrentInstance(), 'child')
    return {
      injectFoo
    }
  },
  render() {
    return h("div", {}, "child " + this.injectFoo)
  }
}