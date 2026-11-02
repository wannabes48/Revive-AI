import React from "react";

export interface FaqItem {
  id: string | number;
  question: string;
  answer: string;
}

export interface FaqRow {
  id: string | number;
  speed?: string;
  direction?: "left" | "right";
  faqItems: FaqItem[];
}

export interface FaqSectionData {
  mainTitle: string;
  mainSubtitle: string;
  rows: FaqRow[];
}

export interface FaqCardProps {
  question: string;
  answer: string;
}

/**
 * FaqCard
 * Reusable card for a single FAQ item.
 */
export const FaqCard: React.FC<FaqCardProps> = ({ question, answer }) => {
  return (
    <div className="flex flex-col items-start gap-3 p-5 sm:p-6 bg-card/90 dark:bg-card border border-border/80 rounded-[14px] shadow-sm hover:shadow-md hover:border-primary/40 transition-all w-[270px] sm:w-96 max-w-[85vw] flex-shrink-0 faq-card text-left">
      <h3 className="font-heading text-lg font-bold text-foreground faq-title leading-snug">
        {question}
      </h3>
      <p className="text-sm text-muted-foreground faq-answer leading-relaxed">
        {answer}
      </p>
    </div>
  );
};

export interface HorizontalScrollerProps {
  children: React.ReactNode;
  speed?: string;
  direction?: "left" | "right";
}

/**
 * HorizontalScroller
 * Wraps children and creates a seamless horizontal looping animation.
 */
export const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({
  children,
  speed = "40s",
  direction = "left",
}) => {
  const animationClass =
    direction === "right"
      ? "animate-scroll-horizontal-reverse"
      : "animate-scroll-horizontal";

  // Inline style to set the CSS custom property for scroll duration.
  const style = { "--scroll-duration": speed } as React.CSSProperties;

  return (
    <div className="w-full overflow-hidden group relative scroller-mask py-2">
      <div className={`flex ${animationClass}`} style={style}>
        <div className="flex items-stretch justify-center flex-shrink-0 gap-6 px-3">
          {children}
        </div>
        {/* duplicate for seamless loop */}
        <div
          className="flex items-stretch justify-center flex-shrink-0 gap-6 px-3"
          aria-hidden="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export interface FaqSectionProps {
  data: FaqSectionData;
}

/**
 * FaqSection
 * Assembles title, subtitle, and multiple horizontal rows.
 */
const FaqSection: React.FC<FaqSectionProps> = ({ data }) => {
  return (
    <div className="relative flex flex-col items-center gap-10 py-10 w-full max-w-7xl mx-auto">
      <div className="flex flex-col items-center gap-3 text-center z-10 max-w-2xl px-4">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Questions & Answers
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          {data.mainTitle}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {data.mainSubtitle}
        </p>
      </div>

      <div className="flex flex-col gap-6 z-10 w-full overflow-hidden">
        {data.rows.map((row) => (
          <HorizontalScroller
            key={row.id}
            speed={row.speed}
            direction={row.direction}
          >
            {row.faqItems.map((item) => (
              <FaqCard
                key={item.id}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </HorizontalScroller>
        ))}
      </div>
    </div>
  );
};

export default FaqSection;
