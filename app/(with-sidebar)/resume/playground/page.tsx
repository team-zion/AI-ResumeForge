'use client';

import Image from 'next/image';
import {
  RotateCcw,
  ChevronRight,
  FileText,
  Briefcase,
  Check,
  X,
  Tag,
  Clock,
  Building2,
  Users,
  FileEdit,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

import { MaxLengthSelector } from './components/maxlength-selector';
import { ModelSelector } from './components/model-selector';
import { TemperatureSelector } from './components/temperature-selector';
import { TopPSelector } from './components/top-p-selector';
import { models, types } from './data/models';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { useWallets } from '@privy-io/react-auth';
import getSession from '@/utils/getSession';
import { useRouter } from 'next/navigation';

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
  skills: z.string().optional(),
  yearsOfExperience: z.string().min(1, {
    message: 'Years of experience is required.',
  }),
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

// 스키마 정의
const coverLetterSchema = z.object({
  text: z.string().describe('자기소개서 생성된 텍스트 내용'),
  sources: z
    .array(
      z.object({
        id: z.string().describe('참고 소스 ID'),
        contributions: z.number().describe('기여도 (백분율)'),
      })
    )
    .optional(),
});

export default function PlaygroundPage() {
  const [error, setError] = useState<Error | null>(null);
  const [savedToDatabase, setSavedToDatabase] = useState(false);

  // 저장 진행 상태 관련 상태
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveProgress, setShowSaveProgress] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [currentSaveStep, setCurrentSaveStep] = useState('');

  const { wallets } = useWallets();
  const router = useRouter();

  // Form setup
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
      skills: '',
      yearsOfExperience: '',
    },
  });

  // useObject 훅 사용
  const { object, submit, isLoading, stop } = useObject({
    api: '/api/edit',
    schema: coverLetterSchema,
  });

  console.log('object', object);

  // 직업 선택 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [openJobCategory, setOpenJobCategory] = useState(false);
  const [openJobSubcategory, setOpenJobSubcategory] = useState(false);
  const [openJobTitle, setOpenJobTitle] = useState(false);

  const [temperature, setTemperature] = useState<number[]>([0.7]);
  const [maxLength, setMaxLength] = useState<number[]>([4000]);
  const [topP, setTopP] = useState<number[]>([0.9]);

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

  const fullJobTitle = selectedJobTitle
    ? selectedCategory === 'Professional Services'
      ? selectedJobTitle
      : `${selectedCategory} > ${selectedSubcategory} > ${selectedJobTitle}`
    : form.getValues('jobTitle');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('폼 제출 시작', values);
    setError(null);

    // 경력에 따라 S(시니어) 또는 J(주니어) 결정
    const experienceLevel =
      form.getValues('yearsOfExperience') === '5-10 years' ||
      form.getValues('yearsOfExperience') === '10+ years'
        ? 'S'
        : 'J';

    const payload = {
      selfIntroduction: values.introduction,
      motivation: values.motivation,
      relevantExperience: values.experience,
      futureAspirations: values.aspirations,
      targetCompany: values.company || null,
      department: values.department || null,
      position: values.jobTitle || null,
      customPrompt: values.customPrompt || '',
      skills: values.skills || '',
      experience: values.yearsOfExperience,
    };

    console.log('API 요청 데이터:', payload);

    try {
      // 작업 시작 알림
      toast('Cover Letter Generation Started', {
        description: 'Your cover letter is being generated.',
        icon: <Check className="h-4 w-4 text-green-500" />,
      });

      // useObject submit 메서드 사용하여 요청 전송
      submit({
        payload,
        body: {
          role: fullJobTitle,
          experience: experienceLevel,
        },
        modelParams: {
          temperature: temperature[0],
          max_tokens: maxLength[0],
          top_p: topP[0],
        },
      });
    } catch (err) {
      console.error('제출 오류:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(err instanceof Error ? err : new Error(errorMessage));

      toast('Save Error', {
        description: errorMessage,
        style: { backgroundColor: 'hsl(var(--destructive))' },
        icon: <X className="h-4 w-4 text-white" />,
      });
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

    // Function to convert markdown-style bold (**text**) to HTML strong tags
    const convertBoldText = (text: string) => {
      // Use a regex to find all occurrences of **text**
      return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove the ** markers and wrap the content in <strong> tag
          const boldContent = part.slice(2, -2);
          return <strong key={i}>{boldContent}</strong>;
        }
        return part;
      });
    };

    // Split by paragraphs and map to styled components with bold text handling
    return formattedText.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">
        {convertBoldText(paragraph)}
      </p>
    ));
  };

  // 업로드 처리 함수
  const handleUpload = async (formData: FormData) => {
    try {
      setIsSaving(true);
      setShowSaveProgress(true);
      setSaveProgress(0);
      setCurrentSaveStep('파일 업로드 중...');

      const response = await fetch('/api/edit/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setSaveProgress(100);
        setCurrentSaveStep('저장 완료');
        setSavedToDatabase(true);
        toast('Cover Letter Saved', {
          description: 'Your cover letter has been successfully converted to PDF and saved.',
          icon: <Check className="h-4 w-4 text-green-500" />,
        });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast('Upload Error', {
        description: errorMessage,
        style: { backgroundColor: 'hsl(var(--destructive))' },
        icon: <X className="h-4 w-4 text-white" />,
      });
    } finally {
      setIsSaving(false);
      if (saveProgress === 100) {
        setTimeout(() => {
          setShowSaveProgress(false);
        }, 2000);
      }
    }
  };

  // Notification when result generation is complete
  useEffect(() => {
    if (object && object.text && !isLoading) {
      toast('Cover Letter Generated', {
        description: 'Your cover letter has been successfully generated.',
        icon: <Check className="h-4 w-4 text-green-500" />,
      });
      // 생성 완료 시 저장 상태 초기화
      setSavedToDatabase(false);
    }
  }, [object, isLoading]);

  // 이력서 저장 함수
  const handleSaveResume = async () => {
    if (!object?.text) return;

    const session = await getSession();

    const formData = new FormData();
    formData.append('text', object.text);
    formData.append('pdf', new Blob([object.text], { type: 'text/plain' }));
    formData.append('walletAddress', wallets[0].address);
    formData.append('userId', session?.user?.id || '');
    formData.append('references', JSON.stringify(object.sources || []));
    formData.append('metadata', JSON.stringify({
      role: form.getValues('jobTitle'),
      experience: form.getValues('yearsOfExperience'),
    }));

    await handleUpload(formData);
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
        {/* <div className="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
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
        </div> */}
        <Separator />
        <Tabs defaultValue="edit" className="w-full flex-1 items-center">
          <div className="container h-full py-6">
            <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px]">
              <div className="hidden flex-col space-y-4 sm:flex md:order-2">
                <ModelSelector types={types} models={models} />
                <TemperatureSelector
                  defaultValue={temperature}
                  onValueChange={(value) => setTemperature(value)}
                />
                <MaxLengthSelector
                  defaultValue={maxLength}
                  onValueChange={(value) => setMaxLength(value)}
                />
                <TopPSelector defaultValue={topP} onValueChange={(value) => setTopP(value)} />

                {/* 참고한 이력서 목록 */}
                {/* <div className="mt-10 space-y-2">
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
                </div> */}
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
                                      name="yearsOfExperience"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<
                                          FormValues,
                                          'yearsOfExperience'
                                        >;
                                      }) => (
                                        <FormItem>
                                          <FormLabel className="flex items-center gap-2">
                                            <Clock className="text-muted-foreground h-4 w-4" />
                                            Years of Experience
                                          </FormLabel>
                                          <div>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                              {[
                                                'Less than 1 year',
                                                '1-2 years',
                                                '3-5 years',
                                                '5-10 years',
                                                '10+ years',
                                              ].map((option) => (
                                                <Badge
                                                  key={option}
                                                  variant={
                                                    field.value === option ? 'default' : 'outline'
                                                  }
                                                  className={cn(
                                                    'hover:bg-primary/20 cursor-pointer transition-colors',
                                                    field.value === option
                                                      ? 'bg-primary text-primary-foreground'
                                                      : ''
                                                  )}
                                                  onClick={() =>
                                                    form.setValue('yearsOfExperience', option, {
                                                      shouldValidate: true,
                                                    })
                                                  }
                                                >
                                                  {option}
                                                  {field.value === option && (
                                                    <Check className="ml-1 h-3 w-3" />
                                                  )}
                                                </Badge>
                                              ))}
                                            </div>
                                            {form.formState.errors.yearsOfExperience && (
                                              <p className="text-destructive mt-2 text-sm">
                                                {form.formState.errors.yearsOfExperience.message}
                                              </p>
                                            )}
                                          </div>
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
                                      name="skills"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'skills'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel className="flex items-center gap-2">
                                            <Tag className="text-muted-foreground h-4 w-4" />
                                            Skills & Keywords
                                          </FormLabel>
                                          <FormControl>
                                            <Input
                                              placeholder="e.g. React, TypeScript, UI Design, Project Management"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name="company"
                                      render={({
                                        field,
                                      }: {
                                        field: ControllerRenderProps<FormValues, 'company'>;
                                      }) => (
                                        <FormItem>
                                          <FormLabel className="flex items-center gap-2">
                                            <Building2 className="text-muted-foreground h-4 w-4" />
                                            Target Company
                                          </FormLabel>
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
                                          <FormLabel className="flex items-center gap-2">
                                            <Users className="text-muted-foreground h-4 w-4" />
                                            Department
                                          </FormLabel>
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
                                          <FormLabel className="flex items-center gap-2">
                                            <FileEdit className="text-muted-foreground h-4 w-4" />
                                            Custom Instructions
                                          </FormLabel>
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
                      <div className="bg-muted mt-[21px] min-h-[400px] overflow-auto rounded-md border p-4 lg:min-h-[700px]">
                        {object?.text ? (
                          <div className="bg-card mx-auto max-w-3xl rounded-lg p-6 shadow-sm">
                            <div className="prose prose-sm dark:prose-invert">
                              {formatCoverLetter(object.text)}
                            </div>

                            {object.sources && object.sources[0]?.id !== 'unknown' && (
                              <div className="border-border mt-8 border-t pt-4">
                                <h4 className="mb-2 text-sm font-semibold">Reference Sources</h4>
                                <div className="text-muted-foreground text-sm">
                                  {object.sources.map((source, index) => (
                                    <div
                                      key={index}
                                      className="mb-1 flex items-center justify-between"
                                    >
                                      <span>{source?.id || 'Default Template'}</span>
                                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                                        {source?.contributions || 0}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : error ? (
                          <div className="bg-destructive/10 text-destructive rounded-md p-4 text-sm">
                            <h4 className="mb-2 font-medium">Error Occurred</h4>
                            <pre className="text-xs whitespace-pre-wrap">{error.message}</pre>
                          </div>
                        ) : (
                          <div className="text-muted-foreground flex h-full items-center justify-center">
                            <p>Fill out the form and click Submit to see the results here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
                        {isLoading ? 'Processing...' : 'Submit'}
                      </Button>
                      <Button variant="secondary" onClick={() => stop()} disabled={!isLoading}>
                        <span className="sr-only">Stop generation</span>
                        <X className="mr-2 h-4 w-4" />
                        Stop Generation
                      </Button>
                      {object?.text && !isLoading && (
                        <Button
                          variant="outline"
                          onClick={handleSaveResume}
                          disabled={savedToDatabase || isSaving}
                          className={cn(
                            savedToDatabase && 'border-green-500 text-green-500',
                            'cursor-pointer'
                          )}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              {savedToDatabase ? 'Saved' : 'Save'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      {/* 저장 진행상황 알림 대화상자 */}
      <AlertDialog
        open={showSaveProgress}
        onOpenChange={(open) => {
          // 저장 중일 때는 사용자가 대화상자를 닫지 못하게 함
          if (!open && isSaving && saveProgress < 100) {
            return;
          }
          setShowSaveProgress(open);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {saveProgress === 100 ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Save Completed
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving Cover Letter
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p>{currentSaveStep}</p>
              <Progress value={saveProgress} className="h-2 w-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${saveProgress}%` }}
                />
              </Progress>
              <div className="flex justify-between text-xs text-gray-500">
                <span>PDF Generation</span>
                <span>Upload</span>
                <span>Server Processing</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {saveProgress === 100 ? (
              <AlertDialogAction onClick={() => router.push('/')}>Confirm</AlertDialogAction>
            ) : (
              <AlertDialogCancel disabled={isSaving && saveProgress < 100}>
                {isSaving && saveProgress < 100 ? 'Processing...' : 'Cancel'}
              </AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
