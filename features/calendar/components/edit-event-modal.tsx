"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { deleteEvent, updateEvent } from "@/features/calendar/actions";
import type { CalendarEvent } from "@/features/calendar/types";
import { EventForm } from "./event-form";

export function EditEventModal({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
}) {
  if (!event) return null;
  const boundUpdate = updateEvent.bind(null, event.id);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Edit Event</ModalTitle>
        </ModalHeader>
        <EventForm
          action={boundUpdate}
          initialValues={{
            title: event.title,
            location: event.location,
            notes: event.notes,
            startAt: new Date(event.startAt),
            endAt: new Date(event.endAt),
          }}
          submitLabel="Save Changes"
          onDelete={() => {
            deleteEvent(event.id);
            onOpenChange(false);
          }}
        />
      </ModalContent>
    </Modal>
  );
}
