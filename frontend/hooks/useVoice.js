import { useState, useRef } from "react";

export default function useVoice() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startVoice = (onResult) => {
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    // stop previous session if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const recognition = recognitionRef.current || new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult?.(text);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    setListening(true);

    setTimeout(() => {
      try {
        recognition.start();
      } catch (err) {
        console.log("Start error:", err);
      }
    }, 50);
  };

  // ⭐ VERY IMPORTANT: RETURN MUST EXIST
  return {
    startVoice,
    listening,
  };
}