// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Card, CardContent, IconButton, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";

interface GoogleDocViewerProps {
  title: string;
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string;
  height?: number;
  isShrunk?: boolean; // New prop
  onToggleShrink?: () => void; // New callback prop
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 700,
  isShrunk = false, // Default to not shrunk
  onToggleShrink,
}: GoogleDocViewerProps) => {
  const [iframeLoading, setIframeLoading] = useState(true);

  // Ensure embedUrl always includes ?embedded=true
  const finalEmbedUrl = embedUrl.includes("?embedded=true")
    ? embedUrl
    : `${embedUrl}?embedded=true`;

  const dynamicHeight = isShrunk ? 100 : height; // Use a smaller height when shrunk

  // Use useEffect to set a timeout fallback in case onLoad doesn't fire
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIframeLoading(false);
    }, 3000); // Show iframe after 3 seconds regardless
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Card elevation={6} className="h-full flex flex-col">
      <CardContent className="flex-grow flex flex-col" sx={{ p: 1 }}>
        <Box
          className="flex-grow w-full rounded-lg border border-gray-300"
          style={{ height: `${dynamicHeight}px`, overflow: "hidden" }} // Set explicit height for the container
        >
          {iframeLoading && (
            <Skeleton variant="rectangular" width="100%" height="100%" />
          )}
          <Box
            component="iframe"
            src={finalEmbedUrl}
            title={title}
            width="100%"
            height="100%" // iframe will fill the parent Box's explicit height
            sx={{ border: "none", display: iframeLoading ? "none" : "block" }}
            onLoad={() => setIframeLoading(false)}
          />
        </Box>
        {onToggleShrink && (
          <IconButton
            onClick={onToggleShrink}
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "rgba(255,255,255,0.8)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,1)",
              },
            }}
            aria-label={isShrunk ? "Expand document" : "Collapse document"}
          >
            {isShrunk ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleDocViewer;
