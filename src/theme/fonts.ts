import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk/800ExtraBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';

export const appFonts = {
  family: 'Hanken Grotesk',
  faces: {
    regular: 'HankenGrotesk_400Regular',
    medium: 'HankenGrotesk_500Medium',
    semiBold: 'HankenGrotesk_600SemiBold',
    bold: 'HankenGrotesk_700Bold',
    extraBold: 'HankenGrotesk_800ExtraBold'
  }
} as const;

export const monoFonts = {
  family: 'JetBrains Mono',
  faces: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semiBold: 'JetBrainsMono_600SemiBold'
  }
} as const;

export const appFontAssets = {
  [appFonts.faces.regular]: HankenGrotesk_400Regular,
  [appFonts.faces.medium]: HankenGrotesk_500Medium,
  [appFonts.faces.semiBold]: HankenGrotesk_600SemiBold,
  [appFonts.faces.bold]: HankenGrotesk_700Bold,
  [appFonts.faces.extraBold]: HankenGrotesk_800ExtraBold,
  [monoFonts.faces.regular]: JetBrainsMono_400Regular,
  [monoFonts.faces.medium]: JetBrainsMono_500Medium,
  [monoFonts.faces.semiBold]: JetBrainsMono_600SemiBold
};
