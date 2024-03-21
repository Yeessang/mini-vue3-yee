
   
// 在 render 中使用 proxy 调用 emit 函数
// 也可以直接使用 this
// 验证 proxy 的实现逻辑
import { h, ref } from "../../lib/guide-mini-vue.esm.js";
import Child from "./Child.js";

export default {
  name: "App",
  setup() {
    const msg = ref(1);
    window.msg = msg
    const foo = ref("foo")
    const changeChildProps = () => {
      msg.value++;
      foo.value = "new-foo"
    };

    return { msg, foo, changeChildProps };
  },

  render() {
    console.log('render', this.foo)
    return h("div", {
      foo: this.foo
    }, [
      h("div", {
        foo: this.foo
      }, "你好"),
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      h("p", {}, `test update ----> ${this.msg}`),
      h(Child, {
        // msg: this.msg,
        foo: this.foo
      }),
    ]);
  },
};