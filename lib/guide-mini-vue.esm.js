const extend = Object.assign;
const isObject = (value) => value !== null && typeof value === 'object';
const hasChanged = (oldValue, newValue) => oldValue !== newValue && (oldValue === oldValue || newValue === newValue);
const isArray = Array.isArray;
const isSymbol = (v) => typeof v === 'symbol';
const hasOwn = (v, key) => v.hasOwnProperty(key);
const capital = (v) => v.charAt(0).toUpperCase() + v.slice(1);
const camelizeReg = /-(\w)/g;
const camelize = (v) => v.replace(camelizeReg, (_, c) => c ? c.toUpperCase() : "");
const toHandlerKey = (s) => s ? "on" + capital(s) : "";
const EMPTY_OBJ = {};

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        key: props === null || props === void 0 ? void 0 : props.key,
        shapeFlag: getShapeFlag(type),
        el: null,
        component: {}
    };
    if (isArray(children)) {
        vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */;
    }
    else if (typeof children === "string") {
        vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
    }
    normalizeChildren(vnode, children);
    return vnode;
}
function normalizeChildren(vnode, children) {
    if (typeof children === 'object') {
        if (vnode.shapeFlag & 1 /* ELEMENT */) ;
        else {
            vnode.shapeFlag |= 32 /* SLOTS_CHILDREN */;
        }
    }
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 4 /* STATEFUL_COMPONENT */;
}
const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props = {}) {
    const slot = slots[name];
    console.log(`渲染插槽 slot --> ${name}`);
    if (slot) {
        const slotContent = slot(props);
        console.log(slotContent);
        return createVNode(Fragment, {}, slotContent);
    }
}

const PublicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.vnode.props
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        // console.log(key, 'proxy', props[key])
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = PublicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function createDep(effects) {
    const dep = new Set(effects);
    return dep;
}

class ReactiveEffect {
    constructor(fn) {
        this.deps = [];
        this._active = true;
        this.lazy = false;
        this._fn = fn;
    }
    run() {
        if (!this._active)
            return this._fn();
        if (!effectStack.includes(this)) {
            cleanupEffect(this);
            enableTrack();
            effectStack.push(activeEffect = this);
            const res = this._fn();
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
            resetTrack();
            return res;
        }
    }
    stop() {
        if (this._active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this._active = false;
        }
    }
}
function cleanupEffect(effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let dep of deps) {
            dep.delete(effect);
        }
        deps.length = 0;
    }
}
const targetMap = new WeakMap();
function track(target, key) {
    if (!isTracking())
        return;
    // target --> key -- > set([effect])
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, depsMap = new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, dep = createDep());
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
function trigger(target, key, type, newVal) {
    // console.log('trigger[------------------------------]', target, key, type)
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const dep = depsMap.get(key) || [];
    const effectDep = [];
    const targetIsArray = isArray(target);
    if (targetIsArray && key === 'length') {
        depsMap.forEach((effects, key) => {
            if (key >= newVal) {
                effectDep.push(...effects);
            }
        });
    }
    else {
        effectDep.push(...dep);
    }
    // * 由于对象存在添加删除属性，这种情况会影响对对象的keys遍历，以及key in obj，两种操作
    // * 所以设置了一个ITERATE_KEY 作为这种情况的依赖收集和触发响应的媒介
    if (type === "ADD" /* ADD */) {
        if (targetIsArray) {
            effectDep.push(...(depsMap.get('length') || []));
        }
        else {
            effectDep.push(...(depsMap.get(ITERATE_KEY) || []));
        }
    }
    if (type === "DELETE" /* DELETE */) {
        effectDep.push(...(depsMap.get(ITERATE_KEY) || []));
    }
    triggerEffects(createDep(effectDep));
}
function triggerEffects(dep) {
    for (const effect of isArray(dep) ? dep : [...dep]) {
        // * 过滤掉当前运行的effect，是因为有可能在effect既读取，又进行设置的情况，所以需要过滤掉当前的effect
        if (effect !== activeEffect) {
            if (effect.scheduler) {
                effect.scheduler();
            }
            else {
                effect.run();
            }
        }
    }
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
let shouldTrack = false;
let trackStack = [];
function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
}
function enableTrack() {
    trackStack.push(shouldTrack);
    shouldTrack = true;
}
function resetTrack() {
    const last = trackStack.pop();
    shouldTrack = last !== undefined ? last : true;
}
let activeEffect;
let effectStack = [];
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn);
    extend(_effect, options);
    // * effect是否立即执行，该配置会在computed以及watch中存在
    if (!_effect.lazy) {
        _effect.run();
    }
    // * 设置effect的返回工作函数，以便方便调用，同时保留个链接到_effect实例身上
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

