// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import { Box, Card, CardContent } from "@mui/material";

interface GoogleDocViewerProps {
  title: string;
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string;
  height?: number;
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 700,
}: GoogleDocViewerProps) => {
  // Ensure embedUrl always includes ?embedded=true
  const finalEmbedUrl = embedUrl.includes("?embedded=true")
    ? embedUrl
    : `${embedUrl}?embedded=true`;

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardContent className="flex-grow flex flex-col" sx={{ p: 1 }}>
        <Box
          className="flex-grow w-full rounded-lg border border-gray-300"
          style={{ height: `${height}px` }} // Set explicit height for the container
        >
          {/* Use <iframe> for embedding Google Docs */}
          <Box
            component="iframe"
            src={finalEmbedUrl}
            title={title}
            width="100%"
            height="100%" // iframe will fill the parent Box's explicit height
            sx={{ border: "none" }}
            loading="lazy"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default GoogleDocViewer;
