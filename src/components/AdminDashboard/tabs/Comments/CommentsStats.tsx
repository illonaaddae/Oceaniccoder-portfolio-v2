import { FaComment, FaClock, FaCheck } from "react-icons/fa";

interface CommentsStatsProps {
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  cardStyles: string;
  textPrimary: string;
  textMuted: string;
}

export const CommentsStats: React.FC<CommentsStatsProps> = ({
  totalComments,
  pendingComments,
  approvedComments,
  cardStyles,
  textPrimary,
  textMuted,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div
      className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-oceanic-500/20 to-oceanic-900/20">
          <FaComment className="text-oceanic-500" />
        </div>
        <div>
          <p className={`text-2xl font-bold ${textPrimary}`}>{totalComments}</p>
          <p className={`text-sm ${textMuted}`}>Total Comments</p>
        </div>
      </div>
    </div>
    <div
      className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
          <FaClock className="text-amber-500" />
        </div>
        <div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            {pendingComments}
          </p>
          <p className={`text-sm ${textMuted}`}>Pending Review</p>
        </div>
      </div>
    </div>
    <div
      className={`${cardStyles} border rounded-2xl p-4 transition-colors duration-200`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <FaCheck className="text-green-500" />
        </div>
        <div>
          <p className={`text-2xl font-bold ${textPrimary}`}>
            {approvedComments}
          </p>
          <p className={`text-sm ${textMuted}`}>Approved</p>
        </div>
      </div>
    </div>
  </div>
);
