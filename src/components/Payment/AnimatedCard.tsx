import React from "react";
import { LOGO_PATHS } from "@/components/Navbar/navData";

export interface AnimatedCardProps {
  flipped?: boolean;
  /** Shown in place of the card number, e.g. "₵6,000.00". */
  amount?: string;
  /** Brand card only: the currency code set small beside the amount, e.g. "GHS". */
  currencyCode?: string;
  /** Who pays; defaults to the brand name. */
  holder?: string;
  /** Bottom-right detail, e.g. the quote number; replaces "Valid thru". */
  reference?: { label: string; value: string };
  /**
   * "brand" draws an OceanicCoder card: ocean gradient, our wordmark instead of a
   * card network's mark, the amount in the page font, and a softer shadow.
   */
  variant?: "classic" | "brand";
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  flipped = false,
  amount,
  currencyCode,
  holder = "OceanicCoder",
  reference,
  variant = "classic",
}) => {
  const brand = variant === "brand";
  return (
    <div
      style={{
        perspective: "1000px",
        width: "100%",
        maxWidth: "380px",
        margin: "0 auto",
        // Lets the brand card size its amount to the card's width (cqw).
        containerType: "inline-size",
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateY(0deg); }
          50% { transform: translateY(-8px) rotateY(2deg); }
        }
        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animated-card-inner.brand {
          animation-name: float-soft;
          animation-duration: 6s;
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
            0 0 30px rgba(12, 133, 153, 0.3) !important;
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
        @media (prefers-reduced-motion: reduce) {
          .animated-card-inner,
          .card-shimmer {
            animation: none;
          }
        }
      `}</style>

      <div
        className={brand ? "animated-card-inner brand" : "animated-card-inner"}
        style={{
          width: "100%",
          aspectRatio: "1.586",
          // ISO ID-1 cards (85.6 mm wide) have 3.18 mm corners, about 3.7% of the width.
          borderRadius: brand ? "clamp(10px, 3.7cqw, 14px)" : "16px",
          background: brand
            ? "radial-gradient(90% 80% at 100% 0%, rgba(38,169,197,0.45) 0%, transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(12,133,153,0.30) 0%, transparent 65%), linear-gradient(150deg, #04333B 0%, #06454f 45%, #085866 100%)"
            : "linear-gradient(135deg, #0f4c75 0%, #0C8599 50%, #085866 100%)",
          boxShadow: brand
            ? "0 18px 40px -12px rgba(4, 51, 59, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.18)"
            : "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden",
          display: flipped ? "none" : "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Real cards keep about 6-7% clear space to the edge.
          padding: brand ? "clamp(16px, 6.5cqw, 26px)" : "20px 24px",
          color: "#ffffff",
          fontFamily: brand ? "inherit" : undefined,
        }}
      >
        {/* Holographic shimmer overlay */}
        <div
          className="card-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* EMV Chip */}
            <div
              style={{
                width: brand ? "38px" : "44px",
                height: brand ? "28px" : "34px",
                background: brand
                  ? "linear-gradient(135deg, #c9a24a 0%, #ead08a 45%, #a9832c 100%)"
                  : "linear-gradient(135deg, #d4a843 0%, #f0c060 40%, #b8901e 100%)",
                borderRadius: "6px",
                position: "relative",
                overflow: "hidden",
                opacity: brand ? 0.92 : 1,
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
            {brand && (
              // Contactless mark: three arcs, drawn here so no network logo is implied.
              <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden>
                <path
                  d="M3 7.5a5 5 0 0 1 0 7"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M7.5 4.5a9.5 9.5 0 0 1 0 13"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M12 1.5a14 14 0 0 1 0 19"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {brand ? (
            <img
              src={LOGO_PATHS.dark}
              alt=""
              style={{ height: "22px", width: "auto", filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <>
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
            </>
          )}
        </div>

        {brand ? (
          // The amount is the point of this card: large, in the page font, with
          // tabular figures so digits don't shift width.
          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
                marginBottom: "4px",
              }}
            >
              Amount due
            </div>
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "8px", whiteSpace: "nowrap" }}
            >
              <span
                style={{
                  fontSize: "clamp(26px, 10cqw, 38px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {amount ?? ""}
              </span>
              {currencyCode && (
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {currencyCode}
                </span>
              )}
            </div>
          </div>
        ) : (
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
            {amount ?? "•••• •••• •••• ••••"}
          </div>
        )}

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
              {holder}
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
              {reference ? reference.label : "Valid Thru"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600" }}>
              {reference ? reference.value : "MM/YY"}
            </div>
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
