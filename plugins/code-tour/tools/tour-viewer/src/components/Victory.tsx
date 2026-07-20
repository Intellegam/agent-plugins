/**
 * Victory easter egg. Copying a review export "finishes" the tour, so we celebrate the way
 * FromSoftware does: an Elden Ring VICTORY screen fills the viewport while the Dark Souls
 * "victory achieved" fanfare plays. It hangs around until the reader clicks (or hits Escape) —
 * a deliberate beat, not a toast.
 *
 * The sound is started from the copy click itself (see `Tour.tsx`) so browser autoplay policy
 * lets it through; this component only owns the image and the dismissal. Both assets are
 * imported so the build inlines them as data: URIs — the overlay works offline in a single file.
 */

import { useEffect } from "react";
import victoryScreen from "./assets/victory-screen.jpg";

export { default as victorySound } from "./assets/victory-sound.mp3";

export function VictoryOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tour-victory" role="dialog" aria-label="Victory" onClick={onClose}>
      <img className="tour-victory-image" src={victoryScreen} alt="Victory" draggable={false} />
    </div>
  );
}
