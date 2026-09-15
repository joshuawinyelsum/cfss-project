import re

with open('frontend/src/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We'll replace everything from `return (` onwards to redesign the Home screen.
start_idx = content.find("  return (\n    <div className=")
if start_idx == -1:
    print("Could not find start index")
    exit(1)

new_jsx = """  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.full_name}</h1>
          <p className="text-sm text-gray-500 mt-1">Here is your fieldwork overview.</p>
        </div>
        {loading && <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />}
      </div>

      {error ? (
        <div className="bg-red-50 p-6 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="text-red-800 font-medium">Unable to load dashboard data</h3>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Fieldwork Summary - Flat UI (Level 3) */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <Link href="/surveys" className="p-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats?.total_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/surveys/drafts" className="p-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Drafts</p>
                <p className="text-2xl font-bold text-[#093C22]">{dashboardStats?.draft_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/surveys/submitted" className="p-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submitted</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats?.submitted_surveys || 0}</p>
              </Link>
              <Link href="/dashboard/sync" className="p-4 hover:bg-gray-50 transition-colors">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Pending Sync</p>
                <p className="text-2xl font-bold text-amber-600">{dashboardStats?.pending_sync || 0}</p>
              </Link>
            </div>
          </section>

          {/* Primary Call to Action */}
          <section>
             <Link 
               href="/surveys" 
               className="flex items-center justify-between bg-[#093C22] text-white p-5 rounded-xl hover:bg-[#072f1b] transition-colors shadow-sm"
             >
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                   <PlusSquare size={24} className="text-white" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold">Start New Collection</h2>
                   <p className="text-sm text-emerald-100 mt-0.5">Choose a survey type to begin fieldwork</p>
                 </div>
               </div>
               <ArrowRight size={24} className="text-emerald-100 hidden sm:block" />
             </Link>
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Activity */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
                <Link href="/dashboard/surveys/drafts" className="text-sm font-medium text-[#093C22] hover:underline">
                  View Drafts
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {dashboardStats?.recent_surveys?.length > 0 ? (
                  dashboardStats.recent_surveys.map((survey: any) => (
                    <Link 
                      href={`/surveys/${survey.survey_type.toLowerCase()}/${survey.status === 'SUBMITTED' ? 'view' : 'fill'}/${survey.id}`}
                      key={survey.id} 
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                        {survey.survey_type === 'HOUSEHOLD' ? <Home size={20} /> : 
                         survey.survey_type === 'HEALTH' ? <Heart size={20} /> :
                         survey.survey_type === 'EDUCATION' ? <Book size={20} /> :
                         <ClipboardList size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {survey.survey_type} Survey #{survey.entity_id || survey.id.slice(0, 8)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            survey.status === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {survey.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {survey.updated_at ? formatDistanceToNow(new Date(survey.updated_at), { addSuffix: true }) : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500">No recent activity.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Community Overview */}
            <section className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-bold text-gray-900">Community Context</h2>
              </div>
              <div className="p-0 divide-y divide-gray-100">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Households</span>
                  </div>
                  <span className="font-bold text-gray-900">{communityStats?.summary?.household?.total || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <PlusSquare size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Health Facilities</span>
                  </div>
                  <span className="font-bold text-gray-900">{communityStats?.summary?.health?.hospitals || 0}</span>
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Droplet size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Water Points</span>
                  </div>
                  <span className="font-bold text-gray-900">{communityStats?.summary?.water?.boreholes || 0}</span>
                </div>
              </div>
            </section>

          </div>
        </>
      )}
    </div>
  );
}
"""

content = content[:start_idx] + new_jsx

with open('frontend/src/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Home page updated successfully!")
