import { h, ref } from "../../lib/guide-mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, { emit }) {},
  render(proxy) {
    console.log(this.$props, 'prprorprp')
    return h("div", {}, [h("div", {}, "child " + this.msg), h("p", {}, this.foo)]);
  },
};