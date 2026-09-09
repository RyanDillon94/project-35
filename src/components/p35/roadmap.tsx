import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PHASES, countdownTo } from "@/lib/project35";
import { Map, Timer } from "lucide-react";

function BlockCountdown({ end }: { end: string }) {
  const { weeks, days } = countdownTo(new Date(`${end}T00:00:00Z`));
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Timer className="size-3.5 text-primary" />
      {days > 0 ? `${weeks} weeks / ${days} days to block end` : "Block complete"}
    </p>
  );
}

export function Roadmap() {
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <Map className="size-5 text-primary" />
        <h2 className="text-lg font-bold">3-Year Macro Roadmap</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Six phases. Two blocks each. November 2029.</p>

      <Accordion type="single" collapsible defaultValue="phase-1" className="mt-4">
        {PHASES.map((phase) => (
          <AccordionItem key={phase.id} value={`phase-${phase.id}`} className="border-border">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex w-full flex-col items-start gap-1.5 pr-2 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold">
                    Phase {phase.id}: {phase.title}
                  </span>
                  <Badge
                    className={
                      phase.status === "active"
                        ? "bg-primary/20 text-primary hover:bg-primary/25"
                        : "bg-muted text-muted-foreground hover:bg-muted"
                    }
                  >
                    {phase.status === "active" ? "Active" : "Upcoming"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {phase.window} &mdash; {phase.summary}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {phase.badges.map((b) => (
                    <Badge key={b} variant="outline" className="border-primary/40 text-[11px] text-primary">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="block-0">
                <TabsList className="grid w-full grid-cols-2">
                  {phase.blocks.map((block, i) => (
                    <TabsTrigger key={block.name} value={`block-${i}`} className="text-xs">
                      Block {i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {phase.blocks.map((block, i) => (
                  <TabsContent key={block.name} value={`block-${i}`} className="mt-3 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">{block.name}</p>
                      <p className="stat-label mt-0.5">{block.window}</p>
                    </div>
                    <BlockCountdown end={block.end} />
                    <div className="flex flex-wrap gap-1.5">
                      {block.focus.map((f) => (
                        <Badge key={f} className="bg-surface-2 text-[11px] text-foreground hover:bg-surface-2">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <ul className="space-y-1.5">
                      {block.bullets.map((line) => (
                        <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                ))}
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
