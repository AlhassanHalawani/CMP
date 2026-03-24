import { cn } from '@/lib/utils';

type Props = {
  imageUrl: string;
  caption: string;
  className?: string;
};

export function ImageCard({ imageUrl, caption, className }: Props) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
        className,
      )}
    >
      <img className="w-full aspect-video object-cover" src={imageUrl} alt={caption} />
      <figcaption className="border-t p-3 text-sm font-medium">{caption}</figcaption>
    </figure>
  );
}
