
import { h } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  setup(props, { emit }) {
    console.log(props)
    emit('add', 1, 2)
    emit('add-foo', 1, 2)
  },
  render() {
    console.log(this.foo)
    return h('p', {
      id: 'test-props'
    }, this.foo)
  },
}