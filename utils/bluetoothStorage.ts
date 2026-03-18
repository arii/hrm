import Cookies from 'js-cookie'

const COOKIE_NAME = 'hrm_device_id'

export const getSavedDeviceId = (): string | undefined =>
  Cookies.get(COOKIE_NAME)

export const saveDeviceId = (id: string) => {
  Cookies.set(COOKIE_NAME, id, {
    expires: 365,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
}

export const clearDeviceId = () => {
  Cookies.remove(COOKIE_NAME)
}
