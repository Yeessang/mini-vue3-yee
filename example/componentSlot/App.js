import { h, getCurrentInstance } from "../../lib/guide-mini-vue.esm.js";
import Child from "./Child.js";

export default {
  name: "App",
  setup() {
    console.log(getCurrentInstance(), 'instance-app')
    console.log('setup app')
  },

  render() {
    return h("div", {}, [
      h("div", {}, "你好"),
      h(
        Child,
        {
          msg: "your name is child",
        },
        {
          default: ({ age }) => [
            h("p", {}, "我是通过 slot 渲染出来的第一个元素 "),
            h("p", {}, "我是通过 slot 渲染出来的第二个元素"),
            h("p", {}, `我可以接收到 age: ${age}`),
          ],
          header: ({ title }) => h('header', {}, 'header ' + title)
        }
      ),
    ]);
  },
};