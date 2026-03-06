### 组件化
```javascript
import React from 'react';

// 组件化核心：将UI拆分为独立、可复用的函数/类
// 函数组件是React 16.8+的主流写法，核心是「返回JSX的纯函数」
function HelloWorld() {
  // JSX是React的语法糖，最终会被编译为React.createElement
  // 这是组件能渲染出界面的核心
  return <div>Hello, React 组件化！</div>;
}

// 导出组件，实现跨文件复用（组件化的核心价值之一）
export default HelloWorld;
```
### 状态（函数式）
```javascript
import React, { useState } from 'react';

function Counter() {
  // useState Hook：React函数组件的状态管理核心
  // 第一个值：当前状态（类似类组件的this.state）
  // 第二个值：更新状态的函数（类似类组件的this.setState）
  // 0 是状态的初始值
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      {/* 点击事件触发状态更新，React会重新渲染组件 */}
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

export default Counter;
```
### 属性
```javascript
function Greeting({ name }) {
  return <div>Hello, {name}!</div>;
}

// 使用
<Greeting name="React" />
```

```js
//案例二
import React from 'react';

// Props核心：父组件向子组件传递数据的唯一方式（只读）
// 这里用解构赋值直接获取props中的name，是React的常用写法
function Greeting({ name, age }) {
  // Props是只读的，不能在子组件中修改（单向数据流）
  return <div>Hello, {name}! You are {age} years old.</div>;
}

// 父组件使用Greeting，并传递props
function App() {
  return (
    <div>
      {/* 像HTML属性一样传递数据给子组件 */}
      <Greeting name="React" age={8} />
      <Greeting name="JavaScript" age={28} />
    </div>
  );
}

export default App;
```



