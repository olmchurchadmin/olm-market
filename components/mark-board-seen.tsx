"use client";

import { useEffect, useRef } from "react";
import { markBoardSeenAction } from "@/lib/actions/board-seen";

/** Marks the board as read after mount — keeps RSC free of side effects. */
export function MarkBoardSeen() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void markBoardSeenAction();
  }, []);

  return null;
}
