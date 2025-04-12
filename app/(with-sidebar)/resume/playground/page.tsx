'use client';

import Image from 'next/image';
import { RotateCcw, BarChart, ChevronRight, FileText, Briefcase, Check, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

import { CodeViewer } from './components/code-viewer';
import { MaxLengthSelector } from './components/maxlength-selector';
import { ModelSelector } from './components/model-selector';
import { PresetActions } from './components/preset-actions';
import { PresetSave } from './components/preset-save';
import { PresetSelector } from './components/preset-selector';
import { PresetShare } from './components/preset-share';
import { TemperatureSelector } from './components/temperature-selector';
import { TopPSelector } from './components/top-p-selector';
import { models, types } from './data/models';
import { presets } from './data/presets';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, ControllerRenderProps } from 'react-hook-form';
import * as z from 'zod';

// Form schema
const formSchema = z.object({
  jobTitle: z.string().min(1, {
    message: 'Job title is required.',
  }),
  introduction: z.string().min(10, {
    message: 'Introduction must be at least 10 characters.',
  }),
  motivation: z.string().min(10, {
    message: 'Motivation must be at least 10 characters.',
  }),
  experience: z.string().min(10, {
    message: 'Experience must be at least 10 characters.',
  }),
  aspirations: z.string().min(10, {
    message: 'Aspirations must be at least 10 characters.',
  }),
  company: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  customPrompt: z.string().optional(),
});

// Define type for form values
type FormValues = z.infer<typeof formSchema>;

// 직업 계층 데이터
type JobRolesData = {
  [category: string]: {
    [subcategory: string]: string[];
  };
};

const jobRolesData: JobRolesData = {
  'Technical Roles': {
    'Web/ Software Dev': [
      'Backend Engineer',
      'Frontend Developer',
      'Full-Stack Developer',
      'Web Developer',
    ],
    'Blockchain / Web3': ['Smart Contract', 'Protocol Engineer'],
    'Data/ AI': ['Machine Learning', 'AI'],
    Security: ['Security Engineer'],
  },
  'Business Roles': {
    Marketing: ['Marketer', 'Brand Strategist', 'Content Creator'],
    'Product/Strategy': ['Product Manager', 'Business Analyst'],
    'Human Resources': ['People Operations', 'HR Manager', 'Talent Acquisition'],
    'Customer / Operations': [
      'Customer Success Manager',
      'Customer Support Specialist',
      'Operations Manager',
    ],
  },
  'Creative Roles': {
    Design: [
      'UI/UX Designer',
      'Visual Designer',
      'Illustrator',
      'Video Editor',
      '3D Artist',
      'AI Artist',
      'Copywriter',
      'Sound Designer',
      'VFX Artist',
    ],
    Contents: ['Songwriter', 'Photographer'],
  },
  'Professional Services': {
    '': [
      'Consultant',
      'Auditor',
      'Lawyer/ Legal Counsel',
      'Pharmacist',
      'Clinical Researcher',
      'Counselor',
    ],
  },
};

// 참고 이력서 데이터
const referencedResumes = [
  {
    name: 'Software Developer Resume',
    reference: 65,
    icon: '💻',
    description: 'Resume focused on technical stack and development experience.',
  },
  {
    name: 'Frontend Expert Resume',
    reference: 25,
    icon: '🎨',
    description: 'Resume emphasizing UI/UX design experience and frontend technologies.',
  },
  {
    name: 'UX/UI Designer Resume',
    reference: 10,
    icon: '🖌️',
    description: 'Resume highlighting user experience and design philosophy.',
  },
];

