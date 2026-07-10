import FeedbackCapture from '../../pages/FeedbackCapture';

export default function LivePreview({ config }) {
  return (
    <div className="relative mx-auto w-[375px] h-[812px] bg-background rounded-[3rem] shadow-2xl border-[12px] border-zinc-900 overflow-hidden shrink-0 scale-[0.7] sm:scale-75 md:scale-90 lg:scale-[0.8] xl:scale-90 origin-center transition-transform duration-300">
      {/* Mobile Notch */}
      <div className="absolute top-0 inset-x-0 h-6 bg-zinc-900 rounded-b-3xl w-40 mx-auto z-50 flex items-center justify-center gap-2">
        <div className="w-12 h-1.5 rounded-full bg-zinc-800"></div>
        <div className="w-2 h-2 rounded-full bg-zinc-800/80"></div>
      </div>
      
      {/* App Content */}
      <div className="w-full h-full overflow-y-auto no-scrollbar relative z-0">
        <FeedbackCapture previewMode={true} previewConfig={config} />
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
