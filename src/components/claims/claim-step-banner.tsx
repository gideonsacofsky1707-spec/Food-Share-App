import type { ClaimStatus } from "@/types/database";

const TONE_CLASSNAMES = {
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  primary: "bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-200",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

function getStepInfo({
  status,
  isOwner,
  hasRated,
}: {
  status: ClaimStatus;
  isOwner: boolean;
  hasRated: boolean;
}): { tone: keyof typeof TONE_CLASSNAMES; icon: string; message: string } {
  switch (status) {
    case "requested":
      return {
        tone: "amber",
        icon: "⏳",
        message: isOwner
          ? "Waiting for you to respond to this request."
          : "Waiting for the owner to respond to your request.",
      };
    case "accepted":
      return {
        tone: "primary",
        icon: "✅",
        message: isOwner
          ? "Accepted — arrange pickup in the chat below."
          : "Accepted — here's the pickup address.",
      };
    case "completed":
      return {
        tone: "blue",
        icon: "🎉",
        message: hasRated
          ? "Collected — thanks for rating this exchange!"
          : "Collected — please rate your experience below.",
      };
    case "declined":
      return { tone: "neutral", icon: "—", message: "This request was declined." };
    case "cancelled":
      return { tone: "neutral", icon: "—", message: "This request was cancelled." };
  }
}

// Makes the current step of the claim flow obvious at a glance, so neither
// party has to infer it from a bare status word or guess what to do next.
export function ClaimStepBanner({
  status,
  isOwner,
  hasRated,
  pickupAddress,
}: {
  status: ClaimStatus;
  isOwner: boolean;
  hasRated: boolean;
  pickupAddress?: string | null;
}) {
  const step = getStepInfo({ status, isOwner, hasRated });

  return (
    <div className={`flex flex-col gap-1 rounded-md px-3 py-2 text-sm ${TONE_CLASSNAMES[step.tone]}`}>
      <p className="font-medium">
        <span aria-hidden="true">{step.icon}</span> {step.message}
      </p>
      {status === "accepted" &&
        !isOwner &&
        (pickupAddress ? (
          <p>{pickupAddress}</p>
        ) : (
          <p>The owner hasn&apos;t set a full address for this listing yet.</p>
        ))}
    </div>
  );
}
