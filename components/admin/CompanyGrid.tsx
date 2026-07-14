import { Building2, ChevronRight, Mail, Map } from 'lucide-react';

interface CompanyGridProps {
  adminGroups: { user_id: string; company_name: string | null; email: string, company_logo: string | null }[];
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function CompanyGrid({ adminGroups, onSelect, loading }: CompanyGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-500" />
            Direktori Perusahaan (Klien)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pilih salah satu perusahaan di bawah ini untuk masuk ke mode kelola dan mengunggah peta untuk mereka.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/70 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm animate-pulse flex flex-col h-[180px]">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10"></div>
                <div className="flex-1 space-y-2 mt-1">
                  <div className="h-5 bg-slate-200 dark:bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-24"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10"></div>
              </div>
            </div>
          ))
        ) : (
          adminGroups.map((group) => (
          <button
            key={group.user_id}
            onClick={() => onSelect(group.user_id)}
            className="group flex flex-col text-left bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 dark:from-cyan-400/5 dark:to-blue-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                {group.company_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={group.company_logo} alt={group.company_name || 'Logo'} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                  {group.company_name || 'Tanpa Nama'}
                </h3>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  <Mail className="w-3 h-3 mr-1.5 shrink-0" />
                  <span className="truncate">{group.email}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
              <span className="inline-flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <Map className="w-3.5 h-3.5 mr-1.5" />
                Kelola Peta
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
          ))
        )}
        {!loading && adminGroups.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            Belum ada Klien (Admin) yang terdaftar.
          </div>
        )}
      </div>
    </div>
  );
}