const ITERATE_KEY = Symbol('iterate_key');
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, isShallow = false) {
    return function (target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* RAW */ &&
            receiver ===
                (isReadonly
                    ? isShallow
                        ? shallowReadonlyMap
                        : readonlyMap
                    : reactiveMap).get(target)) {
            return target;
        }
        if (isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        const res = Reflect.get(target, key);
        if (isSymbol(key)) {
            return res;
        }
        if (!isReadonly) {
            track(target, key);
        }
        if (isShallow) {
            return res;
        }
        return isObject(res)
            ? isReadonly
                ? readonly(res)
                : reactive(res)
            : res;
    };
}
function createSetter(isReadonly = false, isShallow = false) {
    return function (target, key, value, receiver) {
        const type = isArray(target)
            ? Number(key) < target.length
                ? "SET" /* SET */
                : "ADD" /* ADD */
            : Object.prototype.hasOwnProperty.call(target, key)
                ? "SET" /* SET */
                : "ADD" /* ADD */;
        const oldValue = target[key];
        const res = Reflect.set(target, key, value);
        // * 由于继承的关系，如果实例访问原型上的属性（实例本身没有），这种情况设置实例的属性时，会触发实例的setter，和原型的setter
        // * 会触发两次，但是这种情况，原型上的receiver是实例的代理对象，所以可以根据这种情况去过滤到原型上的setter
        if (target === toRaw(receiver)) {
            // * 如果值没变化去触发依赖
            if (hasChanged(oldValue, value)) {
                trigger(target, key, type, value);
            }
        }
        return res;
    };
}
const arrayInstrumentations = createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
        const originMethod = Array.prototype[method];
        instrumentations[method] = function (...args) {
            let res = originMethod.apply(this, args);
            if (res === false || res === -1) {
                return originMethod.apply(toRaw(this), args);
            }
            return res;
        };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
        const originMethod = Array.prototype[method];
        instrumentations[method] = function (...args) {
            pauseTracking();
            let res = originMethod.apply(this, args);
            resetTrack();
            return res;
        };
    });
    return instrumentations;
}
const mutableHandlers = {
    get,
    set,
    has(target, key) {
        track(target, key);
        return Reflect.has(target, key);
    },
    ownKeys(target) {
        track(target, isArray(target) ? 'length' : ITERATE_KEY);
        return Reflect.ownKeys(target);
    },
    deleteProperty(target, key) {
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const res = Reflect.deleteProperty(target, key);
        if (res && hadKey) {
            trigger(target, key, "DELETE" /* DELETE */);
        }
        return res;
    }
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    }
};
const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set(target, key) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
        return true;
    }
};

