import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, MapPin, Award, GraduationCap, BookOpen, Beaker, Globe, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { University } from '@/types/university';

const UniversityDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const university = location.state?.university as University | undefined;

  if (!university) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">University not found.</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const tuitionDisplay =
    university.tuitionMin === 0 && university.tuitionMax === 0
      ? 'Free tuition'
      : `${university.currency === 'EUR' ? '€' : '$'}${university.tuitionMin.toLocaleString()} – ${university.currency === 'EUR' ? '€' : '$'}${university.tuitionMax.toLocaleString()} /year`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-background pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {university.name.split(' ').slice(0, 2).map(w => w[0]).join('')}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{university.name}</h1>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {university.city}, {university.flagEmoji} {university.country}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline">{university.type}</Badge>
                  {university.ranking && university.ranking > 0 && (
                    <Badge variant="secondary">World Rank #{university.ranking}</Badge>
                  )}
                  {university.scholarshipsAvailable && (
                    <Badge className="bg-primary/10 text-primary"><Award className="h-3 w-3 mr-1" /> Scholarships Available</Badge>
                  )}
                  {university.researchFocus && (
                    <Badge variant="secondary"><Beaker className="h-3 w-3 mr-1" /> Research Focus</Badge>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-2 space-y-6 pb-12">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: DollarSign, label: 'Tuition', value: tuitionDisplay },
            { icon: GraduationCap, label: 'Degrees', value: university.degreeTypes?.join(', ') || 'N/A' },
            { icon: Globe, label: 'Languages', value: university.teachingLanguages?.join(', ') || 'N/A' },
            { icon: BookOpen, label: 'Type', value: university.type },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{university.description}</p>
          </CardContent>
        </Card>

        {/* Popular Programs */}
        {university.popularPrograms?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Popular Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {university.popularPrograms.map((prog) => (
                  <Badge key={prog} variant="outline" className="text-sm py-1 px-3">
                    {prog}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/evaluate')} className="flex-1 gap-2">
            <Sparkles className="h-4 w-4" /> Evaluate Your Fit for {university.country}
          </Button>
          <a href={university.website} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" /> Visit University Website
            </Button>
          </a>
          <Button variant="outline" onClick={() => navigate('/visa')} className="flex-1 gap-2">
            📋 {university.country} Visa Guide
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UniversityDetail;
