import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { useNavigate } from 'react-router';
import { ArrowDown, Sparkles, BrainCircuit, Mic, BarChart3, ChevronRight, CheckCircle2, Shield, Zap } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Track overall scroll progress of the tall container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // --------------
  // SCROLL ANIMATION CONFIGURATION (0 to 1)
  // --------------

  // HERO TEXT ANIMATIONS (0% to 20% scroll)
  const titleScale = useTransform(smoothProgress, [0, 0.2], [1, 25]);
  const titleOpacity = useTransform(smoothProgress, [0, 0.15, 0.2], [1, 1, 0]);
  const titleY = useTransform(smoothProgress, [0, 0.2], ["0%", "-50%"]);
  
  // BACKGROUND FADE (0% to 20%)
  const bgOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0.4]);

  // FEATURES SECTION REVEAL (15% to 35% scroll)
  const featuresOpacity = useTransform(smoothProgress, [0.15, 0.25, 0.35], [0, 1, 0]);
  const featuresY = useTransform(smoothProgress, [0.15, 0.25], ["100px", "0px"]);

  // HOW IT WORKS SECTION (35% to 55% scroll)
  const howItWorksOpacity = useTransform(smoothProgress, [0.35, 0.45, 0.55], [0, 1, 0]);
  const howItWorksY = useTransform(smoothProgress, [0.35, 0.45], ["100px", "0px"]);

  // DASHBOARD & CTA REVEAL (55% to 80% scroll)
  const dashboardOpacity = useTransform(smoothProgress, [0.55, 0.7], [0, 1]);
  const dashboardY = useTransform(smoothProgress, [0.55, 0.7], ["150px", "0px"]);
  const dashboardScale = useTransform(smoothProgress, [0.55, 0.7, 1], [0.9, 1, 1]);


  return (
    // Increased height to 500vh to fit more content smoothly
    <div ref={containerRef} className="h-[500vh] bg-zinc-950 text-zinc-50 selection:bg-zinc-800">
      
      {/* 
        STICKY WRAPPER
        This layer stays stuck to the viewport while we scroll down the tall container. 
        It handles all visual elements depending on the scroll position.
      */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center">
        
        {/* Background Overlay */}
        <motion.div 
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Subtle Grid - Professional dot pattern instead of gradient */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')] opacity-30" />
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* SECTION 1: THE CINEMATIC HERO VOID                 */}
        {/* ═══════════════════════════════════════════════ */}
        <motion.div 
          style={{ 
            scale: titleScale, 
            opacity: titleOpacity, 
            y: titleY,
            z: 10
          }}
          className="absolute inset-0 flex flex-col items-center justify-center origin-center pointer-events-none"
        >
          {/* Solid professional colors instead of gradients */}
          <h1 className="text-[12vw] tracking-tighter leading-none font-black text-zinc-100 select-none">
            Klyvora <span className="text-zinc-500">AI</span>
          </h1>
          
          <motion.div 
            animate={{ y: [0, 10, 0], opacity: [0.3, 1, 0.3] }} 
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-16 text-zinc-400 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase">Scroll to explore</span>
            <ArrowDown className="w-5 h-5" />
          </motion.div>
        </motion.div>

        {/* Header (Top Right CTA) - Appears after Hero fades slightly */}
        <motion.div 
          style={{ opacity: useTransform(smoothProgress, [0.1, 0.15], [0, 1]) }}
          className="absolute top-6 right-8 flex items-center gap-4 z-50 w-full justify-end"
        >
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-bold bg-zinc-100 text-zinc-900 px-5 py-2.5 rounded-full hover:bg-white transition-colors"
          >
            Getting Started
          </button>
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* SECTION 2: FEATURES & LOGIC REVEAL                 */}
        {/* ═══════════════════════════════════════════════ */}
        <motion.div 
          style={{ 
            opacity: featuresOpacity,
            y: featuresY,
            z: 20
          }}
          className="absolute inset-0 flex items-center w-full max-w-7xl mx-auto px-6 pointer-events-none"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center w-full">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 bg-zinc-800/50 text-zinc-300 text-xs font-mono font-bold tracking-wider uppercase mb-4">
                <Sparkles className="w-3 h-3" /> Reimagining Feedback
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-zinc-100">
                Hear what they mean, <br/>
                <span className="text-zinc-500">
                  not just what they say.
                </span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-lg leading-relaxed font-medium">
                Klyvora transforms raw customer voice into instantaneous, actionable intelligence using advanced vocal and sentiment analytics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SolidCard icon={<Mic className="w-6 h-6 text-zinc-100"/>} title="Native Voice" desc="Zero-friction acoustic capture." />
              <SolidCard icon={<BrainCircuit className="w-6 h-6 text-zinc-100"/>} title="Neural Llama-3" desc="Deep context extraction." />
              <SolidCard icon={<BarChart3 className="w-6 h-6 text-zinc-100"/>} title="Live Intel" desc="Streaming dashboard metrics." />
              <SolidCard icon={<Sparkles className="w-6 h-6 text-zinc-100"/>} title="Smart Alerts" desc="Priority sentiment flagged." />
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* SECTION 3: HOW IT WORKS (NEW SECTION)              */}
        {/* ═══════════════════════════════════════════════ */}
        <motion.div 
          style={{ 
            opacity: howItWorksOpacity,
            y: howItWorksY,
            z: 20
          }}
          className="absolute inset-0 flex flex-col justify-center items-center w-full max-w-5xl mx-auto px-6 pointer-events-none"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-100 mb-6">
              Enterprise-Grade Processing
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              A robust architecture designed for scale, security, and instantaneous insight generation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full text-left">
            <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-zinc-100" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Secure Capture</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Client feedback is recorded securely through a browser-native interface with zero installation required, ensuring maximum compliance and privacy.
              </p>
            </div>
            
            <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-zinc-100" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Real-time Analysis</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Our LLM pipeline instantly transcribes audio, extracts emotional nuances, and categorizes key topics before storing them in your secure database.
              </p>
            </div>

            <div className="border border-zinc-800 bg-zinc-900/50 p-8 rounded-3xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-zinc-100" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Actionable Intel</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Managers receive live notifications on the dashboard, allowing rapid resolution of customer issues before they escalate.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* SECTION 4: DASHBOARD PEEK & CTA                    */}
        {/* ═══════════════════════════════════════════════ */}
        <motion.div
           style={{
             opacity: dashboardOpacity,
             y: dashboardY,
             scale: dashboardScale,
             z: 30
           }}
           className="absolute bottom-[-10vh] md:bottom-[-20vh] w-full max-w-[1200px] mx-auto pointer-events-auto flex flex-col h-full justify-end"
        >
          {/* Abstract Dashboard Mockup */}
          <div className="w-full aspect-[21/9] rounded-t-[2.5rem] border-t border-x border-zinc-800 bg-zinc-900 p-2 relative overflow-hidden">
             
             {/* The CTA overlaying the dashboard */}
             <motion.div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md z-50 rounded-t-[2.5rem]"
             >
                <div className="max-w-2xl text-center px-6">
                  <h3 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight text-zinc-100">Deploy your intelligence hub instantly.</h3>
                  <button 
                    onClick={() => navigate('/login')}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 text-zinc-900 rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="relative z-10">Access The Portal</span>
                    <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="mt-6 text-sm text-zinc-500 font-mono">Secure Firebase Authentication Engine.</p>
                </div>
             </motion.div>

             {/* Faux Dashboard UI Elements */}
             <div className="w-full h-full border border-zinc-800 bg-zinc-950 rounded-t-[2rem] p-8 flex gap-6 opacity-30">
                <div className="w-64 h-full hidden lg:flex flex-col gap-4 border-r border-zinc-800 pr-6">
                  <div className="w-32 h-6 bg-zinc-800 rounded-full mb-8"></div>
                  {[1,2,3,4,5].map(i => <div key={i} className="w-full h-10 bg-zinc-800 rounded-xl"></div>)}
                </div>
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex gap-4 h-32">
                    <div className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700"></div>
                    <div className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700"></div>
                    <div className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700"></div>
                  </div>
                  <div className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700 p-6 flex flex-col gap-4">
                    <div className="w-1/4 h-6 bg-zinc-700 rounded-full"></div>
                    <div className="w-full flex-1 border-b border-dashed border-zinc-700"></div>
                  </div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════ */}
        {/* FOOTER  (REMOVED)                                   */}
        {/* ═══════════════════════════════════════════════ */}

      </div>
    </div>
  );
}

// Subcomponent: Solid Professional Card
function SolidCard({ icon, title, desc }) {
  return (
    <div className="p-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/50 flex flex-col gap-4 hover:bg-zinc-800 transition-colors">
      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
        {icon}
      </div>
      <div>
        <h4 className="text-zinc-100 font-bold text-lg tracking-tight mb-1">{title}</h4>
        <p className="text-zinc-400 text-sm font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
