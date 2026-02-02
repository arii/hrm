// File: app/api/spotify/control/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedSpotifyApi } from '@/lib/spotify/sdk'
import { ApiError } from '@/lib/errors'
import { handleSpotifyApiError } MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeSmall MuiButton-outlinedSizeSmall MuiButton-colorPrimary css-1m4va45-MuiButtonBase-root-MuiButton-root" [39m
         [33mdata-testid [39m= [32m"spotify-logout-button" [39m
         [33mtabindex [39m= [32m"0" [39m
         [33mtype [39m= [32m"button" [39m
       [36m/> [39m

      --------------------------------------------------
      slider:

      Name "Volume":
       [36m<input [39m
         [33maria-label [39m= [32m"Volume" [39m
         [33mtype [39m= [32m"range" [39m
         [33mvalue [39m= [32m"50" [39m
       [36m/> [39m

      --------------------------------------------------

    Ignored nodes: comments, script, style
     [36m<body> [39m
       [36m<div> [39m
         [36m<div [39m
           [33maria-label [39m= [32m"Now playing: Test Track — Test Artist, Status: Playing, Browser player ready" [39m
           [33mclass [39m= [32m"MuiBox-root css-shy06i" [39m
           [33mdata-testid [39m= [32m"spotify-display-container" [39m
         [36m> [39m
           [36m<div [39m
             [33mclass [39m= [32m"MuiBox-root css-1uk0x8n" [39m
           [36m> [39m
             [36m<p [39m
               [33mclass [39m= [32m"MuiTypography-root MuiTypography-body2 css-bvuapi-MuiTypography-root" [39m
               [33mdata-testid [39m= [32m"spotify-now-playing" [39m
             [36m> [39m
               [0mTest Track [0m
               [0m  [0m
               [0m— Test Artist [0m
             [36m</p> [39m
           [36m</div> [39m
           [36m<div [39m
             [33mclass [39m= [32m"MuiBox-root css-wxpah8" [39m
           [36m> [39m
             [36m<button [39m
               [33maria-label [39m= [32m"Previous track" [39m
               [33mclass [39m= [32m"MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall css-1jc3ya1-MuiButtonBase-root-MuiIconButton-root" [39m
               [33mdata-testid [39m= [32m"spotify-previous-button" [39m
               [33mtabindex [39m= [32m"0" [39m
               [33mtype [39m= [32m"button" [39m
             [36m> [39m
               [36m<svg [39m
                 [33maria-hidden [39m= [32m"true" [39m
                 [33mclass [39m= [32m"MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1umw9bq-MuiSvgIcon-root" [39m
                 [33mdata-testid [39m= [32m"SkipPreviousIcon" [39m
                 [33mfocusable [39m= [32m"false" [39m
                 [33mviewBox [39m= [32m"0 0 24 24" [39m
               [36m> [39m
                 [36m<path [39m
                   [33md [39m= [32m"M6 6h2v12H6zm3.5 6 8.5 6V6z" [39m
                 [36m/> [39m
               [36m</svg> [39m
             [36m</button> [39m
             [36m<button [39m
               [33maria-label [39m= [32m"Pause" [39m
               [33mclass [39m= [32m"MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeMedium css-onden-MuiButtonBase-root-MuiIconButton-root" [39m
               [33mdata-testid [39m= [32m"spotify-play-pause-button" [39m
               [33mtabindex [39m= [32m"0" [39m
               [33mtype [39m= [32m"button" [39m
             [36m> [39m
               [36m<svg [39m
                 [33maria-hidden [39m= [32m"true" [39m
                 [33mclass [39m= [32m"MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1umw9bq-MuiSvgIcon-root" [39m
                 [33mdata-testid [39m= [32m"PauseIcon" [39m
                 [33mfocusable [39m= [32m"false" [39m
                 [33mviewBox [39m= [32m"0 0 24 24" [39m
               [36m> [39m
                 [36m<path [39m
                   [33md [39m= [32m"M6 19h4V5H6zm8-14v14h4V5z" [39m
                 [36m/> [39m
               [36m</svg> [39m
             [36m</button> [39m
             [36m<button [39m
               [33maria-label [39m= [32m"Next track" [39m
               [33mclass [39m= [32m"MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall css-1jc3ya1-MuiButtonBase-root-MuiIconButton-root" [39m
               [33mdata-testid [39m= [32m"spotify-next-button" [39m
               [33mtabindex [39m= [32m"0" [39m
               [33mtype [39m= [32m"button" [39m
             [36m> [39m
               [36m<svg [39m
                 [33maria-hidden [39m= [32m"true" [39m
                 [33mclass [39m= [32m"MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-1umw9bq-MuiSvgIcon-root" [39m
                 [33mdata-testid [39m= [32m"SkipNextIcon" [39m
                 [33mfocusable [39m= [32m"false" [39m
                 [33mviewBox [39m= [32m"0 0 24 24" [39m
               [36m> [39m
                 [36m<path [39m
                   [33md [39m= [32m"m6 18 8.5-6L6 6zM16 6v12h2V6z" [39m
                 [36m/> [39m
               [36m</svg> [39m
             [36m</button> [39m
           [36m</div> [39m
           [36m<div [39m
             [33mclass [39m= [32m"MuiBox-root css-v511ir" [39m
           [36m> [39m
             [36m<input [39m
               [33maria-label [39m= [32m"Volume" [39m
               [33mtype [39m= [32m"range" [39m
               [33mvalue [39m= [32m"50" [39m
             [36m/> [39m
             [36m<div [39m
               [33mdata-testid [39m= [32m"device-selector" [39m
             [36m/> [39m
             [36m<button [39m
               [33mclass [39m= [32m"MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeSmall MuiButton-outlinedSizeSmall MuiButton-colorPrimary MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-sizeSmall MuiButton-outlinedSizeSmall MuiButton-colorPrimary css-1m4va45-MuiButtonBase-root-MuiButton-root" [39m
               [33mdata-testid [39m= [32m"spotify-logout-button" [39m
               [33mtabindex [39m= [32m"0" [39m
               [33mtype [39m= [32m"button" [39m
             [36m> [39m
               [0mLogout [0m
             [36m</button> [39m
           [36m</div> [39m
         [36m</div> [39m
       [36m</div> [39m
     [36m</body> [39m

      123 |     const { execute } = mockedUseSpotifyCommand()
      124 |     renderComponent()
    > 125 |     const slider = screen.getByRole('range')
          |                           ^
      126 |     fireEvent.change(slider, { target: { value: '75' } })
      127 |     expect(execute).toHaveBeenCalledWith('SET_VOLUME', { volume: 75 })
      128 |   })

      at Object.getElementError (node_modules/.pnpm/@testing-library+dom@10.4.0/node_modules/@testing-library/dom/dist/config.js:37:19)
      at node_modules/.pnpm/@testing-library+dom@10.4.0/node_modules/@testing-library/dom/dist/query-helpers.js:76:38
      at node_modules/.pnpm/@testing-library+dom@10.4.0/node_modules/@testing-library/dom/dist/query-helpers.js:52:17
      at node_modules/.pnpm/@testing-library+dom@10.4.0/node_modules/@testing-library/dom/dist/query-helpers.js:95:19
      at Object.<anonymous> (tests/unit/components/SpotifyDisplay.test.tsx:125:27)


Test Suites: 1 failed, 92 passed, 93 total
Tests:       1 failed, 554 passed, 555 total
Snapshots:   5 passed, 5 total
Time:        18.107 s
Ran all test suites matching tests/unit.
