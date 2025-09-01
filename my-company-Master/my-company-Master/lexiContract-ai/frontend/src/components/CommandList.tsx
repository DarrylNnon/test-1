import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Sparkles } from 'lucide-react';

interface CommandListProps {
  items: { title: string }[];
  command: (item: { title: string }) => void;
}

const CommandList = forwardRef((props: CommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  const downHandler = () => setSelectedIndex((selectedIndex + 1) % props.items.length);
  const enterHandler = () => selectItem(selectedIndex);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
      if (event.key === 'ArrowUp') { upHandler(); return true; }
      if (event.key === 'ArrowDown') { downHandler(); return true; }
      if (event.key === 'Enter') { enterHandler(); return true; }
      return false;
    },
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 border text-sm">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            key={index}
            className={`flex items-center w-full text-left px-3 py-2 rounded-md ${index === selectedIndex ? 'bg-indigo-50' : ''}`}
            onClick={() => selectItem(index)}
          >
            <Sparkles className="h-4 w-4 mr-2 text-indigo-500" /> {item.title}
          </button>
        ))
      ) : ( <div className="p-2">No result</div> )}
    </div>
  );
});

CommandList.displayName = 'CommandList';
export default CommandList;