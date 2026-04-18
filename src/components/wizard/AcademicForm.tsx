import React, { useState, useRef, useEffect } from 'react';
import { StudentProfile, DegreeLevel } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, Beaker, Trophy, Briefcase, FileText, Code, FlaskConical, Landmark, TrendingUp, Heart, Atom, Cpu, Globe, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface AcademicFormProps {
  data: Partial<StudentProfile>;
  onChange: (data: Partial<StudentProfile>) => void;
}

const degreeColors: Record<DegreeLevel, { border: string; bg: string; iconBg: string; iconText: string }> = {
  undergraduate: { border: 'border-blue-500', bg: 'bg-blue-500/10', iconBg: 'bg-blue-500', iconText: 'text-white' },
  masters: { border: 'border-violet-500', bg: 'bg-violet-500/10', iconBg: 'bg-violet-500', iconText: 'text-white' },
  phd: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', iconBg: 'bg-emerald-500', iconText: 'text-white' },
};

const degreeLevels: { value: DegreeLevel; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'undergraduate', 
    label: 'Undergraduate', 
    icon: <BookOpen className="w-5 h-5" />,
    description: "Bachelor's degree program"
  },
  { 
    value: 'masters', 
    label: "Master's", 
    icon: <GraduationCap className="w-5 h-5" />,
    description: 'Graduate/Postgraduate program'
  },
  { 
    value: 'phd', 
    label: 'PhD', 
    icon: <Beaker className="w-5 h-5" />,
    description: 'Doctoral research program'
  },
];

const majorCategories = [
  { icon: Code, color: 'text-blue-500', majors: ['Computer Science', 'Data Science'] },
  { icon: Cpu, color: 'text-violet-500', majors: ['Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'] },
  { icon: FlaskConical, color: 'text-emerald-500', majors: ['Chemistry', 'Biology', 'Physics'] },
  { icon: Landmark, color: 'text-amber-500', majors: ['Business Administration', 'Economics'] },
  { icon: Heart, color: 'text-rose-500', majors: ['Public Health'] },
  { icon: Globe, color: 'text-cyan-500', majors: ['International Relations'] },
];

// SSC/HSC streams for Bangladeshi undergraduate applicants
const undergradMajorCategories = [
  { icon: FlaskConical, color: 'text-emerald-500', majors: ['Science'] },
  { icon: Landmark, color: 'text-amber-500', majors: ['Business Studies'] },
  { icon: BookOpen, color: 'text-rose-500', majors: ['Arts / Humanities'] },
];

const allMajors = majorCategories.flatMap(c => c.majors);

function getMajorIcon(major: string, categories = majorCategories) {
  for (const cat of categories) {
    if (cat.majors.includes(major)) {
      const Icon = cat.icon;
      return <Icon className={cn("w-4 h-4", cat.color)} />;
    }
  }
  return <BookOpen className="w-4 h-4 text-muted-foreground" />;
}

