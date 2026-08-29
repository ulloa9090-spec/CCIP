export const ComingSoon = ({ title, phase }: { title: string; phase: number }) => (
  <div className="mx-auto max-w-lg py-16 text-center">
    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
      This screen is planned for <strong>Phase {phase}</strong> of the build (see docs/ARCHITECTURE.md). Phases 1-2 are
      live: Dashboard, Enrollment, Tuition, Staffing, Payroll, Expenses, and Break-Even.
    </p>
  </div>
)
