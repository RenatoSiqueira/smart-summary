'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Textarea } from '@/shared/components/ui/textarea';
import { Loader2, Sparkles, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const summarizeFormSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(50000, 'Text must be less than 50,000 characters'),
});

type SummarizeFormData = z.infer<typeof summarizeFormSchema>;

interface SummarizeFormProps {
  onSubmit: (text: string) => void;
  isStreaming?: boolean;
}

export function SummarizeForm({
  onSubmit,
  isStreaming = false,
}: SummarizeFormProps) {
  const form = useForm<SummarizeFormData>({
    resolver: zodResolver(summarizeFormSchema),
    defaultValues: {
      text: '',
    },
  });

  const handleSubmit = (data: SummarizeFormData) => {
    onSubmit(data.text);
  };

  const characterCount = form.watch('text')?.length || 0;
  const characterPercentage = (characterCount / 50000) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Background Glow Effect */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="group relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500">
        {/* Animated Border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute inset-[1px] rounded-2xl bg-background/95 backdrop-blur" />

        <div className="relative">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors duration-300">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  Transform Your Text
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Paste your content below and watch AI create an intelligent summary in real-time
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void form.handleSubmit(handleSubmit)(e);
                }}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Your Content
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder="Paste your article, document, or any text content here. Our AI will analyze and create a comprehensive summary while preserving key insights and important details..."
                            className="min-h-[240px] resize-none border-2 border-border/50 bg-background/50 backdrop-blur text-base leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background/80 transition-all duration-300 rounded-xl"
                            disabled={isStreaming}
                          />
                          {/* Character Count Indicator */}
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <div className="flex h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full transition-all duration-300 ${characterPercentage > 90
                                  ? 'bg-destructive'
                                  : characterPercentage > 70
                                    ? 'bg-yellow-500'
                                    : 'bg-primary'
                                  }`}
                                style={{ width: `${Math.min(characterPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormDescription className="text-sm">
                          {characterCount === 0 ? (
                            "Start typing to see the character count"
                          ) : (
                            <>
                              <span className={characterCount > 45000 ? 'text-destructive font-medium' : ''}>
                                {characterCount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground"> / 50,000 characters</span>
                            </>
                          )}
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Button
                    type="submit"
                    disabled={isStreaming || !form.formState.isValid || characterCount === 0}
                    size="lg"
                    className="group relative w-full overflow-hidden bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isStreaming ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>AI is analyzing your text...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 transition-transform group-hover:scale-110" />
                          <span>Generate Smart Summary</span>
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>

                {/* Quick Tips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-xl border bg-muted/30 p-4 backdrop-blur"
                >
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Pro Tips for Better Summaries
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Include complete sentences and paragraphs for best results</li>
                    <li>• Longer texts (500+ words) produce more detailed summaries</li>
                    <li>• Our AI preserves key insights and important context</li>
                  </ul>
                </motion.div>
              </form>
            </Form>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

