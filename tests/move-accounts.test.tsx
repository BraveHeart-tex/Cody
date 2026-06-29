/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import {
  cleanup,
  fireEvent,
  render,
  waitFor
} from '@testing-library/react-native';
import { router } from 'expo-router';

import type { UseAccountsResult } from '@/features/totp/hooks/use-accounts';
import type { OtpAccount } from '@/features/totp/model/totp-account';

const mockReorderAccounts = jest.fn<UseAccountsResult['reorderAccounts']>();
let mockAccounts: OtpAccount[] = [];
let mockError: Error | null = null;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn()
  }
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/card', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  return {
    Card: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(View, props, children),
    CardDescription: ({
      children,
      ...props
    }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children),
    CardHeader: ({ children, ...props }: React.ComponentProps<typeof View>) =>
      React.createElement(View, props, children),
    CardTitle: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Icon: () => React.createElement(Text, null, 'icon')
  };
});

jest.mock('@/components/ui/state-card', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    StateCard: ({ title }: { title: string }) =>
      React.createElement(Text, null, title)
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/features/account/components/account-list-skeleton', () => ({
  AccountListSkeleton: () => null
}));

jest.mock('@/features/totp/hooks/use-accounts', () => ({
  useAccounts: (): UseAccountsResult => ({
    accounts: mockAccounts,
    addAccount: jest.fn<UseAccountsResult['addAccount']>(),
    deleteAccount: jest.fn<UseAccountsResult['deleteAccount']>(),
    error: mockError,
    isLoading: false,
    reorderAccounts: mockReorderAccounts,
    updateAccount: jest.fn<UseAccountsResult['updateAccount']>()
  })
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');
  const MockAnimatedScrollView = React.forwardRef(
    (
      props: React.ComponentProps<typeof ScrollView>,
      ref: React.Ref<typeof ScrollView>
    ) => React.createElement(ScrollView, { ...props, ref })
  );

  MockAnimatedScrollView.displayName = 'MockAnimatedScrollView';

  return {
    __esModule: true,
    default: {
      ScrollView: MockAnimatedScrollView
    },
    useAnimatedRef: () => React.createRef()
  };
});

jest.mock('react-native-sortables', () => {
  const React = require('react');
  const { Pressable, View } = require('react-native');

  return {
    __esModule: true,
    default: {
      Grid: ({
        data,
        keyExtractor,
        onDragEnd,
        onDragStart,
        renderItem
      }: {
        data: OtpAccount[];
        keyExtractor: (account: OtpAccount) => string;
        onDragEnd: (params: {
          data: OtpAccount[];
          fromIndex: number;
          indexToKey: string[];
          key: string;
          keyToIndex: Record<string, number>;
          toIndex: number;
        }) => void;
        onDragStart: () => void;
        renderItem: (info: {
          item: OtpAccount;
          index: number;
        }) => React.ReactNode;
      }) => {
        const reversedData = [...data].reverse();
        const indexToKey = reversedData.map(keyExtractor);
        const keyToIndex = Object.fromEntries(
          indexToKey.map((key, index) => [key, index])
        );

        return React.createElement(
          View,
          null,
          data.map((item, index) =>
            React.createElement(
              View,
              { key: keyExtractor(item) },
              renderItem({ item, index })
            )
          ),
          React.createElement(Pressable, {
            onPress: () => {
              onDragStart();
              onDragEnd({
                data: reversedData,
                fromIndex: 0,
                indexToKey,
                key: indexToKey[0],
                keyToIndex,
                toIndex: 1
              });
            },
            testID: 'sortable-reorder'
          })
        );
      },
      Handle: ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, null, children)
    }
  };
});

import MoveAccountsScreen from '@/app/move-accounts';
import { MoveAccountsDoneButton } from '@/features/account/components/move-accounts-done-button';

const account: OtpAccount = {
  id: 'account-id',
  issuer: 'GitHub',
  label: 'user@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  type: 'totp',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  color: '#0891B2',
  sortOrder: 0,
  createdAt: 123
};

const secondAccount: OtpAccount = {
  ...account,
  id: 'second-account-id',
  issuer: 'Dropbox',
  label: 'work@example.com',
  sortOrder: 1
};

describe('MoveAccountsScreen', () => {
  beforeEach(() => {
    mockAccounts = [account, secondAccount];
    mockError = null;
    mockReorderAccounts.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    mockReorderAccounts.mockReset();
    jest.mocked(router.replace).mockReset();
  });

  it('renders compact account cards in saved order', async () => {
    const { getAllByTestId, getByLabelText, getByText } = await render(
      <MoveAccountsScreen />
    );

    const cards = getAllByTestId(/move-account-card-/);

    expect(cards.map(card => card.props.testID)).toEqual([
      'move-account-card-account-id',
      'move-account-card-second-account-id'
    ]);
    expect(getByText('GitHub')).toBeTruthy();
    expect(getByText('Dropbox')).toBeTruthy();
    expect(getByLabelText('Drag GitHub account')).toBeTruthy();
  });

  it('persists reordered account ids after drag end', async () => {
    const { getAllByTestId, getByTestId } = await render(
      <MoveAccountsScreen />
    );

    await fireEvent.press(getByTestId('sortable-reorder'));

    await waitFor(() => {
      expect(mockReorderAccounts).toHaveBeenCalledWith([
        'second-account-id',
        'account-id'
      ]);
    });

    expect(
      getAllByTestId(/move-account-card-/).map(card => card.props.testID)
    ).toEqual([
      'move-account-card-second-account-id',
      'move-account-card-account-id'
    ]);
  });

  it('shows a save error and restores saved order when reorder fails', async () => {
    mockReorderAccounts.mockImplementationOnce(async () => {
      mockError = new Error('Storage failed');

      throw mockError;
    });

    const { getAllByTestId, getByTestId, getByText, queryByText } =
      await render(<MoveAccountsScreen />);

    await fireEvent.press(getByTestId('sortable-reorder'));

    await waitFor(() => {
      expect(getByText('Order was not saved')).toBeTruthy();
    });

    expect(queryByText('Could not load saved accounts')).toBeNull();
    expect(
      getAllByTestId(/move-account-card-/).map(card => card.props.testID)
    ).toEqual([
      'move-account-card-account-id',
      'move-account-card-second-account-id'
    ]);
  });

  it('returns home from the Done header action', async () => {
    const { getByLabelText } = await render(<MoveAccountsDoneButton />);

    await fireEvent.press(getByLabelText('Done moving accounts'));

    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
