// File: components/GoogleDocViewer.tsx (Google Doc Viewer Component)
/**
 * Google Doc Viewer Component: Embeds a Google Doc/Sheet/Presentation using an iframe.
 * Uses Material UI for responsive card structure.
 */
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface GoogleDocViewerProps {
    title: string;
    // URL must be the 'embed' version of the Google Doc/Sheet/etc.
    embedUrl: string; 
    height?: number;
}

const GoogleDocViewer: React.FC<GoogleDocViewerProps> = ({ title, embedUrl, height = 500 }) => {
    return (
        <Card className="shadow-lg h-full flex flex-col">
            <CardContent className="flex-grow flex flex-col p-4">
                <Typography variant="h6" component="h3" className="mb-2 font-semibold text-gray-800">
                    {title}
                </Typography>
                <Box className="flex-grow w-full overflow-hidden rounded-lg border border-gray-300" style={{ minHeight: `${height}px` }}>
                    {/* The sandbox attribute is crucial for security, limiting what the iframe can do */}
                    <iframe
                        title={title}
                        src={embedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                </Box>
            </CardContent>
        </Card>
    );
};

export default GoogleDocViewer;