/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { AppState, Linking, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import type { BarcodeScanningResult } from 'expo-camera';

let mockPermission: {
  canAskAgain: boolean;
  granted: boolean;
  status?: string;
} | null = null;
let mockRequestPermission: jest.Mock<() => Promise<unknown>>;
let mockGetPermission: jest.Mock<() => Promise<unknown>>;
let mockCameraMountCount = 0;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    router: {
      push: jest.fn()
    },
    useFocusEffect: (callback: () => void | (() => void)) =>
      React.useEffect(callback, [callback])
  };
});

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View: NativeView } = require('react-native');

  return {
    CameraView: (props: {
      onMountError: (event: { message: string }) => void;
      onBarcodeScanned?: (result: BarcodeScanningResult) => void;
    }) => {
      React.useEffect(() => {
        mockCameraMountCount += 1;
      }, []);

      return React.createElement(NativeView, {
        onMountError: props.onMountError,
        onBarcodeScanned: props.onBarcodeScanned,
        testID: 'camera-view'
      });
    },
    useCameraPermissions: () => [
      mockPermission,
      mockRequestPermission,
      mockGetPermission
    ]
  };
});

jest.mock('expo-crypto', () => ({ randomUUID: () => 'synthetic-scan-draft' }));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' }
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text: NativeText } = require('react-native');

  return {
    TextClassContext: React.createContext(undefined),
    Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) =>
      React.createElement(NativeText, props, children)
  };
});

import { ScannerView } from '@/features/scanner/components/scanner-view';

describe('ScannerView permission and camera recovery', () => {
  beforeEach(() => {
    mockPermission = null;
    mockRequestPermission = jest.fn<() => Promise<unknown>>(() =>
      Promise.resolve({})
    );
    mockGetPermission = jest.fn<() => Promise<unknown>>(() =>
      Promise.resolve({})
    );
    mockCameraMountCount = 0;
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    jest.mocked(router.push).mockReset();
  });

  it('waits for the permission status before requesting access', async () => {
    const { getByText } = await render(<ScannerView />);

    expect(getByText('Opening scanner')).toBeTruthy();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('requests permission automatically for a confirmed first-time state', async () => {
    mockPermission = {
      canAskAgain: true,
      granted: false,
      status: 'undetermined'
    };

    await render(<ScannerView />);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('retries an askable permission denial', async () => {
    mockPermission = { canAskAgain: true, granted: false };
    const { getByText } = await render(<ScannerView />);

    await fireEvent.press(getByText('Try Again'));

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(getByText('Enter Setup Key Manually')).toBeTruthy();
  });

  it('opens Settings without requesting again after permanent denial', async () => {
    mockPermission = { canAskAgain: false, granted: false };
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    const { getByText } = await render(<ScannerView />);

    await fireEvent.press(getByText('Open Settings'));

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(
      getByText(
        'Camera access is turned off. Open Settings to enable it, or enter the setup key manually.'
      )
    ).toBeTruthy();
  });

  it('refreshes camera permission when the app returns to the foreground', async () => {
    mockPermission = { canAskAgain: false, granted: false };
    let handleAppStateChange: ((state: AppStateStatus) => void) | undefined;

    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _type,
      listener
    ) => {
      handleAppStateChange = listener;

      return { remove: jest.fn() };
    }) as typeof AppState.addEventListener);

    await render(<ScannerView />);
    await act(async () => handleAppStateChange?.('active'));

    await waitFor(() => expect(mockGetPermission).toHaveBeenCalledTimes(1));
  });

  it('remounts the camera after a mount error and offers manual entry', async () => {
    mockPermission = { canAskAgain: false, granted: true };
    const { getByText, getByTestId } = await render(<ScannerView />);

    await waitFor(() => expect(mockCameraMountCount).toBe(1));
    await act(async () => {
      getByTestId('camera-view').props.onMountError({
        message: 'Camera unavailable'
      });
    });
    expect(getByText('Camera unavailable')).toBeTruthy();
    expect(getByText('Camera preview could not start.')).toBeTruthy();

    await fireEvent.press(getByText('Enter Setup Key Manually'));
    expect(router.push).toHaveBeenCalledWith('/add-account/manual');

    await fireEvent.press(getByText('Retry Camera'));

    expect(mockCameraMountCount).toBe(2);
    expect(getByText('Scan authenticator QR code')).toBeTruthy();
  });
  it('pauses invalid scans, ignores queued callbacks, and resumes only on Scan Again', async () => {
    mockPermission = { canAskAgain: false, granted: true };
    const { getByText, getByTestId } = await render(<ScannerView />);
    const scan = getByTestId('camera-view').props.onBarcodeScanned;
    const validScan = {
      type: 'qr',
      data: 'otpauth://totp/Demo:test@example.com?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    };

    await act(async () => {
      scan({ type: 'qr', data: 'https://example.com' });
      scan(validScan);
    });
    expect(getByText('This is not an authenticator QR code')).toBeTruthy();
    expect(getByTestId('camera-view').props.onBarcodeScanned).toBeUndefined();
    expect(router.push).not.toHaveBeenCalled();

    await fireEvent.press(getByText('Scan Again'));
    await act(async () => {
      const resumedScan = getByTestId('camera-view').props.onBarcodeScanned;

      resumedScan(validScan);
      resumedScan(validScan);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/account-confirm',
      params: { draftId: expect.any(String) }
    });
  });

  it.each([
    [
      'otpauth://totp/Demo?secret=invalid!',
      'Scan a valid authenticator QR code'
    ],
    [
      'otpauth://hotp/Demo?secret=GEZDGNBVGY3TQOJQ',
      'Unsupported authenticator setup'
    ]
  ])('shows friendly recovery for %s', async (data, title) => {
    mockPermission = { canAskAgain: false, granted: true };
    const { getByText, getByTestId } = await render(<ScannerView />);

    await act(async () =>
      getByTestId('camera-view').props.onBarcodeScanned({ type: 'qr', data })
    );
    expect(getByText(title)).toBeTruthy();
    expect(getByText('Scan Again')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });
});
