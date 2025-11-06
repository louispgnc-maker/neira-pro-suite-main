import React from "react";

const commit = import.meta?.env?.VITE_GIT_COMMIT as string | undefined;
const buildTime = import.meta?.env?.VITE_BUILD_TIME as string | undefined;

export function BuildInfo() {
  if (!commit && !buildTime) return null;
  return (
    <div className="text-[10px] text-muted-foreground px-3 py-1 border-t border-border/50 flex items-center gap-2">
      <span>v:</span>
      {commit && (
        <span title={commit} className="font-mono">
          {commit.substring(0, 7)}
        </span>
      )}
      {buildTime && <span>• {new Date(buildTime).toLocaleString()}</span>}
    </div>
  );
}
