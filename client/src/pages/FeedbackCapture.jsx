import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Mic, Square, CheckCircle2, AlertCircle, BrainCircuit, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';

export default function FeedbackCapture() {
  const { businessId } = useParams();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [askingContact, setAskingContact] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [kioskConfig, setKioskConfig] = useState(null);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(0);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (!businessId) return;
    const fetchBiz = async () => {
      try {
        const d = await getDoc(doc(db, 'businesses', businessId));
        if (d.exists()) {
          setKioskConfig(d.data());
        }
      } catch (err) {
        console.error("Config fetch error:", err);
      }
    };
    fetchBiz();
  }, [businessId]);

  useEffect(() => {
    let timer;
    if (recording) {
      timer = setInterval(() => {
        setTime(t => {
          if (t >= 20) {
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recording]);

  const startRecording = async () => {
    try {
      setRecording(true);
      setError(null);
      setTime(0);
      finalTranscriptRef.current = '';
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.resolvedMimeType = mimeType;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = processAudioAndText;
      mediaRecorder.start();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.onresult = (event) => {
          let tr = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              tr += event.results[i][0].transcript;
            }
          }
          if (tr) finalTranscriptRef.current += tr + ' ';
        };
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error("Microphone Access Error:", err);
      setError(`Microphone access error: ${err.message || "Please allow access to leave feedback."}`);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
  };

    const processAudioAndText = async () => {
    setProcessing(true);
    try {
      const generatedMimeType = mediaRecorderRef.current?.resolvedMimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: generatedMimeType });
      const audioBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const split = reader.result.split(',');
          let ext = 'webm';
          if(generatedMimeType.includes('mp4')) ext = 'mp4';
          if(generatedMimeType.includes('ogg')) ext = 'ogg';

          resolve(`${ext}|${split[1] || split[0]}`);
        };
        reader.readAsDataURL(audioBlob);
      });

      let transcript = finalTranscriptRef.current.trim();
      if (!transcript) {
        transcript = "No clear audio transcribed.";
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: transcript,
          audioBase64: audioBase64 
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze feedback natively.");
      }

      const analysis = await res.json();

      try {
        const payload = {
          text: analysis.text,
          sentiment: analysis.sentiment,
          emotion: analysis.emotion,
          score: analysis.score,
          topics: analysis.topics,
          source: 'link',
          status: 'open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (audioBase64) {
          payload.audioBase64 = audioBase64;
        }

        if (kioskConfig?.collectContact) {
          setPendingFeedback(payload);
          setAskingContact(true);
        } else {
          await addDoc(collection(db, `businesses/${businessId}/feedbacks`), payload);
          setDone(true);
        }
      } catch (dbErr) {
        console.error("Firestore Save Error:", dbErr);
        throw new Error("Failed to save securely to the database: " + (dbErr?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Feedback Processing Error:", err);
      setError(err.message || "An error occurred while processing your feedback. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const finalizeFeedback = async (skipContact = false) => {
    setProcessing(true);
    try {
      const finalPayload = { ...pendingFeedback };
      
      if (!skipContact && contactInfo.trim()) {
        finalPayload.customerContact = contactInfo.trim();
      }
      
      await addDoc(collection(db, `businesses/${businessId}/feedbacks`), finalPayload);
    } catch (e) {
      console.error("Feedback finalizing error:", e);
      setError("Failed to save securely to the database.");
    } finally {
      setProcessing(false);
      setAskingContact(false);
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 selection:bg-accent/20 relative">
        <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-400 transition-colors">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-center p-8 max-w-sm"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">Thank you!</h2>
          <p className="text-muted-foreground font-medium">Your feedback has been securely analyzed and relayed to the manager.</p>
        </motion.div>
      </div>
    );
  }

  if (askingContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 selection:bg-accent/20 relative">
        <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-400 transition-colors z-50">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border p-10 w-full max-w-md text-center relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">Want a follow-up?</h2>
          <p className="text-sm font-medium text-muted-foreground mb-8">Leave your email or number so we can get back to you.</p>
          
          <input 
            type="text" 
            placeholder="Email or Phone Number"
            className="w-full h-12 px-4 rounded-xl border border-input bg-transparent text-sm mb-4 focus:ring-2 focus:ring-accent outline-none transition-all"
            value={contactInfo}
            onChange={e => setContactInfo(e.target.value)}
            disabled={processing}
          />
          
          <div className="flex gap-3">
            <button 
              onClick={() => finalizeFeedback(true)}
              className="flex-1 h-12 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              disabled={processing}
            >
              Skip
            </button>
            <button 
              onClick={() => finalizeFeedback(false)}
              className="flex-1 h-12 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              disabled={processing}
            >
              {processing ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 selection:bg-accent/20 relative">
      <Helmet>
        <title>Provide Feedback | Klyvora AI</title>
      </Helmet>
      <button onClick={toggleTheme} className="absolute top-6 right-6 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-400 transition-colors z-50">
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="absolute top-6 left-6 text-xs text-muted-foreground opacity-50 font-mono hidden md:block">
        Route: {businessId}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border p-10 w-full max-w-md text-center relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">
          {kioskConfig?.kioskTitle || "How was your experience?"}
        </h1>
        <p className="text-[15px] font-medium text-muted-foreground mb-12">
          {kioskConfig?.kioskMessage || "Tap the microphone and speak briefly."}
        </p>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }} 
              className="flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-100 p-4 rounded-xl text-sm mb-8 text-left"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-56 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {processing ? (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin w-16 h-16" />
                  <div className="w-16 h-16 flex items-center justify-center text-accent">
                    <BrainCircuit className="w-8 h-8 opacity-70 animate-pulse" />
                  </div>
                </div>
                <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-accent mt-6">Analyzing Voice</p>
              </motion.div>
            ) : (
              <motion.div key="recording" className="relative group flex items-center justify-center h-full w-full">
                {recording && (
                  <>
                    <motion.div 
                      animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }} 
                      transition={{ duration: 2, repeat: Infinity }} 
                      className="absolute inset-0 bg-rose-500 rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} 
                      transition={{ duration: 2, delay: 0.5, repeat: Infinity }} 
                      className="absolute inset-0 bg-rose-500 rounded-full" 
                    />
                  </>
                )}
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                    recording 
                      ? 'bg-rose-50 border-4 border-rose-500 text-rose-500 scale-110 shadow-[0_0_40px_rgba(244,63,94,0.3)]' 
                      : 'bg-foreground text-background hover:scale-105 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
                  }`}
                >
                  {recording ? <Square className="w-10 h-10 fill-current" /> : <Mic className="w-12 h-12 stroke-[1.5]" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 font-mono text-[13px] font-bold text-muted-foreground uppercase tracking-wider">
          {recording ? (
            <span className="text-rose-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              00:{time.toString().padStart(2, '0')} / 00:20
            </span>
          ) : "UP TO 20 SECONDS"}
        </div>
      </motion.div>
    </div>
  );
}
