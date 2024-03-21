import { reactive } from "../reactive";
import { effect, stop } from "../effect";

describe("effect", () => {
  it("should run the passed function once (wrapped by a effect)", () => {
    const fnSpy = jest.fn(() => {});
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it("should observe basic properties", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });

  it("should observe multiple properties", () => {
    let dummy;
    const counter = reactive({ num1: 0, num2: 0 });
    effect(() => (dummy = counter.num1 + counter.num1 + counter.num2));

    expect(dummy).toBe(0);
    counter.num1 = counter.num2 = 7;
    expect(dummy).toBe(21);
  });
  it("should handle multiple effects", () => {
    let dummy1, dummy2;
    const counter = reactive({ num: 0 });
    effect(() => (dummy1 = counter.num));
    effect(() => (dummy2 = counter.num));

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  // it("should observe nested properties", () => {
  //   let dummy;
  //   const counter = reactive({ nested: { num: 0 } });
  //   effect(() => (dummy = counter.nested.num));

  //   expect(dummy).toBe(0);
  //   counter.nested.num = 8;
  //   expect(dummy).toBe(8);
  // });

  it("should observe function call chains", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    expect(dummy).toBe(0);
    counter.num = 2;
    expect(dummy).toBe(2);
  });
  it("scheduler", () => {
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // // should not run yet
    expect(dummy).toBe(1);
    // // manually run
    run();
    // // should have run
    expect(dummy).toBe(2);
  });

  it("stop", () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    // obj.prop = 3
    obj.prop++;
    expect(dummy).toBe(2);

    // stopped effect should still be manually callable
    runner();
    expect(dummy).toBe(3);
  });

  it("events: onStop", () => {
    const onStop = jest.fn();
    const runner = effect(() => {}, {
      onStop,
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  });

  it("nested effects", () => {
    const obj = reactive({
      a: 1,
      b: 2
    })
    let n = 0
    const runner1 = effect(() => {
      n += obj.b
      effect(() => {
        n += obj.b
      })
    })

    expect(n).toBe(4)
    obj.b++
    expect(n).toBe(13)
  });

  it("key in object", () => {
    const obj = reactive({
      a: 1,
      b: 2
    })
    let count = 0
    effect(() => {
      count++
      for (let key in obj) {
        console.log(key)
      }
    })

    expect(count).toBe(1)
    obj.a = 2
    expect(count).toBe(1)
    obj.c = 3
    expect(count).toBe(2)

    delete obj.b
    expect(count).toBe(3)

    effect(() => {
      count++
      "a" in obj
    })
    delete obj.a

    expect(count).toBe(6)
  })

  // 测试原型
  it('proto reactive', () => {
    const obj = {}
    const proto = { bar: 1 }
    const child = reactive(obj)
    const parent = reactive(proto)
    Object.setPrototypeOf(child, parent)
    let count = 0
    effect(() => {
      count++
      console.log(child.bar)
    })

    child.bar = 2
    expect(count).toBe(2)
  })

  // 测试数组响应式
  it('array set', () => {
    const arr = reactive(['foo'])
    const fn = jest.fn(() => {
      console.log(arr.length)
    })
    effect(fn)

    expect(fn).toHaveBeenCalledTimes(1)

    arr[1] = 'bar'

    expect(fn).toHaveBeenCalledTimes(2)
  })

  // 测试数组设置长度
  it('array len', () => {
    const arr = reactive(['foo'])
    const fn = jest.fn(() => {
      console.log(arr[0])
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    arr.length = 0

    expect(fn).toHaveBeenCalledTimes(2)
  })

  // 测试数组遍历keys
  it('array for keys', () => {
    const arr = reactive(['foo'])
    const fn = jest.fn(() => {
      for (let key in arr) {
        console.log(arr[key])
      }
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    arr.length = 0

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('array for values', () => {
    const arr = reactive(['foo'])
    const fn = jest.fn(() => {
      for (let v of arr) {
        console.log(v)
      }
    })

    effect(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    // arr[1] = 'bar'
    arr.length = 0

    expect(fn).toHaveBeenCalledTimes(2)
  })

  // 数组的查找方法
  it('array search', () => {
    const obj = {}
    const arr = reactive([obj])
    // let flag = arr.includes(arr[0])
    // expect(flag).toBe(true)
    let flag = arr.includes(obj)
    let index = arr.indexOf(obj)
    expect(flag).toBe(true)
    expect(index).toBe(0)
  })

  // 改变数组长度的方法
  it('array push pop...', () => {
    const arr = reactive([])
    let num1 = 0, num2 = 0
    const f1 = jest.fn(() => {
      console.log('1111')
      num1++
      arr.push(1)
    })
    const f2 = jest.fn(() => {
      console.log('2222')
      num2++
      arr.push(2)
      console.log('222-end')
    })
    effect(f1)
    effect(f2)
    expect(f1).toHaveBeenCalledTimes(1)
    expect(f2).toHaveBeenCalledTimes(1)
    console.log(num1, num2)
  })

});