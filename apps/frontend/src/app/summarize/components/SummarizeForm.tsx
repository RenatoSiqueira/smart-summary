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
import { Loader2 } from 'lucide-react';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Summarize Text</CardTitle>
          <CardDescription>
            Enter the text you want to summarize. The AI will generate a concise
            summary in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit(handleSubmit)(e);
              }}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text to Summarize</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter the text you want to summarize here..."
                        className="min-h-[200px] resize-none"
                        disabled={isStreaming}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 50,000 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isStreaming || !form.formState.isValid}
                className="w-full"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="h-4 w-4 -mr-1 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  'Summarize'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

