- [`RESLOT`](#reslot)
  - [Installation](#installation)
  - [Motivation](#motivation)
  - [Rceipes](#rceipes)
    - [Synchronous Slot](#synchronous-slot)
    - [Asynchronous Slot](#asynchronous-slot)
    - [Infinite loading](#infinite-loading)
    - [Using slot globally](#using-slot-globally)

# `RESLOT`

A React hook to create a slot that can update dynamic

## Installation

**with NPM**

```bash
npm i reslot --save
```

**with YARN**

```bash
yarn add reslot
```

## Motivation

Let's say that you have a host component, it contains many parts and you need to update some of them frequently, other parts need to be stable. Reslot lets you create dynamically updated slots without affecting other parts and it doesn't even cause the host component to re-render. It frees you from wrapping components with the memo() and implementing global subscribe/publishing logic (like Redux store) to solve this problem

## Rceipes

### Synchronous Slot

```jsx
import { useSlot } from "reslot";

const App = () => {
  // useSlot retrieves initialValue as an argument, it returns slot creating and updating functions
  const [counterSlot, updateCounterSlot] = useSlot(0);
  // update slot when button is clicked
  const handleIncrement = () => updateCounterSlot((prev) => prev + 1);

  return (
    <>
      <BigDataTable />
      {/* create simple slot that renders current slot value */}
      <h1>Counter: {counterSlot()}</h1>
      {/* create a slot that renders the result of custom render function */}
      <h1>Double Counter: {counterSlot((x) => x * 2)}</h1>
      <button onClick={handleIncrement}>Increment</button>
    </>
  );
};
```

Compare to using normal way

```js
// create Redux store here
const store = createStore();
// create reducer code here

const CounterSlot = memo(() => {
  return useSelector((state) => state.count);
});

const DoubleCounterSlot = memo(() => {
  return useSelector((state) => state.count * 2);
});

const App = () => {
  const dispatch = useDispatch();
  const handleIncrement = () => dispatch({ type: "Increment" });

  return (
    <>
      <BigDataTable />
      <h1>
        Counter: <CounterSlot />
      </h1>
      <h1>
        Double Counter: <DoubleCounter />
      </h1>
      <button onClick={handleIncrement}>Increment</button>
    </>
  );
};
```

With the way above you can do a similar thing to what Reslot does, but you must write much code and bring local logic to the global store

### Asynchronous Slot

```jsx
import { useSlot } from "reslot";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const App = () => {
  // Assuming that we want to render a counter whose initial value is 0. In reslot, it means
  // we need to define a counter slot for it.

  // Step 1: Register a rendering slot with the initial value of 0 by calling useSlot(0). It will
  // return a tuple of utility functions:
  // + counterSlot(): use it to mark a slot in this parent component.
  // + updateCounterSlot(): use it to trigger a re-rendering of all marked slots within this parent component.
  const [counterSlot, updateCounterSlot] = useSlot(0);

  // Step 2: Define when a slot re-rendering will be triggered. For example, in our case slots will be re-rendered
  // when the Increment button is clicked.
  const handleIncrement = () =>
    // update slot function can retrieve async value or async function as an argument
    updateCounterSlot((prev) => delay(2000).then(() => prev + 1));

  return (
    <>
      <BigDataTable />
      {
        // Step 3: Mark slots. For example, in our case, the counter slot is only the changing counter value.
        // Also note that it is possible to customize rendering using this overload counterSlot(render, fallback),
        // such as showing a loading indicator when the slot is being updated in our example.
      }
      <h1>Counter: {counterSlot(<div>Loading...</div>)}</h1>
      <button onClick={handleIncrement}>Increment</button>
    </>
  );
};
```

### Infinite loading

```jsx
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadData = (start, count) => {
  return delay(2000).then(() =>
    new Array(count).fill(null).map((_, index) => index + start)
  );
};

const App = () => {
  const [slot, updateSlot] = useSlot([]);
  const handleLoadMore = () => {
    updateSlot((prev) =>
      loadData(prev.length, 10).then((next) => prev.concat(next))
    );
  };

  return (
    <>
      <h1>Infinite Article List</h1>
      {slot((articles) => articles.map((x) => <div key={x}>Article: {x}</div>))}
      {slot(
        () => (
          <button onClick={handleLoadMore}>Load more</button>
        ),
        <div>Loading...</div>
      )}
    </>
  );
};
```

### Using slot globally

```js
// create a global slot for storing current theme
const [theme, updateTheme] = createSlot("light");

const getThemedStyle = (type) =>
  type === "dark"
    ? { color: "white", backgroundColor: "black" }
    : { color: "black", backgroundColor: "white" };

const ThemeSwitcher = () =>
  theme((value) => (
    <button onClick={() => updateTheme(value === "dark" ? "light" : "dark")}>
      {value}
    </button>
  ));

const ThemedBox = () =>
  theme((value) => {
    const style = getThemedStyle(value);
    return (
      <div
        style={{
          ...style,
          width: 200,
          padding: 20,
          border: "5px solid silver",
        }}
      >
        Hello World
      </div>
    );
  });

const App = () => (
  <>
    <ThemeSwitcher />
    <ThemedBox />
  </>
);
```
