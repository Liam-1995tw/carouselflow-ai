interface CarouselCardProps {
  slide: number;
  total: number;
  title: string;
  body: string;
  imageUrl?: string;
}

export default function CarouselCard({ slide, total, title, body, imageUrl }: CarouselCardProps) {
  return (
    <div className="relative w-[540px] h-[540px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col justify-end p-8">
      {imageUrl && (
        <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-20" />
      )}
      <span className="text-xs text-gray-400 mb-2">{slide} / {total}</span>
      <h3 className="text-2xl font-bold text-brand-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
