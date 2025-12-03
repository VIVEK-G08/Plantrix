"use client"

import { BluetoothService } from "./bluetooth"

// Shared singleton instance so BLE connection can be reused across client-side routes
export const bluetoothServiceSingleton = new BluetoothService()
