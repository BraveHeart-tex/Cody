import { Card, CardDescription, CardTitle } from '@/components/ui/card';

interface StateCardProps {
  description: string;
  title: string;
}

export function StateCard({ description, title }: StateCardProps) {
  return (
    <Card className="gap-2 rounded-lg border-dashed px-5 py-8">
      <CardTitle className="text-foreground text-center text-lg">
        {title}
      </CardTitle>
      <CardDescription className="text-center text-base leading-6">
        {description}
      </CardDescription>
    </Card>
  );
}