const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
function createReactive(target, proxyMap, baseHandlers) {
    const existingProxy = proxyMap.get(target);
    if (existingProxy)
        return existingProxy;
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}
function reactive(raw) {
    return createReactive(raw, reactiveMap, mutableHandlers);
}
function readonly(raw) {
    return createReactive(raw, readonlyMap, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactive(raw, shallowReadonlyMap, shallowReadonlyHandlers);
}
function toRaw(target) {
    if (!target["__v_raw" /* RAW */])
        return target;
    return target["__v_raw" /* RAW */];
}

function emit(instance, event, ...args) {
    // console.log(instance, event)
    const props = instance.props;
    const handleName = toHandlerKey(camelize(event));
    const handler = props[handleName];
    if (handler) {
        handler(...args);
    }
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, (instance.slots = {}));
        // console.log(instance.slots)
    }
}
const normalizeSlotValue = (value) => {
    return isArray(value) ? value : [value];
};
const normalizeObjectSlots = (rawSlots, slots) => {
    for (const key in rawSlots) {
        const value = rawSlots[key];
        if (typeof value === 'function') {
            slots[key] = (props) => normalizeSlotValue(value(props));
        }
    }
};

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = createDep();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this._value, newValue)) {
            console.log('======= ref value change ======');
            this._value = convert(newValue);
            this._rawValue = newValue;
            triggerRefValue(this);
        }
    }
}
function ref(value) {
    return createRef(value);
}
function createRef(value) {
    const refImpl = new RefImpl(value);
    return refImpl;
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function triggerRefValue(ref) {
    triggerEffects(ref.dep);
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
const shallowUnwrapHandlers = {
    get(target, key, receiver) {
        return unRef(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            return target[key].value = value;
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    }
};
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function unRef(target) {
    return isRef(target) ? target.value : target;
}
function isRef(target) {
    return !!target.__v_isRef;
}

function createComponentInstance(vnode, parentComponent) {
    const instance = {
        vnode,
        type: vnode.type,
        proxy: null,
        ctx: {},
        parent: parentComponent,
        setupState: {},
        provides: parentComponent ? parentComponent.provides : {},
        slots: {},
        isMounted: false,
        update: () => { },
        emit: () => { }
    };
    instance.ctx = {
        _: instance
    };
    instance.emit = emit.bind(null, instance);
    return instance;
}
function setupComponent(instance) {
    // * initProps
    initProps(instance, instance.vnode.props);
    // * initSlots
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === 'object') {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
    if (!Component.render) ;
}
let currentInstance = {};
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultVal) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const provides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (key in provides) {
            return provides[key];
        }
        else if (defaultVal) {
            if (typeof defaultVal === 'function') {
                return defaultVal();
            }
            return defaultVal;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVNode(rootComponent);
                // console.log(vnode)
                render(vnode, rootContainer);
            }
        };
    };
}

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    // * props 没变化，不需要更新
    if (prevProps === nextProps)
        return false;
    // * 之前没有props，但是现在有props就需要更新，现在没有props就不需要更新
    if (!prevProps)
        return !!nextProps;
    // * 之前有props，但是现在没有props，需要更新
    if (!nextProps)
        return true;
    return hasPropsChanged(prevProps, nextProps);
}
function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while (job = queue.shift()) {
        if (job) {
            job();
        }
    }
}
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, setElementText: hostSetElementText, remove: hostRemove } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, anchor = null, parentComponent) {
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, anchor, parentComponent);
                }
                else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
        }
    }
    function processText(n1, n2, container) {
        if (!n1) {
            container.append(n2.children);
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        if (!n1) {
            mountChildren(n2, container, parentComponent);
        }
    }
    function processElement(n1, n2, container, anchor, parentComponent) {
        if (!n1) {
            mountElement(n2, container, anchor, parentComponent);
        }
        else {
            patchElement(n1, n2, container, anchor, parentComponent);
        }
    }
    function patchElement(n1, n2, container, anchor, parentComponent) {
        console.log("patch-element  n1", n1);
        console.log("patch-element  n2", n2);
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
        patchChildren(n1, n2, el, anchor, parentComponent);
    }
    function patchProps(el, oldProps, newProps) {
        // console.log(oldProps, newProps, 'patchProps')
        for (const key in newProps) {
            const prevProp = oldProps[key];
            const newProp = newProps[key];
            if (prevProp !== newProp) {
                hostPatchProp(el, key, prevProp, newProp);
            }
        }
        for (const key in oldProps) {
            const prevProp = oldProps[key];
            const nextProp = null;
            if (!(key in newProps)) {
                // 这里是以 oldProps 为基准来遍历，
                // 而且得到的值是 newProps 内没有的
                // 所以交给 host 更新的时候，把新的值设置为 null
                hostPatchProp(el, key, prevProp, nextProp);
            }
        }
    }
    function patchChildren(n1, n2, container, anchor, parentComponent) {
        const { shapeFlag: prevShapeFlag, children: c1 } = n1;
        const { shapeFlag, children: c2 } = n2;
        console.log('patchChildren', n1, n2);
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            if (c2 !== c1) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                    patchKeyedChildren(c1, c2, container, anchor, parentComponent);
                }
            }
        }
    }
    // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    //   console.log('patchKeyedChildren')
    //   console.log('n1', c1)
    //   console.log('n2', c2)
    //   console.log('anchor', parentAnchor)
    //   let i = 0
    //   const l2 = c2.length
    //   let e1 = c1.length - 1
    //   let e2 = l2 - 1
    //   console.log(i, e1, e2)
    //   const isSameVNodeType = (n1, n2) => {
    //     return n1.type === n2.type && n1.key === n2.key
    //   }
    //   // * 1. 从新老children的头部进行对比
    //   // * 相同则patch更新，不同则进入下一步
    //   while (i <= e1 && i <= e2) {
    //     const prevChild = c1[i]
    //     const nextChild = c2[i]
    //     if (!isSameVNodeType(prevChild, nextChild)) {
    //       console.log('新老孩子头部对比不是同类型vnode')
    //       console.log('prevChild', prevChild)
    //       console.log('nextChild', nextChild)
    //       break
    //     }
    //     patch(prevChild, nextChild, container, parentAnchor, parentComponent)
    //     i++
    //   } 
    //   // * 2. 从新老children的尾部进行对比
    //   // * 相同则patch更新，不同则进入下一步
    //   while (i <= e1 && i <= e2) {
    //     const prevChild = c1[e1]
    //     const nextChild = c2[e2]
    //     if (!isSameVNodeType(prevChild, nextChild)) {
    //       console.log('新老孩子尾部对比不是同类型vnode')
    //       console.log('prevChild', prevChild)
    //       console.log('nextChild', nextChild)
    //       break
    //     }
    //     patch(prevChild, nextChild, container, parentAnchor, parentComponent)
    //     e1--
    //     e2--
    //   }
    //   console.log(i, e1, e2)
    //   // * 3. 检查老的children是否diff完，如果老的diff完，并且新的children存在没diff的
    //   // * 也就是需要新增的节点
    //   if (i > e1 && i <= e2) {
    //     const nextPos = e2 + 1
    //     const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor  
    //     while (i <= e2) {
    //       console.log(`创建新的child节点：key --> ${c2[i].key}`)
    //       patch(
    //         null,
    //         c2[i],
    //         container,
    //         anchor,
    //         parentComponent
    //       )
    //       i++
    //     }
    //   } 
    //   // * 4. 检查老的children是否diff完，如果老的没diff完，并且新的children已经diff完成
    //   // * 此时就需要删除掉旧的节点
    //   else if (i <= e1 && i > e2) {
    //     while (i <= e1) {
    //       console.log(`删除旧的child节点：key --> ${c1[i].key}`)
    //       hostRemove(c1[i].el)
    //       i++
    //     }
    //   }
    //   else {
    //     // debugger
    //     // * 5. 此时从头部以及从尾部的diff完成，剩下的只是新老children节点的中间未知序列部分
    //     // * 接下来就是处理未知序列部分
    //     const s1 = i // * 老孩子的未知序列起始索引
    //     const s2 = i // * 新孩子的未知序列起始所以
    //     // * 5.1 构建新孩子的key与新index的索引图
    //     const keyToNewIndexMap = new Map()
    //     for (i = s2; i <= e2; i++) {
    //       keyToNewIndexMap.set(c2[i].key, i)
    //     }
    //     // * 5.2 遍历老孩子的序列，找到匹配的节点更新，删除不存在新孩子中的节点，判断是否有节点移动
    //     let patched = 0 // * 新序列已经更新的数量
    //     const toBePatched = e2 - s2 + 1 // * 新孩子需要更新的数量
    //     let moved = false // * 判断是否需要移动
    //     let maxNewIndexSoFar = 0 // * 跟踪判断是否有节点移动
    //     const newIndexToOldIndexMap = new Array(toBePatched) // * 存放新孩子在老孩子中的索引，用于后续确定最长递增子序列
    //     for (i = 0; i < toBePatched; i++) {
    //       newIndexToOldIndexMap[i] = 0
    //     }
    //     for (i = s1; i <= e1; i++) {
    //       const prevChild = c1[i]
    //       if (patched >= toBePatched) {
    //         // * 所有新的child都已经diff完成，这时老的节点肯定是多余的，所以删除掉老的节点
    //         hostRemove(prevChild.el)
    //         continue
    //       }
    //       let newIndex
    //       if (prevChild.key !== null) {
    //         newIndex = keyToNewIndexMap.get(prevChild.key)
    //       } else {
    //         // * 如果老节点没key的话，那么只能遍历所有的新节点来确定当前节点存在不存在
    //         for (let j = s2; j <= e2; j++) {
    //           if (isSameVNodeType(prevChild, c2[j])) {
    //             newIndex = j
    //             break
    //           }
    //         }
    //       }
    //       if (newIndex === undefined) {
    //         // * 如果老节点的key不在新节点children中，那么就是说需要删除该老节点
    //         hostRemove(prevChild.el)
    //       }
    //       else {
    //         // * 老节点和新节点都存在，更新newIndexToOldIndexMap
    //         // * 因为 0 这个值用来识别新节点是否在老节点中了
    //         // * 所以当保存新节点到老序列的oldIndex时，需要将oldIndex + 1保存
    //         newIndexToOldIndexMap[newIndex - s2] = i + 1
    //         // * 下面来确定新节点是否需要移动
    //         // * 因为现在是正序遍历老节点，所以如果发现相同的节点
    //         // * 并且找到的新孩子中的节点在新孩子中的索引newIndex一直升序的话
    //         // * 说明不会产生移动
    //         // * 相反如果newIndex一旦不产生升序，那就是说明需要移动
    //         if (newIndex >= maxNewIndexSoFar) {
    //           maxNewIndexSoFar = newIndex
    //         } else {
    //           moved = true
    //         }
    //         patch(prevChild, c2[newIndex], container, null, parentComponent)
    //         patched++
    //       }
    //     }
    //     // * 5.3 这一步的情况是：老孩子中只存在存在于新孩子中的节点
    //     // * 但是顺序可能不是新孩子中的顺序，并且新孩子中可能还会有新的节点未创建
    //     // * 所以这一步就是去移动这些可以复用的节点，以及将新的节点创建
    //     // * 移动老孩子的话，是需要借助最长递增子序列的
    // const increasingNewIndexSequence = moved
    //   ? getSequence(newIndexToOldIndexMap)
    //   : []
    // console.log(newIndexToOldIndexMap, 'newIndexToOldIndexMap')
    // console.log(increasingNewIndexSequence, 'increasingNewIndexSequence')
    // let j = increasingNewIndexSequence.length - 1
    // // * 倒序遍历是为了插入节点时，便于获取到锚点
    // for (i = toBePatched - 1; i >= 0; i--) {
    //   const nextIndex = s2 + i
    //   const nextChild = c2[nextIndex]
    //   const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor
    //   // * 之前说过，这个数组中保存的0是为了区分新孩子是否是新增的
    //   if (newIndexToOldIndexMap[i] === 0) {
    //     patch(null, nextChild, container, anchor, parentComponent)
    //   } else if (moved) {
    //     // * 这里就是说如果需要移动
    //     // * 判断依据就是，j是最长递增子序列的倒序遍历索引
    //     // * 如果j < 0了就说明最长递增子序列已经排完了，此时的元素都是需要移动的
    //     // * 如果当前的i索引不是最长递增子序列中保存的索引就说明也需要移动
    //     if (j < 0 || i !== increasingNewIndexSequence[j]) {
    //       hostInsert(nextChild.el, container, anchor)
    //     } else {
    //       // * 这里是如果当前索引i在最长递增子序列中也就是说不需要移动
    //       // * 所以只需要更新j指针，用来更新当前遍历的最长递增子序列的位置即可
    //       j--
    //     } 
    //   }
    //     }
    //   }
    // }
    // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    //   let i = 0;
    //   const l2 = c2.length
    //   let e1 = c1.length - 1
    //   let e2 = l2 - 1
    //   const isSameVNode = (n1, n2) => {
    //     return n1.type === n2.type && n1.key === n2.key
    //   }
    //   // 1.
    //   while (i <= e1 && i <= e2) {
    //     const prevChild = c1[i]
    //     const nextChild = c2[i]
    //     if (isSameVNode(prevChild, nextChild)) {
    //       patch(
    //         prevChild,
    //         nextChild,
    //         container,
    //         parentAnchor,
    //         parentComponent
    //       )
    //     } else {
    //       break
    //     }
    //     i++
    //   }
    //   // 2.
    //   while (i <= e1 && i <= e2) {
    //     const prevChild = c1[e1]
    //     const nextChild = c2[e2]
    //     if (isSameVNode(prevChild, nextChild)) {
    //       patch(
    //         prevChild,
    //         nextChild,
    //         container,
    //         parentAnchor,
    //         parentComponent
    //       )
    //     } else {
    //       break
    //     }
    //     e1--
    //     e2--
    //   }
    //   // 3. 添加新节点
    //   if (i > e1 && i <= e2) {
    //     const anchor = e2 + 1 < l2 ? c2[e2 + 1].el : parentAnchor
    //     while (i <= e2) {
    //       patch(
    //         null,
    //         c2[i],
    //         container,
    //         anchor,
    //         parentComponent
    //       )
    //       i++
    //     }    
    //   } 
    //   // 4. 删除老节点
    //   else if (i > e2 && i <= e1) {
    //     while (i <= e1) {
    //       hostRemove(c1[i].el)
    //       i++
    //     }
    //   }
    //   // 5. 未知序列 
    //   else {
    //     const s1 = i
    //     const s2 = i
    //     const keyToNewIndexMap = new Map()
    //     for (i = s2; i <= e2; i++) {
    //       keyToNewIndexMap.set(c2[i].key, i)
    //     }
    //     let patched = 0
    //     let toBePatched = e2 - s2 + 1
    //     let moved
    //     let patchedSoFar = 0
    //     let newIndexToOldIndexMap = new Array(toBePatched)
    //     for (i = 0; i < toBePatched; i++) {
    //       newIndexToOldIndexMap[i] = 0
    //     }
    //     for (let i = s1; i <= e1; i++) {
    //       const prevChild = c1[i]
    //       if (patched > toBePatched) {
    //         hostRemove(prevChild.el)
    //       }
    //       let newIndex
    //       if (prevChild.key !== null) {
    //         newIndex = keyToNewIndexMap.get(prevChild.key)
    //       } else {
    //         for (let i = s2; i <= e2; i++) {
    //           if (isSameVNode(prevChild, c2[i])) {
    //             newIndex = i
    //             break
    //           } 
    //         }
    //       }
    //       if (newIndex === undefined) {
    //         hostRemove(prevChild.el)
    //       } else {
    //         newIndexToOldIndexMap[newIndex - s2] = i + 1
    //         if (newIndex >= patchedSoFar) {
    //           patchedSoFar = newIndex
    //         } else {
    //           moved = true
    //         }
    //         patch(
    //           prevChild, 
    //           c2[newIndex], 
    //           container, 
    //           parentAnchor, 
    //           parentComponent
    //         )
    //         patched++
    //       }
    //     }
    //     const increasingNewIndexSequence = moved
    //       ? getSequence(newIndexToOldIndexMap)
    //       : []
    //     let j = increasingNewIndexSequence.length - 1
    //     for (let i = toBePatched - 1; i >= 0; i--) {
    //       const nextPos = s2 + i
    //       const anchor = nextPos + 1 < l2 ? c2[nextPos + 1].el : parentAnchor 
    //       if (newIndexToOldIndexMap[i] === 0) {
    //         patch(
    //           null,
    //           c2[nextPos],
    //           container,
    //           anchor,
    //           parentComponent
    //         )
    //       } else {
    //         if (j < 0 || increasingNewIndexSequence[j] !== i) {
    //           hostInsert(c2[nextPos].el, container, anchor)
    //         } else {
    //           j--
    //         }
    //       }
    //     }
    //   }
    // }
    // * vue2 双端对比diff算法
    // function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
    //   let oldStartIndex = 0
    //   let oldEndIndex = c1.length - 1
    //   let newStartIndex = 0
    //   let newEndIndex = c2.length - 1
    //   let oldStartVNode = c1[oldStartIndex]
    //   let oldEndVNode = c1[oldEndIndex]
    //   let newStartVNode = c2[newStartIndex]
    //   let newEndVNode = c2[newEndIndex]
    //   let keyToOldIdx
    //   const isSameVNode = (n1, n2) => {
    //     return n1.type === n2.type && n1.key === n2.key
    //   }
    //   while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    //     oldStartVNode = c1[oldStartIndex]
    //     oldEndVNode = c1[oldEndIndex]
    //     newStartVNode = c2[newStartIndex]
    //     newEndVNode = c2[newEndIndex]
    //     if (keyToOldIdx && keyToOldIdx.get(oldStartVNode.key) === -1) {
    //       oldStartIndex++
    //     } else if (keyToOldIdx && keyToOldIdx.get(oldEndVNode.key) === -1) {
    //       oldEndIndex--
    //     } else if (isSameVNode(oldStartVNode, newStartVNode)) {
    //       patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent)
    //       oldStartIndex++
    //       newStartIndex++
    //     } else if (isSameVNode(oldEndVNode, newEndVNode)) {
    //       patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent)
    //       oldEndIndex--
    //       newEndIndex--
    //     } else if (isSameVNode(oldStartVNode, newEndVNode)) {
    //       patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent)
    //       hostInsert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
    //       oldStartIndex++
    //       newEndIndex--
    //     } else if (isSameVNode(oldEndVNode, newStartVNode)) {
    //       patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent)
    //       hostInsert(oldEndVNode.el, container, oldStartVNode.el)
    //       oldEndIndex--
    //       newStartIndex++
    //     } else {
    //       if (!keyToOldIdx) keyToOldIdx = generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2)
    //       const key = newStartVNode.key
    //       const oldIdx = keyToOldIdx.get(key)
    //       if (oldIdx >= 0) {
    //         const oldVNode = c1[oldIdx]
    //         patch(oldVNode, newStartVNode, container, parentAnchor, parentComponent)
    //         hostInsert(oldVNode.el, container, oldStartVNode.el)
    //         keyToOldIdx.set(key, -1)
    //       } else {
    //         patch(null, newStartVNode, container, oldStartVNode.el, parentComponent)
    //       }
    //       newStartIndex++
    //     }
    //   }
    //   if (oldStartIndex > oldEndIndex && newStartIndex <= newEndIndex) {
    //     const anchor = c2[newEndIndex + 1] ? c2[newEndIndex + 1].el : null
    //     console.log(anchor)
    //     while (newStartIndex <= newEndIndex) {
    //       patch(null, c2[newStartIndex], container, anchor, parentComponent)
    //       newStartIndex++
    //     } 
    //   } else if (newStartIndex > newEndIndex && oldStartIndex <= oldEndIndex) {
    //     while (oldStartIndex <= oldEndIndex) {
    //       hostRemove(c1[oldStartIndex].el)
    //       oldStartIndex++
    //     } 
    //   }
    // }
    // function generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2) {
    //   const map = new Map()
    //   for (let i = newStartIndex; i <= newEndIndex; i++) {
    //     const key = c2[i].key
    //     map.set(key, -1)
    //   }
    //   for (let i = oldStartIndex; i <= oldEndIndex; i++) {
    //     const oldKey = c1[i].key
    //     if (map.has(oldKey)) {
    //       map.set(oldKey, i)
    //     }
    //   }
    //   return map
    // }
    function patchKeyedChildren(c1, c2, container, parentAnchor, parentComponent) {
        let oldStartIndex = 0;
        let newStartIndex = 0;
        let oldEndIndex = c1.length - 1;
        let newEndIndex = c2.length - 1;
        const isSameVNode = (n1, n2) => {
            return n1.type === n2.type && n1.key === n2.key;
        };
        let oldStartVNode = c1[oldStartIndex];
        let newStartVNode = c2[newStartIndex];
        let oldEndVNode = c1[oldEndIndex];
        let newEndVNode = c2[newEndIndex];
        let keyToOldIndex;
        while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
            oldStartVNode = c1[oldStartIndex];
            newStartVNode = c2[newStartIndex];
            oldEndVNode = c1[oldEndIndex];
            newEndVNode = c2[newEndIndex];
            debugger;
            if (keyToOldIndex && keyToOldIndex.get(oldStartVNode.key) === -1) {
                oldStartIndex++;
            }
            else if (keyToOldIndex && keyToOldIndex.get(oldEndVNode.key) === -1) {
                oldEndIndex--;
            }
            else if (isSameVNode(oldStartVNode, newStartVNode)) {
                patch(oldStartVNode, newStartVNode, container, parentAnchor, parentComponent);
                oldStartIndex++;
                newStartIndex++;
            }
            else if (isSameVNode(oldEndVNode, newEndVNode)) {
                patch(oldEndVNode, newEndVNode, container, parentAnchor, parentComponent);
                oldEndIndex--;
                newEndIndex--;
            }
            else if (isSameVNode(oldStartVNode, newEndVNode)) {
                patch(oldStartVNode, newEndVNode, container, parentAnchor, parentComponent);
                hostInsert(oldStartVNode.el, container, oldEndVNode.el.nextSibling);
                oldStartIndex++;
                newEndIndex--;
            }
            else if (isSameVNode(oldEndVNode, newStartVNode)) {
                patch(oldEndVNode, newStartVNode, container, parentAnchor, parentComponent);
                hostInsert(oldEndVNode.el, container, oldStartVNode.el);
                oldEndIndex--;
                newStartIndex++;
            }
            else {
                keyToOldIndex = keyToOldIndex || generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2);
                let oldIndex = keyToOldIndex.get(newStartVNode.key);
                if (oldIndex !== -1) {
                    let oldVNode = c1[oldIndex];
                    patch(oldVNode, newStartVNode, container, parentAnchor, parentComponent);
                    hostInsert(oldVNode.el, container, oldStartVNode.el);
                    keyToOldIndex.set(newStartVNode.key, -1);
                }
                else {
                    patch(null, newStartVNode, container, oldStartVNode.el, parentComponent);
                }
                newStartIndex++;
            }
        }
        if (oldStartIndex <= oldEndIndex) {
            while (oldStartIndex <= oldEndIndex) {
                hostRemove(c1[oldStartIndex].el);
                oldStartIndex++;
            }
        }
        else if (newStartIndex <= newEndIndex) {
            // const anchor = oldEndIndex === c1.length - 1 ? null : oldEndVNode.el
            const anchor = newEndIndex > c2.length - 1 ? null : c2[newEndIndex + 1].el;
            while (newStartIndex <= newEndIndex) {
                patch(null, c2[newStartIndex], container, anchor, parentComponent);
                newStartIndex++;
            }
        }
    }
    function generateMap(oldStartIndex, oldEndIndex, newStartIndex, newEndIndex, c1, c2) {
        const map = new Map();
        for (let i = newStartIndex; i <= newEndIndex; i++) {
            map.set(c2[i].key, -1);
        }
        for (let i = oldStartIndex; i <= oldEndIndex; i++) {
            if (map.has(c1[i].key)) {
                map.set(c1[i].key, i);
            }
        }
        return map;
    }
    function mountElement(vnode, container, anchor, parentComponent) {
        const el = document.createElement(vnode.type);
        hostCreateElement(vnode.type);
        const { props = {}, children, shapeFlag } = vnode;
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        for (let key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
        vnode.el = el;
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach(child => {
            patch(null, child, container, null, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        console.log('processComponent', n2, 'component vnode');
        if (!n1) {
            mountComponent(n2, container, parentComponent);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2, container) {
        console.log('updateComponent');
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            console.log('should not update');
            n2.el = n1.el;
            n2.component = n1.component;
            instance.vnode = n2;
        }
    }
    function mountComponent(vnode, container, parentComponent) {
        const instance = (vnode.component = createComponentInstance(vnode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, container);
    }
    function setupRenderEffect(instance, container, parentComponent) {
        function componentRenderEffect() {
            if (!instance.isMounted) {
                const { proxy, vnode } = instance;
                const subTree = instance.render.call(proxy);
                // 子树subTree
                // vnode -> patch
                patch(null, subTree, container, null, instance);
                instance.subTree = subTree;
                vnode.el = subTree.el;
                instance.isMounted = true;
                console.log(`组件${vnode.type.name} 完成初次挂载`);
            }
            else {
                // console.log('update effect componentRender', instance)
                const { next, vnode, proxy } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const prevSubTree = instance.subTree;
                const nextSubTree = instance.render.call(proxy);
                nextSubTree.el = prevSubTree.el;
                patch(prevSubTree, nextSubTree, container, null, instance);
                instance.subTree = nextSubTree;
                vnode.el = nextSubTree.el;
            }
        }
        instance.update = effect(componentRenderEffect, {
            scheduler() {
                console.log('scheduler');
                queueJob(instance.update);
            }
        });
    }
    function updateComponentPreRender(instance, nextVNode) {
        nextVNode.component = instance;
        instance.vnode = nextVNode;
        instance.next = null;
        const { props } = nextVNode;
        instance.props = props;
    }
    return {
        createApp: createAppAPI(render)
    };
}

function createElement(type) {
    return document.createElement(type);
}
const isOn = (key) => /^on[A-Z]/.test(key);
function patchProp(el, key, prevVal, newVal) {
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.removeEventListener(event, prevVal);
        el.addEventListener(event, newVal);
    }
    else {
        if (newVal === undefined || newVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, newVal);
        }
    }
}
function insert(el, container, anchor) {
    // console.log(el, container, anchor)
    // container.append(el)
    container.insertBefore(el, anchor);
}
function setElementText(el, text) {
    el.textContent = text;
}
function remove(el) {
    const parentNode = el.parentNode;
    if (parentNode) {
        parentNode.removeChild(el);
    }
}
let render = null;
function ensureRender() {
    return (render ||
        (render = createRenderer({
            createElement,
            patchProp,
            insert,
            setElementText,
            remove
        })));
}
const createApp = (...args) => {
    return ensureRender().createApp(...args);
};

export { createApp, createRenderer, createTextVNode, effect, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, ref, renderSlots };
