import { useState } from "react";
import { useFetcher } from "react-router";
import { Star } from "lucide-react";
import { cn } from "~/lib/utils";

export function StarRatingDisplay({
  average,
  count,
  size = "sm",
}: {
  average: number | null;
  count: number;
  size?: "sm" | "md";
}) {
  const starSize = size === "sm" ? "size-3" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  if (count === 0 || average === null) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", textSize)}>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={cn(starSize, "text-muted-foreground/25")} />
          ))}
        </div>
        <span>No ratings yet</span>
      </div>
    );
  }

  const filled = Math.round(average);

  return (
    <div className={cn("flex items-center gap-1", textSize)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              starSize,
              s <= filled
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25"
            )}
          />
        ))}
      </div>
      <span className="font-medium">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({count} {count === 1 ? "rating" : "ratings"})
      </span>
    </div>
  );
}

export function StarRatingInput({
  courseSlug,
  currentRating,
}: {
  courseSlug: string;
  currentRating: number | null;
}) {
  const fetcher = useFetcher();
  const [hovered, setHovered] = useState<number | null>(null);

  const pendingRating =
    fetcher.state !== "idle"
      ? Number(fetcher.formData?.get("rating"))
      : null;
  const displayRating = hovered ?? pendingRating ?? currentRating ?? 0;

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {currentRating ? "Update your rating" : "Rate this course"}
      </p>
      <fetcher.Form
        method="post"
        action={`/courses/${courseSlug}`}
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="submit"
            name="rating"
            value={star}
            className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-none"
            onMouseEnter={() => setHovered(star)}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                "size-6",
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </fetcher.Form>
      {currentRating && (
        <p className="mt-1 text-xs text-muted-foreground">
          Your rating: {currentRating} star{currentRating !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
