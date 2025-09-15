import { Button } from "antd";
import { ArrowLeft, Volume2 } from "lucide-react";

export default function OnboardingHeader({ onBack, onSkip, onSpeak, speakLoading }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-3">
      <button className="p-2 rounded-full hover:bg-neutral-100 kib-focus" onClick={onBack} aria-label="Zurück">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="ml-auto flex items-center gap-2">
        {onSkip && (
          <button className="px-2 py-1 text-sm rounded-full hover:bg-neutral-100 kib-focus" onClick={onSkip}>
            Überspringen
          </button>
        )}
        <Button icon={<Volume2 className="w-4 h-4" />} onClick={onSpeak} loading={speakLoading} className="rounded-full">
          Vorlesen
        </Button>
      </div>
    </div>
  );
}
