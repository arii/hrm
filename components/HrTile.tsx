// File: components/HrTile.tsx
"use client";
import { Paper, Typography } from "@mui/material";
import React from "react";

export interface HrTileProps {
  name: string;
  bpm: number;
  percentMax: number; // 0-100
  background: string; // hex color
}

const HrTile: React.FC<HrTileProps> = ({
  name,
  bpm,
  percentMax,
  background,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: background,
        color: "#fff",
        p: 2,
        textAlign: "center",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "none",
        borderRadius: 0,
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          fontSize: { xs: "1rem", sm: "1.1rem" },
          letterSpacing: "0.05em",
        }}
      >
        {name}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 1,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        {bpm}
      </Typography>
      {/* Giant Percentage - should dominate the tile */}
      <Typography
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
          fontSize: { xs: "7rem", sm: "9rem", md: "11rem" },
          fontWeight: 900,
          lineHeight: 0.85,
          my: 0.5,
          textShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {percentMax}%
      </Typography>
      <Typography
        variant="caption"
        sx={{
          opacity: 0.85,
          fontSize: { xs: "0.75rem", sm: "0.85rem" },
          mt: 0.5,
        }}
      >
        {percentMax}% of Max HR
      </Typography>
    </Paper>
  );
};

export default HrTile;
