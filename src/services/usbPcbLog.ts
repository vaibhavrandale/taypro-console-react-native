import { Platform } from "react-native";

const BAUD = 115200;

export type UsbPort = {
  deviceId: number;
  vendorId: number;
  productId: number;
};

type Opened = {
  onReceived: (cb: (event: { data: string }) => void) => { remove: () => void };
  close: () => Promise<unknown>;
};

type UsbModule = {
  UsbSerialManager: {
    list: () => Promise<UsbPort[]>;
    tryRequestPermission: (deviceId: number) => Promise<boolean>;
    open: (
      deviceId: number,
      options: { baudRate: number; parity: number; dataBits: number; stopBits: number },
    ) => Promise<Opened>;
  };
  Parity: { None: number };
};

function loadUsb(): UsbModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return require("react-native-usb-serialport-for-android") as UsbModule;
  } catch {
    return null;
  }
}

export function usbLogSupported(): boolean {
  return loadUsb() != null;
}

export async function listUsbPorts(): Promise<UsbPort[]> {
  const usb = loadUsb();
  if (!usb) return [];
  return usb.UsbSerialManager.list();
}

export async function openPcbLog(
  deviceId: number,
  onText: (chunk: string) => void,
): Promise<{ close: () => Promise<void> } | "permission"> {
  const usb = loadUsb();
  if (!usb) {
    throw new Error("This Android build has no USB serial. Install a new build of the app.");
  }
  const allowed = await usb.UsbSerialManager.tryRequestPermission(deviceId);
  if (!allowed) return "permission";
  const port = await usb.UsbSerialManager.open(deviceId, {
    baudRate: BAUD,
    parity: usb.Parity.None,
    dataBits: 8,
    stopBits: 1,
  });
  const sub = port.onReceived((event) => {
    onText(event.data);
  });
  return {
    close: async () => {
      sub.remove();
      await port.close();
    },
  };
}
