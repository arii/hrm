import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { spotifyClient } from '@/services/spotifyClient' //

export async function POST(req: NextRequest) {
  // 1. Authorization Check (User must be logged into Dashboard)
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  // 2. Parse Body
  let body
  try {
    body = await req.json()
  } catch (_e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { command, volume, deviceId, playlistUri } = body
  const VALID_COMMANDS = ['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS', 'SET_VOLUME', 'TRANSFER_PLAYBACK']

  if (!VALID_COMMANDS.includes(command)) {
    return NextResponse.json({ error: `Invalid command: ${command}` }, { status: 400 })
  }

  // 3. Execution (Using System Client)
  // This ensures we control the "Gym Account", not the "Instructor's Personal Account"
  const success = await spotifyClient.executeCommand(async (sdk) => {
    switch (command) {
      case 'PLAY':
        await sdk.player.startResumePlayback(deviceId || undefined, playlistUri)
        break
      case 'PAUSE':
        await sdk.player.pausePlayback(deviceId || undefined)
        break
      case 'NEXT':
        await sdk.player.skipToNext(deviceId || undefined)
        break
      case 'PREVIOUS':
        await sdk.player.skipToPrevious(deviceId || undefined)
        break
      case 'TRANSFER_PLAYBACK':
        if (deviceId) await sdk.player.transferPlayback([deviceId], true)
        else throw new Error('Device ID missing for transfer')
        break
      case 'SET_VOLUME':
        if (volume !== undefined) {
           const clamped = Math.max(0, Math.min(100, Math.round(volume)))
           await sdk.player.setPlaybackVolume(clamped, deviceId)
        }
        break
    }
  }, command)

  if (success) {
    return NextResponse.json({ success: true, message: `Command '${command}' executed.` })
  } else {
    return NextResponse.json({ error: 'Failed to execute command on Spotify System Player.' }, { status: 500 })
  }
}
