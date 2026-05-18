"use client";

import type { Extensions } from "@tiptap/core";
import { CharacterCount } from "@tiptap/extension-character-count";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell as TableCellExt } from "@tiptap/extension-table-cell";
import { TableHeader as TableHeaderExt } from "@tiptap/extension-table-header";
import { TableRow as TableRowExt } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Youtube } from "@tiptap/extension-youtube";
import StarterKit from "@tiptap/starter-kit";

export function getTiptapExtensions({
  placeholder = "Start writing your content...",
  editable = true,
}: {
  placeholder?: string;
  editable?: boolean;
} = {}): Extensions {
  return [
    StarterKit.configure({
      codeBlock: false, // We use custom CodeBlock
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        class: "text-primary underline underline-offset-4 hover:text-primary/80",
      },
    }),
    CharacterCount,
    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: "rounded-lg max-w-full h-auto",
      },
    }),
    Youtube.configure({
      width: 640,
      height: 360,
      HTMLAttributes: {
        class: "rounded-lg overflow-hidden",
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "border-collapse table-auto w-full",
      },
    }),
    TableRowExt,
    TableHeaderExt,
    TableCellExt,
    CodeBlock.configure({
      HTMLAttributes: {
        class: "bg-muted text-muted-foreground rounded-lg p-4 font-mono text-sm overflow-x-auto",
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: "is-editor-empty",
    }),
  ].filter(Boolean) as Extensions;
}
