import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { useSlot } from "./main";

test("simple slot", () => {
  let renderCount = 0;
  const App = () => {
    const [slot, updateSlot] = useSlot(0);
    renderCount++;
    return (
      <div data-testid="value" onClick={() => updateSlot((prev) => prev + 1)}>
        {slot()}
      </div>
    );
  };
  const { getByTestId } = render(<App />);

  expect(getByTestId("value").textContent).toBe("0");
  expect(renderCount).toBe(1);
  fireEvent.click(getByTestId("value"));
  expect(getByTestId("value").textContent).toBe("1");
  expect(renderCount).toBe(1);
});

test("auto invalidate", () => {
  let renderCount = 0;
  const App = (props: { value: number }) => {
    const [slot, updateSlot] = useSlot(props.value, { autoInvalidate: true });
    renderCount++;
    return (
      <div data-testid="value" onClick={() => updateSlot((prev) => prev + 1)}>
        {slot((x) => x)}
      </div>
    );
  };
  const { getByTestId, rerender } = render(<App value={0} />);

  expect(getByTestId("value").textContent).toBe("0");
  expect(renderCount).toBe(1);
  fireEvent.click(getByTestId("value"));
  expect(getByTestId("value").textContent).toBe("1");
  expect(renderCount).toBe(1);
  rerender(<App value={2} />);
  expect(renderCount).toBe(2);
  expect(getByTestId("value").textContent).toBe("2");
});
