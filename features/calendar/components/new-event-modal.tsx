"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { createEvent } from "@/features/calendar/actions";
import { EventForm } from "./event-form";

export function NewEventModal({
  open,
  onOpenChange,
  startAt,
  endAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: Date;
  endAt: Date;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Event</ModalTitle>
        </ModalHeader>
        <EventForm action={createEvent} initialValues={{ startAt, endAt }} submitLabel="Create Event" />
      </ModalContent>
    </Modal>
  );
}
