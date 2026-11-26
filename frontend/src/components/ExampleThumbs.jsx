import React, { useState } from "react";
import { EXAMPLES } from "../data/examples";

// Example pictures for one type (group), shown inside its box.
// 2 or 3 pictures: a row of small tiles. Exactly 1 picture: it stretches across the whole box.
// A picture whose file doesn't exist quietly disappears (and the layout adapts).
const ExampleThumbs = ({ group, size = "h-12 w-12" }) => {
  const [failed, setFailed] = useState(() => new Set());

  const list = EXAMPLES[group];
  if (!list || list.length === 0) return null;

  const visible = list.filter((src) => !failed.has(src));
  if (visible.length === 0) return null;

  const markFailed = (src) => setFailed((prev) => new Set(prev).add(src));

  if (visible.length === 1) {
    return (
      <div className="mt-2 flex min-h-12 w-full flex-1">
        <img
          src={visible[0]}
          alt=""
          draggable={false}
          onError={() => markFailed(visible[0])}
          className="h-full w-full rounded-lg bg-white object-cover"
        />
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      {visible.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          onError={() => markFailed(src)}
          className={`${size} rounded-lg bg-white object-contain p-0.5`}
        />
      ))}
    </div>
  );
};

export default ExampleThumbs;