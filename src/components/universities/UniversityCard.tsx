import React from 'react';
import { University } from '@/types/university';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Award, GraduationCap } from 'lucide-react';

// Generate a consistent gradient based on university name
function getGradient(name: string): string {
  const gradients = [
    'from-blue-500/80 to-teal-400/80',
    'from-indigo-500/80 to-purple-400/80',
    'from-emerald-500/80 to-cyan-400/80',
    'from-orange-500/80 to-amber-400/80',
    'from-rose-500/80 to-pink-400/80',
    'from-violet-500/80 to-fuchsia-400/80',
    'from-sky-500/80 to-blue-400/80',
    'from-teal-500/80 to-green-400/80',
  ];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  return gradients[idx];
}

interface Props {
  university: University;
  onClick: () => void;
}

export const UniversityCard: React.FC<Props> = ({ university, onClick }) => {
  const gradient = getGradient(university.name);
  const tuitionDisplay =
    university.tuitionMin === 0 && university.tuitionMax === 0
      ? 'Free tuition'
      : `${university.currency === 'EUR' ? '€' : university.currency === 'USD' ? '$' : university.currency}${university.tuitionMin.toLocaleString()} – ${university.currency === 'EUR' ? '€' : university.currency === 'USD' ? '$' : university.currency}${university.tuitionMax.toLocaleString()} /year`;

  return (
    <Card
      className="group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      {/* Image area with gradient + initials */}
      <div className={`relative h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-4xl font-bold text-white/90">
          {university.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
        </span>
        
        {/* Badges overlay */}
        <div className="absolute top-2 right-2 flex gap-1">
          {university.scholarshipsAvailable && (
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1 px-1.5 py-0.5">
              <Award className="h-3 w-3" /> Aid
            </Badge>
          )}
        </div>
        {university.ranking && university.ranking > 0 && university.ranking <= 200 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] px-1.5 py-0.5">
              #{university.ranking}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {university.name}
        </h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {university.city}, {university.flagEmoji} {university.country}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{university.type}</Badge>
          {university.teachingLanguages?.slice(0, 2).map((lang) => (
            <Badge key={lang} variant="secondary" className="text-[10px]">{lang}</Badge>
          ))}
        </div>
        <p className="text-sm font-medium text-foreground">{tuitionDisplay}</p>
      </CardContent>
    </Card>
  );
};
