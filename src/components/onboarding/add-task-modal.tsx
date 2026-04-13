"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  section: z.string().min(1, "Section is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  employeeId: string;
  employeeName: string;
  mode?: 'onboarding' | 'offboarding';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAdded?: () => void;
}

export function AddTaskModal({ employeeId, employeeName, mode = 'onboarding', open, onOpenChange, onTaskAdded }: Props) {
  const utils = trpc.useUtils();
  const [assigneeId, setAssigneeId] = useState<string>('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { section: 'General' },
  });

  const createOnboardingTask = trpc.onboarding.createTask.useMutation();
  const createOffboardingTask = trpc.onboarding.createOffboardingTask.useMutation();
  const { data: employees } = trpc.employee.list.useQuery(
    { limit: 100 },
    { enabled: open }
  );

  const isLoading = mode === 'onboarding' ? createOnboardingTask.isLoading : createOffboardingTask.isLoading;

  const onSubmit = async (values: FormValues) => {
    const payload = {
      employeeId,
      title: values.title,
      description: values.description,
      section: values.section,
      assigneeId: assigneeId || undefined,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
    };

    if (mode === 'onboarding') {
      await createOnboardingTask.mutateAsync(payload);
      utils.onboarding.listNewHires.invalidate();
    } else {
      await createOffboardingTask.mutateAsync(payload);
      utils.onboarding.listOffboarding.invalidate();
    }

    onTaskAdded?.();
    reset();
    setAssigneeId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add {mode === 'offboarding' ? 'Offboarding' : 'Onboarding'} Task for {employeeName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Task Title</label>
            <Input id="title" {...register("title")} placeholder="e.g., Collect passport copy" />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="section" className="block text-sm font-medium mb-1">Section</label>
            <Input id="section" {...register("section")} placeholder="e.g. Pre-arrival, First day" defaultValue="General" />
            {errors.section && <p className="text-xs text-red-600 mt-1">{errors.section.message}</p>}
          </div>
          <div>
            <label htmlFor="assignee" className="block text-sm font-medium mb-1">Assigned to</label>
            <select
              id="assignee"
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <option value="">No one assigned</option>
              {(employees?.employees ?? []).map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <Input id="description" {...register("description")} placeholder="Optional details..." />
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium mb-1">Due Date</label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
