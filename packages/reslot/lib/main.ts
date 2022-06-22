import {
  createElement,
  FC,
  memo,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type SlotOptions = {
  /**
   * Indicate asyncMode for async data handling
   * restartable (default): process only the latest async value and skip previous async value
   * concurrent: allow multiple async updating
   * sequential: process async values sequentially
   * droppable: ignore any async value added while other async data is processing
   */
  asyncMode?: "droppable" | "sequential" | "restartable" | "concurrent";
  onAsyncError?: (error: any) => void;
};

export type WithExtra<E, O extends SlotOptions = SlotOptions> = O & {
  extra: E;
};

export type RenderSlot<T> = {
  (): ReactNode;
  <R>(render: (value: T) => R, fallback?: ReactNode): ReactElement;
  (fallback: ReactNode): ReactNode;
};

export type UseSlotOptions = SlotOptions & { autoInvalidate?: boolean };

export type UseSlot = {
  <T>(initialValue: T): [RenderSlot<T>, UpdateSlotValue<T, never>];
  <T>(initialValue: T, options: UseSlotOptions): [
    RenderSlot<T>,
    UpdateSlotValue<T, never>
  ];
  <T, E>(initialValue: T, options: WithExtra<E, UseSlotOptions>): [
    RenderSlot<T>,
    UpdateSlotValue<T, E>
  ];
};

export type UdpateFunction<T, E> = (
  prev: T,
  context: UpdateContext<T, E>
) => T | Promise<T>;

export type UpdateParam<T, E> = T | Promise<T> | UdpateFunction<T, E>;

export type UpdateContext<T, E> = {
  shared: Record<string, any>;
  extra: E;
  /**
   * sometimes the previous of update callback is outdated we use this to get current value of the slot
   * ```js
   * updateSlot(async (prev, context) => {
   *  await something();
   *  // prev is outdated now, you should use context.getValue()
   * })
   * ```
   */
  getValue(): T;
};

export type Slot<T, E, O extends SlotOptions = SlotOptions> = [
  RenderSlot<T>,
  UpdateSlotValue<T, E>
] & {
  getValue(): T;
  changeOptions(options: O): void;
};

export type CreateSlot = {
  <T>(initialValue: T): Slot<T, never>;
  <T>(initialValue: T, options: SlotOptions): Slot<T, never>;
  <T, E>(initialValue: T, options: WithExtra<E>): Slot<T, E, WithExtra<E>>;
};

export type UpdateSlotValue<T, E> = (value: UpdateParam<T, E>) => void;

type SlotProps = {
  getValue: Function;
  subscribe: Function;
  getFallback: Function;
  render: Function;
};

const FALLBACK = {};

const createCallbackGroup = () => {
  const callbacks = new Set<Function>();
  return {
    add(callback: Function) {
      callbacks.add(callback);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        callbacks.delete(callback);
      };
    },
    call(...args: any[]) {
      if (args.length > 2) {
        callbacks.forEach((callback) => callback(...args));
      } else if (args.length === 2) {
        callbacks.forEach((callback) => callback(args[0], args[1]));
      } else if (args.length === 1) {
        callbacks.forEach((callback) => callback(args[0]));
      } else {
        callbacks.forEach((callback) => callback());
      }
    },
  };
};

const SlotInner = memo(
  ({ render, subscribe, getValue, getFallback }: SlotProps) => {
    const [renderOption, rerender] = useState<any>();
    const prevValueRef = useRef<any>();
    prevValueRef.current = getValue();

    useEffect(() => {
      return subscribe((nextValue: any) => {
        if (nextValue === FALLBACK) {
          rerender(FALLBACK);
          return;
        }
        if (nextValue === prevValueRef.current) return;
        rerender({});
      });
    }, [subscribe, rerender, getFallback]);

    return (
      (renderOption === FALLBACK ? getFallback() : undefined) ??
      render(prevValueRef.current)
    );
  }
);

/**
 * SlotWrapper makes fallback value stable, Slot component can access fallback value through getFallback function
 * @param props
 */
const SlotWrapper: FC<
  Omit<SlotProps, "getFallback"> & { fallback?: ReactNode }
> = ({ fallback, ...props }) => {
  const fallbackRef = useRef<ReactNode>();
  const getFallback = useCallback(() => fallbackRef.current, []);
  fallbackRef.current = fallback;
  return createElement(SlotInner, { ...props, getFallback });
};

const isPromiseLike = (value: any): value is Promise<any> => {
  return value && typeof value.then === "function";
};

/**
 * create a slot that can be used globally
 * @param initialValue
 * @param options
 * @returns
 */
export const createSlot: CreateSlot = (
  initialValue: any,
  options: SlotOptions = {}
): any => {
  const listeners = createCallbackGroup();
  const shared = {};
  let currentValue = initialValue;
  let updatedToken = {};
  let lastPromise: any;
  const getValue = () => currentValue;
  const subscribe = listeners.add;

  const update = (value: UpdateParam<any, any>) => {
    lastPromise = undefined;
    let nextValue =
      typeof value === "function"
        ? (value as UdpateFunction<any, any>)(currentValue, {
            getValue,
            shared,
            // passing extra data to updateFn
            extra: (options as WithExtra<any, SlotOptions>).extra,
          })
        : value;

    if (isPromiseLike(nextValue)) {
      const asyncMode = options.asyncMode ?? "restartable";
      if (asyncMode === "droppable" && lastPromise) {
        return;
      }
      if (asyncMode === "sequential" && lastPromise) {
        const promise = nextValue;
        nextValue = lastPromise.then(() => promise) as Promise<any>;
      }

      const token = updatedToken;
      listeners.call(FALLBACK);
      lastPromise = nextValue
        .then((value: any) => {
          // there is somechange since last time
          if (options?.asyncMode === "restartable" && token !== updatedToken)
            return;
          update(value);
        })
        .catch((ex: any) => {
          // there is somechange since last time
          if (options?.asyncMode === "restartable" && token !== updatedToken)
            return;
          options.onAsyncError?.(ex);
        });
      return;
    }
    if (nextValue === currentValue) return;
    updatedToken = {};
    currentValue = nextValue;
    listeners.call(currentValue);
  };

  const render = (...args: any[]) => {
    let render: Function;
    let fallback: ReactNode | undefined;

    if (!args.length) {
      render = getValue;
    }
    // slot(render, fallback?)
    else if (typeof args[0] === "function") {
      [render, fallback] = args;
    } else {
      render = getValue;
      [fallback] = args;
    }

    return createElement(SlotWrapper, {
      getValue,
      subscribe,
      render,
      fallback,
    });
  };

  return Object.assign([render, update], {
    getValue,
    changeOptions(newOptions: any) {
      Object.assign(options, newOptions);
    },
  });
};

export const useSlot: UseSlot = (
  initialValue: any,
  options?: UseSlotOptions
): any => {
  const rerender = useState<any>()[1];
  const errorRef = useRef<any>();
  const slot = useState(() => createSlot(initialValue, options as any))[0];

  slot.changeOptions({
    ...options,
    onAsyncError(error) {
      if (options?.onAsyncError) {
        options.onAsyncError(error);
      } else {
        errorRef.current = error;
        rerender({});
      }
    },
  });

  if (errorRef.current) {
    const error = errorRef.current;
    errorRef.current = undefined;
    throw error;
  }

  useEffect(() => {
    if (options?.autoInvalidate) {
      slot[1](initialValue);
    }
  });

  return slot;
};
