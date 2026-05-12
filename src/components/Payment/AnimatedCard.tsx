import React from "react";

export interface AnimatedCardProps {
  flipped?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ flipped = false }) => {
  return (
    <div
      style={{
        perspective: "1000px",
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateY(0deg); }
          50% { transform: translateY(-8px) rotateY(2deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animated-card-inner {
          animation: float 4s ease-in-out infinite;
          transition: box-shadow 0.3s ease;
        }
        .animated-card-inner:hover {
          animation-play-state: paused;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.15),
            0 0 30px rgba(13, 148, 136, 0.3) !important;
        }
        .card-shimmer {
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 255, 255, 0.08) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        .card-shimmer:hover {
          animation-duration: 1.5s;
        }
      `}</style>

      <div
        className="animated-card-inner"
        style={{
          width: "100%",
          aspectRatio: "1.586",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #0f4c75 0%, #0d9488 50%, #065f57 100%)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden",
          display: flipped ? "none" : "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px 24px",
          color: "#ffffff",
        }}
      >
        {/* Holographic shimmer overlay */}
        <div
          className="card-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "16px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Top row: chip + logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* EMV Chip */}
          <div
            style={{
              width: "44px",
              height: "34px",
              background: "linear-gradient(135deg, #d4a843 0%, #f0c060 40%, #b8901e 100%)",
              borderRadius: "6px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Chip grid lines */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "18px",
                height: "14px",
                border: "1px solid rgba(0,0,0,0.3)",
                borderRadius: "2px",
              }}
            />
          </div>

          {/* Visa logo */}
          <span
            style={{
              fontStyle: "italic",
              fontWeight: "bold",
              fontSize: "24px",
              letterSpacing: "-1px",
              color: "#ffffff",
              textShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            VISA
          </span>
        </div>

        {/* Card number */}
        <div
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "20px",
            letterSpacing: "3px",
            color: "#ffffff",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 2,
          }}
        >
          •••• •••• •••• ••••
        </div>

        {/* Bottom row: name + valid */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "1px",
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Card Holder
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              OceanicCoder
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "1px",
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Valid Thru
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600" }}>MM/YY</div>
          </div>
        </div>
      </div>

      {/* Back of card */}
      {flipped && (
        <div
          style={{
            width: "100%",
            aspectRatio: "1.586",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            paddingTop: "24px",
            overflow: "hidden",
          }}
        >
          {/* Magnetic stripe */}
          <div
            style={{
              width: "100%",
              height: "40px",
              background: "#111111",
              marginBottom: "24px",
            }}
          />

          {/* Signature strip */}
          <div
            style={{
              margin: "0 24px",
              background: "#f0f0f0",
              borderRadius: "4px",
              padding: "8px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #ddd 0, #ddd 2px, #f0f0f0 2px, #f0f0f0 8px)",
                flex: 1,
                height: "20px",
                marginRight: "12px",
                borderRadius: "2px",
              }}
            />
            <div
              style={{
                background: "#fff",
                padding: "2px 10px",
                borderRadius: "3px",
                border: "1px solid #ccc",
                fontSize: "13px",
                fontWeight: "600",
                color: "#333",
                letterSpacing: "2px",
              }}
            >
              CVV: •••
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedCard;
