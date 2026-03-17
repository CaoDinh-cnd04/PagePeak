import { useParams } from "react-router-dom";

export function DashboardEditorPage() {
  const { id } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Editor</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">Trang editor ID: {id} - đang phát triển.</p>
      </div>
    </div>
  );
}
