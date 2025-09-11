import React from 'react';
import { Extension, type Range } from '@tiptap/core';
import { ReactRenderer, type Editor } from '@tiptap/react';
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance, Props } from 'tippy.js';

interface CommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface CommandListProps {
  items: {title: string}[];
  command: (props: { editor: Editor, range: Range, props: any }) => void;
  editor: Editor;
  range: Range;
}

const CommandList = React.forwardRef<CommandListRef, CommandListProps>(
  ({ items, command, editor, range }, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ editor, range, props: { item } });
      }
    };

    React.useEffect(() => setSelectedIndex(0), [items]);

    React.useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return React.createElement(
      'div',
      { className: "bg-white rounded-md shadow-lg border p-1 text-gray-800" },
      items.length
        ? items.map((item, index) =>
            React.createElement(
              'button',
              {
                key: index,
                onClick: () => selectItem(index),
                className: `block w-full text-left px-3 py-1 text-sm rounded ${index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-100'}`
              },
              item.title
            )
          )
        : React.createElement('div', { className: "p-2 text-sm text-gray-500" }, "No results")
    );
  }
);

const renderItems = () => {
  let component: ReactRenderer<CommandListRef>;
  let popup: Instance<Props>[];

  return {
    onStart: (props: SuggestionProps) => {
      component = new ReactRenderer(CommandList, {
        props,
        editor: props.editor,
      });

      popup = tippy('body', {
        getReferenceClientRect: () => {
          const rect = props.clientRect?.();
          return rect || new DOMRect(0, 0, 0, 0);
        },
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },
    onUpdate(props: SuggestionProps) {
      component.updateProps(props);

      popup[0].setProps({
        getReferenceClientRect: () => {
          const rect = props.clientRect?.();
          return rect || new DOMRect(0, 0, 0, 0);
        },
      });
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === 'Escape') {
        popup[0].hide();
        return true;
      }
      return component.ref?.onKeyDown(props);
    },
    onExit() {
      popup[0].destroy();
      component.destroy();
    },
  };
};

export default Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }) => [{ title: 'Generate Clause' }].filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())),
        render: renderItems,
        ...this.options,
      }),
    ];
  },
});