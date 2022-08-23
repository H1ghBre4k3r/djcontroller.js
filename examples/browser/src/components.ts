/** A 2D vector. */
export type Vec2 = { x: number; y: number; }

/** A partial 2D vector. */
export type PartialVec2 = { x?: number; y?: number; }

/** An alignment along the x-axis. */
export type HorizontalAlignment = 'leading' | 'center' | 'trailing';

/** An alignment along the y-axis. */
export type VerticalAlignment = 'top' | 'center' | 'bottom';

/** A component that can be rendered to a canvas at a given position. */
export type Component = (ctx: CanvasRenderingContext2D | undefined, start: Vec2) => Vec2;

/** Adds two 2D vectors. */
export function add(lhs: PartialVec2, rhs: PartialVec2): Vec2 {
  return { x: (lhs.x ?? 0) + (rhs.x ?? 0), y: (lhs.y ?? 0) + (rhs.y ?? 0) };
}

/** Scales a 2D vector. */
export function scale(lhs: PartialVec2, rhs: number): Vec2 {
  return { x: (lhs.x ?? 0) * rhs, y: (lhs.y ?? 0) * rhs };
}

/** Swaps the components of a 2D vector. */
export function transpose(vec: Vec2): Vec2 {
  return { y: vec.x, x: vec.y };
}

/** Computes the aligned offset within the given bounds. */
function align(alignment: HorizontalAlignment | VerticalAlignment, totalSize: number, size: number): number {
  switch (alignment) {
  case 'top':
  case 'leading':
    return 0;
  case 'center':
    return totalSize / 2 - size / 2;
  case 'bottom':
  case 'trailing':
    return totalSize - size;
  default:
    throw new Error(`Invalid alignment: ${alignment}`);
  }
}

/** Renders the given component to the given canvas. */
export function render(
  component: Component,
  canvas: HTMLCanvasElement,
  options: {
    resizeToFit?: boolean,
  } = {}
) {
  const start = { x: 0, y: 0 };
  const size = component(null, start);

  if (options.resizeToFit) {
    if (size.x !== canvas.width) {
      canvas.width = size.x;
    }
    if (size.y !== canvas.height) {
      canvas.height = size.y;
    }
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  component(ctx, start);
}

/** Compoutes the size of the given component. */
function componentSize(component: Component): Vec2 {
  return component(null, { x: 0, y: 0 });
}

/** Composes components horizontally. */
export function hStack(
  components: Component[],
  options: {
    alignment?: VerticalAlignment,
  } = {}
): Component {
  const alignment = options.alignment ?? 'center';
  const sizes = components.map(componentSize);
  const totalHeight = sizes.reduce((acc, size) => Math.max(acc, size.y), 0);
  return (ctx, start) => {
    let pos = start;
    let totalSize = { x: 0, y: 0 };
    components.forEach((component, i) => {
      const size = sizes[i];
      const offset = align(alignment, totalHeight, size.y);
      component(ctx, add(pos, { y: offset }));
      pos = add(pos, { x: size.x });
      totalSize = {
        x: totalSize.x + size.x,
        y: Math.max(totalSize.y, size.y),
      };
    });
    return totalSize;
  };
}

/** Composes components vertically. */
export function vStack(
  components: Component[],
  options: {
    alignment?: HorizontalAlignment,
  } = {}
): Component {
  const alignment = options.alignment ?? 'center';
  const sizes = components.map(componentSize);
  const totalWidth = sizes.reduce((acc, size) => Math.max(acc, size.x), 0);
  return (ctx, start) => {
    let pos = start;
    let totalSize = { x: 0, y: 0 };
    components.forEach((component, i) => {
      const size = sizes[i];
      const offset = align(alignment, totalWidth, size.x);
      component(ctx, add(pos, { x: offset }));
      pos = add(pos, { y: size.y });
      totalSize = {
        x: Math.max(totalSize.x, size.x),
        y: totalSize.y + size.y,
      };
    });
    return totalSize;
  };
}

/** Composes components above each other. */
export function zStack(
  components: Component[],
  options: {
    hAlignment?: HorizontalAlignment,
    vAlignment?: VerticalAlignment,
  } = {}
): Component {
  const hAlignment = options.hAlignment ?? 'center';
  const vAlignment = options.vAlignment ?? 'center';
  const sizes = components.map(componentSize);
  const totalSize = sizes.reduce((acc, size) => ({ x: Math.max(acc.x, size.x), y: Math.max(acc.y, size.y) }), { x: 0, y: 0 });
  return (ctx, start) => {
    components.forEach((component, i) => {
      const size = sizes[i];
      const offset = {
        x: align(hAlignment, totalSize.x, size.x),
        y: align(vAlignment, totalSize.y, size.y),
      };
      component(ctx, add(start, offset));
    });
    return totalSize;
  };
}

/** Creates a primitive rectangle component with a fixed size. */
export function rectangle(
  size: Vec2,
  options: {
    fill?: string | CanvasGradient | CanvasPattern
  } = {}
): Component {
  return (ctx, start) => {
    if (ctx) {
      if (options.fill) {
        ctx.fillStyle = options.fill;
      }
      ctx.fillRect(start.x, start.y, size.x, size.y);
    }
    return size;
  };
}

/** Creates a primitive empty component with a fixed size. */
export function spacer(size: Vec2 = { x: 0, y: 0 }): Component {
  return () => {
    return size;
  };
}

/** Wraps the given component in padding. */
export function padding(
  component: Component,
  options: {
    size?: number,
    horizontal?: boolean,
    vertical?: boolean,
  } = {}
): Component {
  const size = options.size ?? 5;
  let wrapped = component;

  if (options.horizontal ?? true) {
    const hSpace = { x: size, y: 0 };
    wrapped = hStack([
      spacer(hSpace),
      wrapped,
      spacer(hSpace),
    ]);
  }

  if (options.vertical ?? true) {
    const vSpace = { x: 0, y: size };
    wrapped = vStack([
      spacer(vSpace),
      wrapped,
      spacer(vSpace),
    ]);
  }

  return wrapped;
}

/** Wraps the component in an offset. */
export function translation(
  component: Component,
  offset: PartialVec2
): Component {
  return (ctx, start) => {
    const size = component(ctx, add(start, offset));
    return add(size, offset);
  };
}

/** Rotates the component by a certain angle (in radians), optionally with a custom anchor (offset from the center). */
export function rotation(
  component: Component,
  angle: number,
  options: {
    anchorOffset?: Vec2,
  } = {}
): Component {
  const size = componentSize(component);
  return (ctx, start) => {
    if (ctx) {
      const center = add(add(start, scale(size, 0.5)), options.anchorOffset ?? {});
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(angle);
      ctx.translate(-center.x, -center.y);
      component(ctx, start);
      ctx.restore();
    }
    return size;
  };
}
