import { useCallback, useEffect, useRef } from 'react'
import logger, { TAB_ID } from './connectionLog'

const CHANNEL_NAME = 'hrm-bluetooth'

type TabMessage =
  | { type: 'query'; from: string }
  | { type: 'holding'; from: string; deviceId: string; deviceName: string }
  | { type: 'released'; from: string; deviceId: string }
  | { type: 'release-request'; from: string; to: string; deviceId: string }

interface OtherTabHolder {
  tabId: string
  deviceName: string
}

/** Thrown by a silent connect that finds its strap held by another tab. */
export class DeviceHeldByOtherTabError extends Error {
  constructor(readonly deviceName: string) {
    super(`${deviceName} is connected in another tab`)
    this.name = 'DeviceHeldByOtherTabError'
  }
}

interface UseTabCoordinationParams {
  /** This tab's id on the channel; tests give each simulated tab its own. */
  tabId?: string
  /** The strap this tab is streaming from, or null. */
  heldDevice: BluetoothDevice | null
  /** Another tab asked for the strap: disconnect it here. */
  onReleaseRequested: (deviceName: string) => void
}

/**
 * Same-browser tab coordination for the strap. Every tab of the site
 * shares one radio link to a strap, so a second tab connecting (or
 * resetting) mid-handshake drops the first tab's link. Tabs announce the
 * strap they hold over a BroadcastChannel; a silent connect leaves a held
 * strap alone, and a Connect tap asks the holding tab to release it first.
 * A no-op where BroadcastChannel is unavailable.
 */
export const useTabCoordination = ({
  tabId = TAB_ID,
  heldDevice,
  onReleaseRequested,
}: UseTabCoordinationParams) => {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const holdersRef = useRef(new Map<string, OtherTabHolder>())
  const releaseWaitersRef = useRef(new Map<string, () => void>())
  const heldDeviceRef = useRef(heldDevice)
  const onReleaseRequestedRef = useRef(onReleaseRequested)
  useEffect(() => {
    onReleaseRequestedRef.current = onReleaseRequested
  }, [onReleaseRequested])

  const post = useCallback((message: TabMessage) => {
    channelRef.current?.postMessage(message)
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    const holders = holdersRef.current
    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      const message = event.data
      const held = heldDeviceRef.current
      if (message.type === 'query') {
        if (held) {
          post({
            type: 'holding',
            from: tabId,
            deviceId: held.id,
            deviceName: held.name || '',
          })
        }
      } else if (message.type === 'holding') {
        holders.set(message.deviceId, {
          tabId: message.from,
          deviceName: message.deviceName,
        })
      } else if (message.type === 'released') {
        if (holders.get(message.deviceId)?.tabId === message.from) {
          holders.delete(message.deviceId)
        }
        releaseWaitersRef.current.get(message.deviceId)?.()
      } else if (
        message.type === 'release-request' &&
        message.to === tabId &&
        held?.id === message.deviceId
      ) {
        logger.info(
          { device: held.name, requestedBy: message.from },
          'Another tab asked for the strap; releasing it'
        )
        onReleaseRequestedRef.current(held.name || '')
      }
    }
    post({ type: 'query', from: tabId })
    const onPageHide = () => {
      const held = heldDeviceRef.current
      if (held) post({ type: 'released', from: tabId, deviceId: held.id })
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      onPageHide()
      channel.close()
      channelRef.current = null
      holders.clear()
    }
  }, [post, tabId])

  // Announce acquiring and releasing the strap.
  useEffect(() => {
    const previous = heldDeviceRef.current
    heldDeviceRef.current = heldDevice
    if (previous && previous !== heldDevice) {
      post({ type: 'released', from: tabId, deviceId: previous.id })
    }
    if (heldDevice && heldDevice !== previous) {
      holdersRef.current.delete(heldDevice.id)
      post({
        type: 'holding',
        from: tabId,
        deviceId: heldDevice.id,
        deviceName: heldDevice.name || '',
      })
    }
  }, [heldDevice, post, tabId])

  /** The other tab holding this strap, if any. */
  const otherTabHolding = useCallback(
    (device: BluetoothDevice): OtherTabHolder | null =>
      holdersRef.current.get(device.id) ?? null,
    []
  )

  /**
   * Asks the holding tab to release the strap and waits until it reports
   * released, or until waitMs passes (a closed or frozen tab never
   * answers). Resolves true when the release was confirmed.
   */
  const requestRelease = useCallback(
    (device: BluetoothDevice, waitMs: number): Promise<boolean> => {
      const holder = holdersRef.current.get(device.id)
      if (!holder) return Promise.resolve(true)
      logger.info(
        { device: device.name, holder: holder.tabId },
        'Asking the other tab to release the strap'
      )
      return new Promise((resolve) => {
        const timer = setTimeout(() => finish(false), waitMs)
        const finish = (released: boolean) => {
          clearTimeout(timer)
          releaseWaitersRef.current.delete(device.id)
          holdersRef.current.delete(device.id)
          if (!released) {
            logger.warn(
              { device: device.name, holder: holder.tabId },
              'Other tab did not release the strap in time; connecting anyway'
            )
          }
          resolve(released)
        }
        releaseWaitersRef.current.set(device.id, () => finish(true))
        post({
          type: 'release-request',
          from: tabId,
          to: holder.tabId,
          deviceId: device.id,
        })
      })
    },
    [post, tabId]
  )

  return { otherTabHolding, requestRelease }
}
