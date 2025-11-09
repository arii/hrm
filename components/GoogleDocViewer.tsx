// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import { Box, Card, CardContent, Typography } from "@mui/material";

interface GoogleDocViewerProps {
  title: string;
  // URL must be the 'embed' version of the Google Doc/Sheet/etc.
  embedUrl: string;
  height?: number;
}

const GoogleDocViewer = ({
  title,
  embedUrl,
  height = 500,
}: GoogleDocViewerProps) => {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardContent className="flex-grow flex flex-col p-4">
        <Typography
          variant="h6"
          component="h3"
          className="mb-2 font-semibold text-gray-800"
        >
          {title}
        </Typography>
        <Box
          className="flex-grow w-full overflow-hidden rounded-lg border border-gray-300"
          style={{ minHeight: `${height}px` }}
        >
          {/* Use <iframe> for embedding Google Docs; ensure embedUrl ends with `?embedded=true` */}
          <Box
            component="iframe"
            src={embedUrl}
            title={title}
            width="100%"
            height="100%"
            sx={{ border: "none" }}
            loading="lazy"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default GoogleDocViewer;
