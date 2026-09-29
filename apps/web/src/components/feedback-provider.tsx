"use client";

import { FeedbackPopup, useFeedbackPopups } from "@/components/feedback-popup";

export function FeedbackProvider() {
  const { openCampaignId, activeFeedback, setOpenCampaignId, handleDismiss, handleComplete } = useFeedbackPopups();

  return (
    <FeedbackPopup
      feedback={activeFeedback}
      open={!!openCampaignId}
      onOpenChange={(open) => {
        if (!open && openCampaignId) {
          handleDismiss(openCampaignId);
        }
        setOpenCampaignId(open ? openCampaignId : null);
      }}
      onComplete={handleComplete}
    />
  );
}
