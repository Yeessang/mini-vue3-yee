import { h, renderSlots, createTextVNode, getCurrentInstance } from "../../lib/guide-mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, context) {
    console.log(getCurrentInstance(), 'instance-child')
  },
  render() {
    return h("div", {}, [
      h("div", {}, "child"),
      // renderSlot 会返回一个 vnode
      // 其本质和 h 是一样的
      // 第三个参数给出数据
      renderSlots(this.$slots, "header", {
        title: 'hhhhh'
      }),
      h("p", {}, "zhongjiande"),
      renderSlots(this.$slots, "default", {
        age: 16,
      }),
      createTextVNode("textNode 测试")
    ]);
  },
};