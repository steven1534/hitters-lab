export const categoryConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  "Hitting": {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    label: "Hitting"
  },
};

export const getCategoryConfig = (category: string) => {
  return categoryConfig[category] || {
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-900",
    label: category
  };
};