export const AcademicForm: React.FC<AcademicFormProps> = ({ data, onChange }) => {
  const [majorOpen, setMajorOpen] = useState(false);
  const isUndergrad = data.degreeLevel === 'undergraduate';
  const activeMajorCategories = isUndergrad ? undergradMajorCategories : majorCategories;

  const updateField = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    onChange({ ...data, [field]: value });
  };

  // Lock GPA scale to 5.0 for Bangladeshi undergraduate (HSC) applicants
  useEffect(() => {
    if (isUndergrad && data.cgpaScale !== 5) {
      onChange({ ...data, cgpaScale: 5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUndergrad]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-blue-500/10">
          <GraduationCap className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Academic Profile</h3>
          <p className="text-xs text-muted-foreground">Tell us about your education background</p>
        </div>
      </div>

      {/* Degree Level Selection */}
      <div className="input-group">
        <Label className="text-base">What degree are you applying for?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {degreeLevels.map((level) => {
            const colors = degreeColors[level.value];
            const isSelected = data.degreeLevel === level.value;
            return (
              <motion.button
                key={level.value}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => updateField('degreeLevel', level.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                  isSelected
                    ? cn(colors.border, colors.bg, "shadow-md")
                    : "border-border bg-card hover:border-muted-foreground/30"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  isSelected ? cn(colors.iconBg, colors.iconText) : "bg-muted text-muted-foreground"
                )}>
                  {level.icon}
                </div>
                <span className="font-semibold">{level.label}</span>
                <span className="text-xs text-muted-foreground text-center">{level.description}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Major/Field of Study - Custom Popover Dropdown */}
      <div className="input-group">
        <Label>{isUndergrad ? 'Field of Study (HSC stream)' : 'Your Major / Field of Study'}</Label>
        <Popover open={majorOpen} onOpenChange={setMajorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center justify-between w-full mt-2 px-3 py-2.5 rounded-md border bg-background text-sm text-left transition-colors hover:border-primary/50",
                data.major ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                {data.major ? getMajorIcon(data.major, activeMajorCategories) : <Search className="w-4 h-4 text-muted-foreground" />}
                <span>{data.major || (isUndergrad ? "Select your HSC stream..." : "Select or type your major...")}</span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={isUndergrad ? "Search streams..." : "Search majors..."}
                value={data.major || ''}
                onValueChange={(val) => updateField('major', val)}
              />
              <CommandList>
                <CommandEmpty>
                  <span className="text-xs">No preset match — using your custom input</span>
                </CommandEmpty>
                {activeMajorCategories.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <CommandGroup key={i}>
                      {cat.majors.map((major) => (
                        <CommandItem
                          key={major}
                          value={major}
                          onSelect={(val) => {
                            updateField('major', val);
                            setMajorOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Icon className={cn("w-4 h-4", cat.color)} />
                          <span>{major}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1">
          {isUndergrad ? 'Pick the HSC stream you studied' : 'Select from suggestions or type your own'}
        </p>
      </div>

      {/* GPA / CGPA */}
      {isUndergrad ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="input-group">
              <Label htmlFor="sscGpa">SSC GPA</Label>
              <Input
                id="sscGpa"
                type="number"
                step="0.01"
                min="0"
                max={5}
                placeholder="e.g., 5.00"
                value={data.sscGPA ?? ''}
                onChange={(e) => {
                  const ssc = parseFloat(e.target.value) || 0;
                  const hsc = data.hscGPA ?? 0;
                  const combined = ssc && hsc ? (ssc + hsc) / 2 : (ssc || hsc || 0);
                  onChange({ ...data, sscGPA: ssc, cgpa: combined });
                }}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
            </div>
            <div className="input-group">
              <Label htmlFor="hscGpa">HSC GPA</Label>
              <Input
                id="hscGpa"
                type="number"
                step="0.01"
                min="0"
                max={5}
                placeholder="e.g., 4.83"
                value={data.hscGPA ?? ''}
                onChange={(e) => {
                  const hsc = parseFloat(e.target.value) || 0;
                  const ssc = data.sscGPA ?? 0;
                  const combined = ssc && hsc ? (ssc + hsc) / 2 : (ssc || hsc || 0);
                  onChange({ ...data, hscGPA: hsc, cgpa: combined });
                }}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Combined GPA</span>
              <span className="text-xs text-muted-foreground">(average of SSC + HSC, on 5.0 scale)</span>
            </div>
            <span className="text-base font-bold text-primary">
              {data.cgpa ? data.cgpa.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="input-group">
            <Label htmlFor="cgpa">Your CGPA</Label>
            <Input
              id="cgpa"
              type="number"
              step="0.01"
              min="0"
              max={data.cgpaScale || 4}
              placeholder="e.g., 3.50"
              value={data.cgpa || ''}
              onChange={(e) => updateField('cgpa', parseFloat(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <div className="input-group">
            <Label>CGPA Scale</Label>
            <RadioGroup
              value={String(data.cgpaScale || 4)}
              onValueChange={(val) => updateField('cgpaScale', parseFloat(val))}
              className="flex gap-4 mt-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="4" id="scale-4" />
                <Label htmlFor="scale-4" className="font-normal cursor-pointer">4.0 Scale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="5" id="scale-5" />
                <Label htmlFor="scale-5" className="font-normal cursor-pointer">5.0 Scale</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}

      {/* Degree-Specific Fields */}
      
      {/* Bachelor's: Extracurricular Activities */}
      {data.degreeLevel === 'undergraduate' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-blue-500" />
            <Label className="text-base">Extracurricular Activities</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            List your ECAs — clubs, competitions, volunteer work, leadership roles. AI uses these to refine recommendations.
          </p>
          <Textarea
            placeholder="e.g., President of Debate Club, National Science Olympiad finalist, 200+ hours community service, Student Council VP..."
            value={data.extracurriculars || ''}
            onChange={(e) => updateField('extracurriculars', e.target.value)}
            rows={3}
          />
        </motion.div>
      )}

      {/* Master's: Internships & Work Experience */}
      {data.degreeLevel === 'masters' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 p-4 rounded-lg bg-violet-500/5 border border-violet-500/20"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-violet-500" />
            <Label className="text-base">Internships & Work Experience</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe your internships, jobs, or industry experience — especially relevant for European universities.
          </p>
          <div className="flex items-center gap-4 mb-2">
            <Label htmlFor="workYears" className="font-normal whitespace-nowrap">
              Years of experience:
            </Label>
            <Input
              id="workYears"
              type="number"
              min="0"
              step="0.5"
              className="w-24"
              value={data.workExperienceYears || 0}
              onChange={(e) => updateField('workExperienceYears', parseFloat(e.target.value) || 0)}
            />
          </div>
          <Textarea
            placeholder="e.g., Software Engineering Intern at Google (6 months), Junior Developer at TechCorp (1 year), Teaching Assistant for Data Structures..."
            value={data.internshipDetails || ''}
            onChange={(e) => updateField('internshipDetails', e.target.value)}
            rows={3}
          />
          <div className="flex items-center space-x-2">
            <Checkbox
              id="research-masters"
              checked={data.hasResearchExperience || false}
              onCheckedChange={(checked) => updateField('hasResearchExperience', !!checked)}
            />
            <Label htmlFor="research-masters" className="font-normal cursor-pointer">
              I have research experience (thesis, projects, lab work)
            </Label>
          </div>
        </motion.div>
      )}

      {/* PhD: Research & Publications */}
      {data.degreeLevel === 'phd' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <Label className="text-base">Research & Publications</Label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="research"
                checked={data.hasResearchExperience || false}
                onCheckedChange={(checked) => updateField('hasResearchExperience', !!checked)}
              />
              <Label htmlFor="research" className="font-normal cursor-pointer">
                I have research experience (thesis, projects, lab work)
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publications" className="font-normal">
                  Number of publications:
                </Label>
                <Input
                  id="publications"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={data.publicationsCount || 0}
                  onChange={(e) => updateField('publicationsCount', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="paperCount" className="font-normal">
                  Research papers (incl. unpublished):
                </Label>
                <Input
                  id="paperCount"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={data.researchPaperCount || 0}
                  onChange={(e) => updateField('researchPaperCount', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div>
              <Label className="font-normal">Paper links or details:</Label>
              <Textarea
                placeholder="e.g., https://arxiv.org/abs/xxxx, 'Machine Learning for X' published in IEEE conference 2024..."
                value={data.researchPapers || ''}
                onChange={(e) => updateField('researchPapers', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="workExpYears" className="font-normal whitespace-nowrap">
                Years of work experience:
              </Label>
              <Input
                id="workExpYears"
                type="number"
                min="0"
                step="0.5"
                className="w-24"
                value={data.workExperienceYears || 0}
                onChange={(e) => updateField('workExperienceYears', parseFloat(e.target.value) || 0)}
              />
            </div>
            <Textarea
              placeholder="Describe your work experience relevant to your research..."
              value={data.workExperienceDetails || ''}
              onChange={(e) => updateField('workExperienceDetails', e.target.value)}
              rows={2}
            />
          </div>
        </motion.div>
      )}

      {/* General work experience for undergraduate */}
      {data.degreeLevel === 'undergraduate' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="work"
            checked={data.hasWorkExperience || false}
            onCheckedChange={(checked) => updateField('hasWorkExperience', !!checked)}
          />
          <Label htmlFor="work" className="font-normal cursor-pointer">
            I have relevant work experience
          </Label>
        </div>
      )}
    </motion.div>
  );
};
