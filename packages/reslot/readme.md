- [`RESLOT`](#reslot)
  - [Installation](#installation)
  - [Motivation](#motivation)
  - [Rceipes](#rceipes)
    - [Synchronous Slot](#synchronous-slot)
    - [Asynchronous Slot](#asynchronous-slot)
    - [Infinite loading](#infinite-loading)

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

### Asynchronous Slot

```jsx
import { useSlot } from "reslot";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const App = () => {
  const [counterSlot, updateCounterSlot] = useSlot(0);
  // update slot function can retrieve async value or async function as an argument
  const handleIncrement = () =>
    updateCounterSlot((prev) => delay(2000).then(() => prev + 1));

  return (
    <>
      <BigDataTable />
      {/* show loading indicator when slot is updating, you can use an overload slot(render, fallback) to customize rendering */}
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