export default function PlaygroundPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<{
    text?: string;
    sources?: Array<{ id: string; contributions: number }>;
  } | null>(null);

  // Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobTitle: '',
      introduction: '',
      motivation: '',
      experience: '',
      aspirations: '',
      company: '',
      department: '',
      position: '',
      customPrompt: '',
    },
  });

  // 직업 선택 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [openJobCategory, setOpenJobCategory] = useState(false);
  const [openJobSubcategory, setOpenJobSubcategory] = useState(false);
  const [openJobTitle, setOpenJobTitle] = useState(false);

  // 직업 카테고리 변경 핸들러
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    setSelectedJobTitle('');
    setOpenJobCategory(false);

    // Professional Services는 서브카테고리가 없으므로 바로 직업 선택 가능
    if (category === 'Professional Services') {
      setOpenJobTitle(true);
    }
  };

  // 서브카테고리 변경 핸들러
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedJobTitle('');
    setOpenJobSubcategory(false);
    setOpenJobTitle(true);
  };

  // 직업 선택 핸들러
  const handleJobTitleChange = (jobTitle: string) => {
    setSelectedJobTitle(jobTitle);
    setOpenJobTitle(false);
    form.setValue('jobTitle', jobTitle, { shouldValidate: true });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('values', values);
    setIsLoading(true);
    setResultText('');
    setParsedResult(null);
    
    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selfIntroduction: values.introduction,
          motivation: values.motivation,
          relevantExperience: values.experience,
          futureAspirations: values.aspirations,
          targetCompany: values.company || null,
          department: values.department || null,
          position: values.jobTitle || null,
          customPrompt: values.customPrompt || '',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '자기소개서 생성에 실패했습니다.');
      }
      
      // Store the raw text
      setResultText(data.result || data.coverLetter || JSON.stringify(data, null, 2));
      
      // Try to parse the JSON response if it's a string
      try {
        // Check if data is already an object with text property
        if (typeof data.text === 'string') {
          setParsedResult(data);
        } 
        // Check if data has result/coverLetter as a string that might be JSON
        else if (typeof data.result === 'string' || typeof data.coverLetter === 'string') {
          const textContent = data.result || data.coverLetter;
          try {
            const parsed = JSON.parse(textContent);
            setParsedResult(parsed);
          } catch {
            // If it's not valid JSON, use it as plain text
            setParsedResult({ text: textContent });
          }
        } 
        // If we just have raw data
        else {
          setParsedResult(data);
        }
      } catch (e) {
        // If parsing fails, we'll fall back to the raw text display
        console.error("Failed to parse result:", e);
      }
      
      toast('자기소개서 생성 완료', {
        description: '자기소개서가 성공적으로 생성되었습니다.',
        icon: <Check className="h-4 w-4 text-green-500" />,
      });
    } catch (error) {
      console.error('제출 오류:', error);
      toast('오류 발생', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        style: { backgroundColor: 'hsl(var(--destructive))' },
        icon: <X className="h-4 w-4 text-white" />,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Helper function to format paragraphs with spacing and styling
  const formatCoverLetter = (text: string) => {
    // Replace placeholders with actual values if available
    let formattedText = text;
    const company = form.getValues('company');
    const jobTitle = form.getValues('jobTitle');
    const department = form.getValues('department');
    
    if (company) {
      formattedText = formattedText.replace(/\[targetCompany\]/g, company);
    }
    if (jobTitle) {
      formattedText = formattedText.replace(/\[position\]/g, jobTitle);
    }
    if (department) {
      formattedText = formattedText.replace(/\[specific department\]/g, department);
    }
    
    // Split by paragraphs and map to styled components
    return formattedText.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph}
      </p>
    ));
  };

  return (
    <div className="h-full w-full flex-1 px-15">
      <div className="md:hidden">
        <Image
          src="/examples/playground-light.png"
          width={1280}
          height={916}
          alt="Playground"
          className="block dark:hidden"
        />
        <Image
          src="/examples/playground-dark.png"
          width={1280}
          height={916}
          alt="Playground"
          className="hidden dark:block"
        />
      </div>
      <div className="hidden h-full flex-col items-center justify-center md:flex">
        <div className="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
          <h2 className="text-lg font-semibold">Playground</h2>
          <div className="ml-auto flex w-full space-x-2 sm:justify-end">
            <PresetSelector presets={presets} />
            <PresetSave />
            <div className="hidden space-x-2 md:flex">
              <CodeViewer />
              <PresetShare />
            </div>
            <PresetActions />
          </div>
        </div>
        <Separator />
        <Tabs defaultValue="edit" className="w-full flex-1 items-center">
          <div className="container h-full py-6">
            <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px]">
              <div className="hidden flex-col space-y-4 sm:flex md:order-2">
                <ModelSelector types={types} models={models} />
                <TemperatureSelector defaultValue={[0.56]} />
                <MaxLengthSelector defaultValue={[256]} />
                <TopPSelector defaultValue={[0.9]} />

                {/* 참고한 이력서 목록 */}
                <div className="mt-10 space-y-2">
                  <div className="mb-2 flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Referenced Resumes</h3>
                  </div>
                  <div className="space-y-2">
                    {referencedResumes.map((resume, index) => (
                      <HoverCard key={index}>
                        <HoverCardTrigger asChild>
                          <Card className="hover:bg-accent/40 cursor-pointer overflow-hidden p-3 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border">
                                <AvatarFallback className="text-sm">{resume.icon}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center">
                                  <p className="flex-1 text-sm font-medium">{resume.name}</p>
                                  <ChevronRight className="text-muted-foreground h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                                    <div
                                      className="bg-primary h-full rounded-full"
                                      style={{ width: `${resume.reference}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground text-xs">
                                    {resume.reference}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="flex justify-between space-x-4">
                            <div className="space-y-1">
                              <h4 className="text-sm font-semibold">{resume.name}</h4>
                              <p className="text-muted-foreground text-sm">{resume.description}</p>
                              <div className="flex items-center pt-2">
                                <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                                <span className="text-muted-foreground text-xs">
                                  Reference Rate: {resume.reference}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                </div>
              </div>
              <div className="md:order-1">
                <TabsContent value="complete" className="mt-0 border-0 p-0">
                  <div className="flex h-full flex-col space-y-4">
                    <Textarea
                      placeholder="Write a tagline for an ice cream shop"
                      className="min-h-[400px] flex-1 p-4 md:min-h-[700px] lg:min-h-[700px]"
                    />
                    <div className="flex items-center space-x-2">
                      <Button>Submit</Button>
                      <Button variant="secondary">
                        <span className="sr-only">Show history</span>
                        <RotateCcw />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="insert" className="mt-0 border-0 p-0">
                  <div className="flex flex-col space-y-4">
                    <div className="grid h-full grid-rows-2 gap-6 lg:grid-cols-2 lg:grid-rows-1">
                      <Textarea
                        placeholder="We're writing to [inset]. Congrats from OpenAI!"
                        className="h-full min-h-[300px] lg:min-h-[700px] xl:min-h-[700px]"
                      />
                      <div className="bg-muted rounded-md border"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button>Submit</Button>
                      <Button variant="secondary">
                        <span className="sr-only">Show history</span>
                        <RotateCcw />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="edit" className="mt-0 border-0 p-0">
                  <div className="flex flex-col space-y-4">
                    <div className="grid h-full gap-6 lg:grid-cols-2">
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-1 flex-col space-y-2">
                          <Label htmlFor="input">Resume Information Form</Label>
                          <Card className="flex-1">
                            <CardContent className="pt-4">
                              <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                  {/* Basic Information */}
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Basic Information</h3>

                                    <FormField
                                      control={form.control}
                                      name="jobTitle"
                                      render={() => (
                                        <FormItem>
                                          <FormLabel className="flex items-center gap-2">
                                            <Briefcase className="text-muted-foreground h-4 w-4" />
                                            Job Title
                                          </FormLabel>
                                          <FormControl>
                                            <div className="flex flex-col space-y-4">
                                              {/* 직업 카테고리 선택 */}
                                              <Popover
                                                open={openJobCategory}
                                                onOpenChange={setOpenJobCategory}
                                              >
                                                <PopoverTrigger asChild>
                                                  <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={openJobCategory}
                                                    className="w-full justify-between"
                                                  >
                                                    {selectedCategory || 'Select job category...'}
                                                    <ChevronRight
                                                      className={`ml-2 h-4 w-4 shrink-0 opacity-50 ${selectedCategory ? 'text-primary' : ''}`}
                                                    />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                  className="p-0"
                                                  style={{
                                                    width: 'var(--radix-popover-trigger-width)',
                                                    minWidth: '100%',
                                                  }}
                                                >
                                                  <Command className="w-full">
                                                    <CommandList className="w-full">
                                                      <CommandInput placeholder="Search job category..." />
                                                      <CommandEmpty>
                                                        No category found.
                                                      </CommandEmpty>
                                                      {Object.keys(jobRolesData).map((category) => (
                                                        <CommandItem
                                                          key={category}
                                                          value={category}
                                                          onSelect={() =>
                                                            handleCategoryChange(category)
                                                          }
                                                          className="cursor-pointer"
                                                        >
                                                          {category}
                                                          {selectedCategory === category && (
                                                            <Check className="text-primary ml-auto h-4 w-4" />
                                                          )}
                                                        </CommandItem>
                                                      ))}
                                                    </CommandList>
                                                  </Command>
                                                </PopoverContent>
                                              </Popover>

                                              {/* 직업 서브카테고리 선택 */}
                                              {selectedCategory &&
                                                selectedCategory !== 'Professional Services' && (
                                                  <Popover
                                                    open={openJobSubcategory}
                                                    onOpenChange={setOpenJobSubcategory}
                                                  >
                                                    <PopoverTrigger asChild>
                                                      <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openJobSubcategory}
                                                        className="w-full justify-between"
                                                      >
                                                        {selectedSubcategory ||
                                                          'Select subcategory...'}
                                                        <ChevronRight
                                                          className={`ml-2 h-4 w-4 shrink-0 opacity-50 ${selectedSubcategory ? 'text-primary' : ''}`}
                                                        />
                                                      </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                      className="p-0"
                                                      style={{
                                                        width: 'var(--radix-popover-trigger-width)',
                                                        minWidth: '100%',
                                                      }}
                                                    >
                                                      <Command className="w-full">
                                                        <CommandList className="w-full">
                                                          <CommandInput placeholder="Search subcategory..." />
                                                          <CommandEmpty>
                                                            No subcategory found.
                                                          </CommandEmpty>
                                                          {selectedCategory &&
                                                            Object.keys(
                                                              jobRolesData[selectedCategory]
                                                            ).map((subcategory) => (
                                                              <CommandItem
                                                                key={subcategory}
                                                                value={subcategory}
                                                                onSelect={() =>
                                                                  handleSubcategoryChange(
                                                                    subcategory
                                                                  )
                                                                }
                                                                className="cursor-pointer"
                                                              >
                                                                {subcategory}
                                                                {selectedSubcategory ===
                                                                  subcategory && (
                                                                  <Check className="text-primary ml-auto h-4 w-4" />
                                                                )}
                                                              </CommandItem>
                                                            ))}
                                                        </CommandList>
                                                      </Command>
                                                    </PopoverContent>
                                                  </Popover>
                                                )}

                                              {/* 직업 타이틀 선택 */}
                                              {(selectedCategory === 'Professional Services' ||
                                                (selectedCategory && selectedSubcategory)) && (
                                                <Popover
                                                  open={openJobTitle}
                                                  onOpenChange={setOpenJobTitle}
                                                >
                                                  <PopoverTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      role="combobox"
                                                      aria-expanded={openJobTitle}
                                                      className="w-full justify-between"
                                                    >
                                                      {selectedJobTitle || 'Select job title...'}
                                                      <ChevronRight
                                                        className={`ml-2 h-4 w-4 shrink-0 opacity-50 ${selectedJobTitle ? 'text-primary' : ''}`}
                                                      />
                                                    </Button>
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="p-0"
                                                    style={{
                                                      width: 'var(--radix-popover-trigger-width)',
                                                      minWidth: '100%',
                                                    }}
                                                  >
                                                    <Command className="w-full">
                                                      <CommandList className="w-full">
                                                        <CommandInput placeholder="Search job title..." />
                                                        <CommandEmpty>
                                                          No job title found.
                                                        </CommandEmpty>
                                                        {selectedCategory ===
                                                        'Professional Services'
                                                          ? jobRolesData['Professional Services'][
                                                              ''
                                                            ].map((jobTitle) => (
                                                              <CommandItem
                                                                key={jobTitle}
                                                                value={jobTitle}
                                                                onSelect={() =>
                                                                  handleJobTitleChange(jobTitle)
                                                                }
                                                                className="cursor-pointer"
                                                              >
                                                                {jobTitle}
                                                                {selectedJobTitle === jobTitle && (
                                                                  <Check className="text-primary ml-auto h-4 w-4" />
                                                                )}
                                                              </CommandItem>
                                                            ))
                                                          : selectedCategory &&
                                                            selectedSubcategory &&
                                                            jobRolesData[selectedCategory][
                                                              selectedSubcategory
                                                            ]?.map((jobTitle) => (
                                                              <CommandItem
                                                                key={jobTitle}
                                                                value={jobTitle}
                                                                onSelect={() =>
                                                                  handleJobTitleChange(jobTitle)
                                                                }
                                                                className="cursor-pointer"
                                                              >
                                                                {jobTitle}
                                                                {selectedJobTitle === jobTitle && (
                                                                  <Check className="text-primary ml-auto h-4 w-4" />
                                                                )}
                                                              </CommandItem>
                                                            ))}
                                                      </CommandList>
                                                    </Command>
                                                  </PopoverContent>
                                                </Popover>
                                              )}

                                              {/* 선택된 직업 표시 */}
                                              {selectedJobTitle && (
                                                <div className="mt-2 flex items-center">
                                                  <Badge
                                                    variant="outline"
                                                    className="bg-primary/10 text-primary"
                                                  >
                                                    {selectedJobTitle}
                                                    <Check className="ml-1 h-3 w-3" />
                                                  </Badge>
                                                </div>
                                              )}
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="introduction"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'introduction'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Self Introduction</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Write a brief introduction about yourself"
                                              className="min-h-[100px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="motivation"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'motivation'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Motivation</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Describe your motivation for applying to this position"
                                              className="min-h-[100px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="experience"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'experience'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Relevant Experience</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Share your relevant experiences and skills"
                                              className="min-h-[100px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="aspirations"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'aspirations'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Future Aspirations</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Describe your aspirations after joining the company"
                                              className="min-h-[100px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {/* Additional Information (Optional) */}
                                  <div className="space-y-4 pt-4">
                                    <h3 className="text-lg font-medium">
                                      Additional Information (Optional)
                                    </h3>

                                    <FormField
                                      control={form.control}
                                      name="company"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'company'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Target Company</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Company name" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="department"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'department'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Department</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Department" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="customPrompt"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'customPrompt'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel>Custom Instructions (Optional)</FormLabel>
                                          <FormControl>
                                            <Textarea
                                              placeholder="Any specific instructions for generating your resume"
                                              className="min-h-[80px]"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </form>
                              </Form>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      <div className="bg-muted mt-[21px] min-h-[400px] rounded-md border lg:min-h-[700px] p-4 overflow-auto">
                        {isLoading ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                              <p className="text-muted-foreground">자기소개서 생성 중...</p>
                            </div>
                          </div>
                        ) : parsedResult?.text ? (
                          <div className="max-w-3xl mx-auto bg-card p-6 rounded-lg shadow-sm">
                            <div className="prose prose-sm dark:prose-invert">
                              {formatCoverLetter(parsedResult.text)}
                            </div>
                            
                            {parsedResult.sources && parsedResult.sources.length > 0 && (
                              <div className="mt-8 pt-4 border-t border-border">
                                <h4 className="text-sm font-semibold mb-2">참고 소스</h4>
                                <div className="text-sm text-muted-foreground">
                                  {parsedResult.sources.map((source, index) => (
                                    <div key={index} className="flex justify-between items-center mb-1">
                                      <span>{source.id || '기본 템플릿'}</span>
                                      <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                        {source.contributions}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : resultText ? (
                          <div className="whitespace-pre-wrap">{resultText}</div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <p>폼을 작성하고 Submit 버튼을 클릭하면 결과가 여기에 표시됩니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        onClick={form.handleSubmit(onSubmit)} 
                        disabled={isLoading}
                      >
                        {isLoading ? '처리 중...' : 'Submit'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => setResultText('')}
                        disabled={isLoading || !resultText}
                      >
                        <span className="sr-only">Clear result</span>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        초기화
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
