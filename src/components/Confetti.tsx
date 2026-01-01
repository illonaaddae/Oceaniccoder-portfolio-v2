import React, { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  shape: "circle" | "square";
}

const COLORS = [
  "#f43f5e", // rose
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
];

const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile for performance optimization
    const checkMobile = window.innerWidth < 768;
    setIsMobile(checkMobile);

    // Fewer pieces on mobile for better performance
    const pieceCount = checkMobile ? 40 : 100;

    const newPieces: ConfettiPiece[] = [];
    for (let i = 0; i < pieceCount; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 2,
        size: checkMobile ? 5 + Math.random() * 6 : 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        shape: Math.random() > 0.5 ? "circle" : "square",
      });
    }
    setPieces(newPieces);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[99]"
      style={{
        overflow: "hidden",
        height: "100%",
        width: "100%",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            position: "absolute",
            left: `${piece.x}%`,
            top: "-20px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            borderRadius: piece.shape === "circle" ? "50%" : "2px",
            transform: `rotate(${piece.rotation}deg)`,
            willChange: "transform, opacity",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
          }}
        />
      ))}
      <style>{`
        @-webkit-keyframes confetti-fall {
          0% {
            -webkit-transform: translateY(0) rotate(0deg);
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            -webkit-transform: translateY(100vh) rotate(720deg);
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes confetti-fall {
          0% {
            -webkit-transform: translateY(0) rotate(0deg);
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            -webkit-transform: translateY(100vh) rotate(720deg);
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti-piece {
          -webkit-animation: confetti-fall linear forwards;
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Confetti;
