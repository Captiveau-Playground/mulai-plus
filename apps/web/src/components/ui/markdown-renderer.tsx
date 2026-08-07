import React, { Suspense } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  children: string;
}

// URL telanjang (http/https & /explore internal) yang harus dijadikan link
const BARE_URL_RE = /(^|[\s(])((?:https?:\/\/[^\s)]+|\/explore\/[a-zA-Z0-9_./-]+))/g;
// UTM untuk link internal explore dari chatbot
const CHAT_UTM = "utm_source=chatbot&utm_medium=widget&utm_campaign=chat_link";

function withUtm(url: string): string {
  if (url.startsWith("/explore/") && !url.includes("?")) {
    return `${url}?${CHAT_UTM}`;
  }
  return url;
}

function remarkLinkifyUrls() {
  return (tree: any) => {
    const replacements: { node: any; index: number; parent: any; nodes: any[] }[] = [];
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      const value = String(node.value ?? "");
      BARE_URL_RE.lastIndex = 0;
      if (!BARE_URL_RE.test(value)) return;

      const nodes: any[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      BARE_URL_RE.lastIndex = 0;
      while (true) {
        m = BARE_URL_RE.exec(value);
        if (m === null) break;
        if (m.index > last) nodes.push({ type: "text", value: value.slice(last, m.index) });
        if (m[1]) nodes.push({ type: "text", value: m[1] });
        nodes.push({ type: "link", url: withUtm(m[2]), children: [{ type: "text", value: m[2] }] });
        last = m.index + m[0].length;
      }
      if (last < value.length) nodes.push({ type: "text", value: value.slice(last) });
      if (index !== undefined && parent) replacements.push({ node, index, parent, nodes });
    });

    for (const { index, parent, nodes } of replacements) {
      parent.children.splice(index, 1, ...nodes);
    }
  };
}

export function MarkdownRenderer({ children }: MarkdownRendererProps) {
  return (
    <div className="min-w-0 space-y-3 font-manrope [overflow-wrap:anywhere]">
      <Markdown remarkPlugins={[remarkGfm, remarkLinkifyUrls]} components={COMPONENTS}>
        {children}
      </Markdown>
    </div>
  );
}

interface HighlightedPre extends React.HTMLAttributes<HTMLPreElement> {
  children: string;
  language: string;
}

const HighlightedPre = React.memo(async ({ children, language, ...props }: HighlightedPre) => {
  const { codeToTokens, bundledLanguages } = await import("shiki");

  if (!(language in bundledLanguages)) {
    return <pre {...props}>{children}</pre>;
  }

  const { tokens } = await codeToTokens(children, {
    lang: language as keyof typeof bundledLanguages,
    defaultColor: false,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return (
    <pre {...props}>
      <code>
        {tokens.map((line, lineIndex) => (
          <>
            <span key={lineIndex}>
              {line.map((token, tokenIndex) => {
                const style = typeof token.htmlStyle === "string" ? undefined : token.htmlStyle;

                return (
                  <span
                    key={tokenIndex}
                    className="bg-shiki-light-bg text-shiki-light dark:bg-shiki-dark-bg dark:text-shiki-dark"
                    style={style}
                  >
                    {token.content}
                  </span>
                );
              })}
            </span>
            {lineIndex !== tokens.length - 1 && "\n"}
          </>
        ))}
      </code>
    </pre>
  );
});
HighlightedPre.displayName = "HighlightedCode";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  className?: string;
  language: string;
}

const CodeBlock = ({ children, className, language, ...restProps }: CodeBlockProps) => {
  const code = typeof children === "string" ? children : childrenTakeAllStringContents(children);

  const preClass = cn(
    "overflow-x-scroll rounded-md border bg-background/50 p-4 font-mono text-sm [scrollbar-width:none]",
    className,
  );

  return (
    <div className="group/code relative mb-4">
      <Suspense
        fallback={
          <pre className={preClass} {...restProps}>
            {children}
          </pre>
        }
      >
        <HighlightedPre language={language} className={preClass}>
          {code}
        </HighlightedPre>
      </Suspense>

      <div className="invisible absolute top-2 right-2 flex space-x-1 rounded-lg p-1 opacity-0 transition-all duration-200 group-hover/code:visible group-hover/code:opacity-100">
        <CopyButton content={code} copyMessage="Copied code to clipboard" />
      </div>
    </div>
  );
};

function childrenTakeAllStringContents(element: any): string {
  if (typeof element === "string") {
    return element;
  }

  if (element?.props?.children) {
    const children = element.props.children;

    if (Array.isArray(children)) {
      return children.map((child) => childrenTakeAllStringContents(child)).join("");
    }
    return childrenTakeAllStringContents(children);
  }

  return "";
}

const COMPONENTS: Components = {
  h1: withClass("h1", "text-2xl font-semibold"),
  h2: withClass("h2", "font-semibold text-xl"),
  h3: withClass("h3", "font-semibold text-lg"),
  h4: withClass("h4", "font-semibold text-base"),
  h5: withClass("h5", "font-medium"),
  strong: withClass("strong", "font-semibold"),
  a: withClass("a", "text-mentor-teal break-words underline underline-offset-2 hover:text-mentor-teal-dark"),
  blockquote: withClass("blockquote", "border-l-2 border-primary pl-4"),
  code: ({ children, className, node, ...rest }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <CodeBlock className={className} language={match[1]} {...rest}>
        {children}
      </CodeBlock>
    ) : (
      <code
        className={cn(
          "font-mono [:not(pre)>&]:rounded-md [:not(pre)>&]:bg-background/50 [:not(pre)>&]:px-1 [:not(pre)>&]:py-0.5",
        )}
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => children,
  ol: withClass("ol", "list-decimal space-y-1.5 pl-5"),
  ul: withClass("ul", "list-disc space-y-1.5 pl-5"),
  li: withClass("li", "my-1 leading-relaxed"),
  table: ({ children, ...props }: any) => (
    // Tabel: wrap dalam kontainer scroll horizontal supaya tidak menciut di panel sempit
    <div className="my-1 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-foreground/15">
      <table className="w-full min-w-[380px] border-collapse text-[13px]" {...props}>
        {children}
      </table>
    </div>
  ),
  th: withClass(
    "th",
    "whitespace-nowrap border border-foreground/15 bg-muted/60 px-2.5 py-1.5 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
  ),
  td: withClass(
    "td",
    "border border-foreground/15 px-2.5 py-1.5 text-left align-top [&[align=center]]:text-center [&[align=right]]:text-right",
  ),
  tr: withClass("tr", "m-0 border-t border-foreground/15 p-0"),
  p: withClass("p", "whitespace-pre-wrap break-words"),
  hr: withClass("hr", "border-foreground/20"),
};

function withClass(Tag: keyof React.JSX.IntrinsicElements, classes: string) {
  const Component = ({ node, ...props }: any) => (
    // eslint-disable-next-line react/display-name
    <Tag className={classes} {...props} />
  );
  Component.displayName = Tag;
  return Component;
}

export default MarkdownRenderer;
