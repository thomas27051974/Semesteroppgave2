"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { moveApplication } from "@/server/actions/applications";

type Card = { id: string; candidateName: string; candidateId: string; appliedAt: string };
type Column = { id: string; title: string; type: string; cards: Card[] };

export function Board({ columns: initial }: { columns: Column[] }) {
  const t = useTranslations();
  const [columns, setColumns] = useState(initial);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragEnd(event: DragEndEvent) {
    const cardId = String(event.active.id);
    const toStageId = event.over?.id ? String(event.over.id) : null;
    if (!toStageId) return;
    let fromStageId: string | null = null;
    for (const col of columns) {
      if (col.cards.some((c) => c.id === cardId)) {
        fromStageId = col.id;
        break;
      }
    }
    if (!fromStageId || fromStageId === toStageId) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === fromStageId) return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        if (col.id === toStageId) {
          const card = prev.flatMap((c) => c.cards).find((c) => c.id === cardId);
          return card ? { ...col, cards: [...col.cards, card] } : col;
        }
        return col;
      }),
    );

    start(async () => {
      try {
        await moveApplication(cardId, toStageId);
      } catch (err) {
        console.error(err);
        // Best-effort rollback by re-fetching the page would happen via revalidate.
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-flow-col auto-cols-[18rem] gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn key={col.id} column={col} emptyLabel={t("admin.noCandidatesInStage")} />
        ))}
      </div>
      {pending && <p className="text-xs text-slate-500">Lagrer …</p>}
    </DndContext>
  );
}

function KanbanColumn({ column, emptyLabel }: { column: Column; emptyLabel: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={
        "flex h-full min-h-[400px] flex-col rounded-lg border p-2 " +
        (isOver ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50")
      }
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{column.title}</h2>
        <span className="text-xs text-slate-500">{column.cards.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {column.cards.length === 0 && <p className="px-1 text-xs text-slate-400">{emptyLabel}</p>}
        {column.cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ card }: { card: Card }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.7 : 1 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-brand-300 active:cursor-grabbing"
    >
      <Link
        href={`/admin/kandidater/${card.candidateId}`}
        className="text-sm font-medium hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {card.candidateName}
      </Link>
      <p className="mt-1 text-xs text-slate-500">
        Søkt {new Date(card.appliedAt).toLocaleDateString("nb-NO")}
      </p>
    </div>
  );
}
