"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Info, Loader2, Mic, Square } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { Button } from "@/components/ui/button";
import { InterruptPrompt } from "@/components/ui/interrupt-prompt";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { useAutosizeTextArea } from "@/hooks/use-autosize-textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  submitOnEnter?: boolean;
  stop?: () => void;
  isGenerating: boolean;
  enableInterrupt?: boolean;
  transcribeAudio?: (blob: Blob) => Promise<string>;
}

export function MessageInput({
  placeholder = "Ask AI...",
  className,
  onKeyDown: onKeyDownProp,
  submitOnEnter = true,
  stop,
  isGenerating,
  enableInterrupt = true,
  transcribeAudio,
  ...props
}: MessageInputProps) {
  const [showInterruptPrompt, setShowInterruptPrompt] = useState(false);

  const { isListening, isSpeechSupported, isRecording, isTranscribing, audioStream, toggleListening, stopRecording } =
    useAudioRecording({
      transcribeAudio,
      onTranscriptionComplete: (text) => {
        props.onChange?.({ target: { value: text } } as any);
      },
    });

  useEffect(() => {
    if (!isGenerating) {
      setShowInterruptPrompt(false);
    }
  }, [isGenerating]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (isGenerating && stop && enableInterrupt) {
        if (showInterruptPrompt) {
          stop();
          setShowInterruptPrompt(false);
          event.currentTarget.form?.requestSubmit();
        } else if (props.value) {
          setShowInterruptPrompt(true);
          return;
        }
      }

      event.currentTarget.form?.requestSubmit();
    }

    onKeyDownProp?.(event);
  };

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [textAreaHeight, setTextAreaHeight] = useState<number>(0);

  useEffect(() => {
    if (textAreaRef.current) {
      setTextAreaHeight(textAreaRef.current.offsetHeight);
    }
  }, []);

  useAutosizeTextArea({
    ref: textAreaRef,
    maxHeight: 240,
    borderWidth: 1,
    dependencies: [props.value],
  });

  return (
    <div className="relative flex w-full">
      {enableInterrupt && <InterruptPrompt isOpen={showInterruptPrompt} close={() => setShowInterruptPrompt(false)} />}

      <RecordingPrompt isVisible={isRecording} onStopRecording={stopRecording} />

      <div className="relative flex w-full items-center">
        <div className="relative flex-1">
          <textarea
            aria-label="Write your prompt here"
            placeholder={placeholder}
            ref={textAreaRef}
            onKeyDown={onKeyDown}
            className={cn(
              "z-10 w-full grow resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 pr-14 font-manrope text-sm text-text-main shadow-sm ring-offset-background transition-[border] placeholder:text-gray-400 focus-visible:border-mentor-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mentor-teal/20 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            {...props}
          />
        </div>
      </div>

      <div className="absolute top-2 right-2 z-20 flex gap-1.5">
        {isSpeechSupported && (
          <Button
            type="button"
            variant="ghost"
            className={cn("h-8 w-8", isListening && "text-mentor-teal")}
            aria-label="Voice input"
            size="icon"
            onClick={toggleListening}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
        {isGenerating && stop ? (
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 rounded-xl bg-brand-navy text-white hover:bg-brand-navy-light"
            aria-label="Stop generating"
            onClick={stop}
          >
            <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-xl bg-brand-navy text-white transition-all hover:bg-brand-navy-light active:scale-95"
            aria-label="Send message"
            disabled={props.value === "" || isGenerating}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </div>

      <RecordingControls
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        audioStream={audioStream}
        textAreaHeight={textAreaHeight}
        onStopRecording={stopRecording}
      />
    </div>
  );
}
MessageInput.displayName = "MessageInput";

interface RecordingPromptProps {
  isVisible: boolean;
  onStopRecording: () => void;
}

function RecordingPrompt({ isVisible, onStopRecording }: RecordingPromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ top: 0, filter: "blur(5px)" }}
          animate={{
            top: -40,
            filter: "blur(0px)",
            transition: {
              type: "spring",
              filter: { type: "tween" },
            },
          }}
          exit={{ top: 0, filter: "blur(5px)" }}
          className="absolute left-1/2 flex -translate-x-1/2 cursor-pointer overflow-hidden whitespace-nowrap rounded-full border bg-background py-1 text-center text-muted-foreground text-sm"
          onClick={onStopRecording}
        >
          <span className="mx-2.5 flex items-center">
            <Info className="mr-2 h-3 w-3" />
            Click to finish recording
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface RecordingControlsProps {
  isRecording: boolean;
  isTranscribing: boolean;
  audioStream: MediaStream | null;
  textAreaHeight: number;
  onStopRecording: () => void;
}

function RecordingControls({
  isRecording,
  isTranscribing,
  audioStream,
  textAreaHeight,
  onStopRecording,
}: RecordingControlsProps) {
  if (isRecording) {
    return (
      <div className="absolute inset-[1px] z-50 overflow-hidden rounded-xl" style={{ height: textAreaHeight - 2 }}>
        <AudioVisualizer stream={audioStream} isRecording={isRecording} onClick={onStopRecording} />
      </div>
    );
  }

  if (isTranscribing) {
    return (
      <div className="absolute inset-[1px] z-50 overflow-hidden rounded-xl" style={{ height: textAreaHeight - 2 }}>
        <TranscribingOverlay />
      </div>
    );
  }

  return null;
}

function TranscribingOverlay() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-mentor-teal" />
        <motion.div
          className="absolute inset-0 h-8 w-8 animate-pulse rounded-full bg-mentor-teal/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>
      <p className="mt-4 font-medium text-sm text-text-main">Transcribing audio...</p>
    </motion.div>
  );
}
