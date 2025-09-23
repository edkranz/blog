import { tinaField } from "tinacms/dist/react";
import { Page, PageBlocks } from "../../tina/__generated__/types";
import { Hero } from "./hero";
import { Content } from "./content";
import { Features } from "./features";
import { Testimonial } from "./testimonial";
import { Video } from "./video";
import { Callout } from "./callout";
import { Stats } from "./stats";
import { CallToAction } from "./call-to-action";
import { Liquid } from "./liquid";
import { ProfileCard } from "./profile-card";

export const Blocks = (props: Omit<Page, "id" | "_sys" | "_values">) => {
  if (!props.blocks) return null;
  return (
    <>
      {props.blocks.map(function (block, i) {
        return (
          <div key={i} data-tina-field={tinaField(block)}>
            <Block {...block} />
          </div>
        );
      })}
    </>
  );
};

const Block = (block: PageBlocks) => {
  const t = (block as any).__typename;
  if (t === "PageBlocksLiquid") return <Liquid data={(block as any)} />;
  if (t === "PageBlocksVideo") return <Video data={block as any} />;
  if (t === "PageBlocksHero") return <Hero data={block as any} />;
  if (t === "PageBlocksCallout") return <Callout data={block as any} />;
  if (t === "PageBlocksStats") return <Stats data={block as any} />;
  if (t === "PageBlocksContent") return <Content data={block as any} />;
  if (t === "PageBlocksFeatures") return <Features data={block as any} />;
  if (t === "PageBlocksTestimonial") return <Testimonial data={block as any} />;
  if (t === "PageBlocksCta") return <CallToAction data={block as any} />;
  if (t === "PageBlocksProfileCard") return <ProfileCard data={(block as any)} />;
  return null;
};
