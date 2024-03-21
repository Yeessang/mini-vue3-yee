import { h } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

window._f = null
export const App = {
  render() {
    window._f = this
    return h('div', {
      id: "root",
      class: ["red"],
      onClick() { console.log('div click') },
    },  [
      h("p", { class: "green", onClick() { console.log('p1 click') } }, "hi " + this.msg),
      h("p", { class: "blue" }, "mini " + this.msg),
      h(Foo, { 
        foo: 'test-props',
        onAdd(a, b) {
          console.log('onAdd', a, b)
        },
        onAddFoo(a, b) {
          console.log('onAddFoo', a, b)
        }
      })
    ])
  },

  setup() {
    return {
      msg: "mine-vue"
    }
  }

}