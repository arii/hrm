export interface MockBluetoothRemoteGATTCharacteristic {
  value?: DataView
  startNotifications: jest.Mock<Promise<void>>
  stopNotifications: jest.Mock<Promise<void>>
  addEventListener: jest.Mock<
    void,
    [string, (event: { target: { value: DataView } }) => void]
  >
  removeEventListener: jest.Mock<void, [string, () => void]>
}

export interface MockBluetoothRemoteGATTService {
  getCharacteristic: jest.Mock<Promise<MockBluetoothRemoteGATTCharacteristic>>
}

export interface MockBluetoothRemoteGATTServer {
  connect: jest.Mock<Promise<MockBluetoothRemoteGATTServer>>
  disconnect: jest.Mock<void>
  getPrimaryService: jest.Mock<Promise<MockBluetoothRemoteGATTService>>
}

export interface MockBluetoothDevice {
  id: string
  name: string
  gatt?: MockBluetoothRemoteGATTServer
  addEventListener: jest.Mock<void, [string, () => void]>
  removeEventListener: jest.Mock<void, [string, () => void]>
}
