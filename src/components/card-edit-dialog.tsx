"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteCard, editCard } from "@/lib/deck-actions";

export interface CardRow {
  id: string;
  front: string;
  back: string;
  source: string;
  createdAt: Date;
  masteryRound?: number; // 0|1|2|3, undefined for backward compat
  pausedAt: Date | null;
}

interface CardEditDialogProps {
  card: CardRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditForm({ card, onClose }: { card: CardRow; onClose: () => void }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setFront(card.front);
    setBack(card.back);
    setSaveError(null);
    setDeleteError(null);
    setShowDeleteConfirm(false);
  }, [card.front, card.back]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await editCard(card.id, front, back);
      onClose();
    } catch {
      setSaveError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCard(card.id);
      onClose();
    } catch {
      setDeleteError("Couldn't delete. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-base font-medium">Delete this card?</p>
          <p className="text-sm text-muted-foreground mt-1">
            This can&apos;t be undone.
          </p>
        </div>
        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}
        <Button
          variant="destructive"
          className="w-full h-11"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
        </Button>
        <Button
          variant="outline"
          className="w-full h-11"
          disabled={deleting}
          onClick={() => setShowDeleteConfirm(false)}
        >
          Keep card
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-front" className="text-sm font-medium">
          Native word
        </label>
        <Input
          id="card-front"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          disabled={saving}
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="card-back" className="text-sm font-medium">
          Target word
        </label>
        <Input
          id="card-back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          disabled={saving}
          className="h-11"
        />
      </div>
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      <Button
        variant="default"
        className="w-full h-11"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
      </Button>
      <Button
        variant="outline"
        className="w-full h-11"
        disabled={saving}
        onClick={onClose}
      >
        Discard changes
      </Button>
      <div className="border-t pt-4 mt-2">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm text-destructive hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="size-4" />
          Delete card
        </button>
      </div>
    </div>
  );
}

export function CardEditDialog({
  card,
  open,
  onOpenChange,
}: CardEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>
        {card && <EditForm card={card} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
