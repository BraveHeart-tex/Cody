import { Field } from '@/components/ui/field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  THEME_MODES,
  type ThemeMode
} from '@/features/settings/model/settings';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';

const THEME_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System'
};

const THEME_ICONS = {
  dark: Moon,
  light: Sun,
  system: Monitor
} satisfies Record<ThemeMode, LucideIcon>;

interface ThemeSettingsSectionProps {
  onSelect: (value: ThemeMode) => void | Promise<void>;
  selectedValue: ThemeMode;
}

export function ThemeSettingsSection({
  onSelect,
  selectedValue
}: ThemeSettingsSectionProps) {
  return (
    <Field label="Theme">
      <SegmentedControl
        icons={THEME_ICONS}
        labels={THEME_LABELS}
        options={THEME_MODES}
        selectedValue={selectedValue}
        onSelect={onSelect}
      />
    </Field>
  );
}
