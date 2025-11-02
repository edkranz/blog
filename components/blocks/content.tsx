"use client";
import React from "react";

import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { Template } from "tinacms";
import { PageBlocksContent } from "../../tina/__generated__/types";
import { tinaField } from "tinacms/dist/react";
import { Section } from "../layout/section";
import { FloatingBackdrop } from "../layout/floating-backdrop";
import { GlassCard } from "../ui/glass-card";
import { motion } from "motion/react";
import { mermaid } from "./mermaid";
import { sectionBlockSchemaField } from '../layout/section';
import { scriptCopyBlockSchema, ScriptCopyBtn } from "../magicui/script-copy-btn";
import { components } from "../mdx-components";

export const Content = ({ data }: { data: PageBlocksContent }) => {
  return (
    <Section className="px-4">
      <FloatingBackdrop>
        <motion.div 
          initial={{ opacity: 0, y: 18 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <GlassCard 
            className="max-w-3xl mx-auto p-6 sm:p-8"
            data-tina-field={tinaField(data, "body")}
          >
            <div className="prose prose-lg dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 dark:prose-p:text-foreground/90 prose-strong:text-foreground dark:prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-foreground/90 dark:prose-code:text-foreground/90 prose-pre:bg-slate-900/50 dark:prose-pre:bg-slate-950/80 prose-blockquote:border-l-foreground/20 dark:prose-blockquote:border-l-foreground/30 prose-blockquote:text-foreground/80 dark:prose-blockquote:text-foreground/80 w-full max-w-none">
              <TinaMarkdown
                content={data.body}
                components={{
                  mermaid,
                  scriptCopyBlock: (props: any) => <ScriptCopyBtn {...props} />,
                  ...components,
                }}
              />
            </div>
          </GlassCard>
        </motion.div>
      </FloatingBackdrop>
    </Section>
  );
};

export const contentBlockSchema: Template = {
  name: "content",
  label: "Content",
  ui: {
    previewSrc: "/blocks/content.png",
    defaultItem: {
      body: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra non, semper suscipit, posuere a, pede.",
    },
  },
  fields: [
    sectionBlockSchemaField as any,
    {
      type: "rich-text",
      label: "Body",
      name: "body",
      templates: [
        scriptCopyBlockSchema,
      ],
    }
  ],
};
