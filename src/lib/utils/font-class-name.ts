import { cn } from '@/lib/utils/cn';

const sansFaces: Record<string, string> = {
  'font-normal': 'font-sans',
  'font-medium': 'font-sans-medium',
  'font-semibold': 'font-sans-semibold',
  'font-bold': 'font-sans-bold',
  'font-extrabold': 'font-sans-extrabold'
};

const monoFaces: Record<string, string> = {
  'font-normal': 'font-mono-regular',
  'font-medium': 'font-mono-medium',
  'font-semibold': 'font-mono'
};

// Runtime-loaded faces are separate native families. Numeric weights alone do
// not select their matching files and can fall back to a system font on Android.
export function fontClassName(className: string) {
  const classes = className.split(/\s+/);
  const usesMono = classes.includes('font-mono');
  const faces = usesMono ? monoFaces : sansFaces;
  const weight = classes.find(value => value in sansFaces);
  const face = weight ? faces[weight] : undefined;

  return cn(className, face, 'font-normal');
}
