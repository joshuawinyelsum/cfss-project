with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('        {/* List Layout */}')
end_idx = content.find('          {loading && (')

if start_idx != -1 and end_idx != -1:
    new_ui = """        {/* Flat List UI */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {records.length === 0 && !loading ? (
            <div className="py-12 text-center bg-gray-50">
              <p className="text-gray-500 mb-2">No submitted surveys found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map(record => (
                <Link 
                  key={record.id}
                  href={`/surveys/${record.survey_type.toLowerCase()}/view/${record.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors group cursor-pointer gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 capitalize text-base">{record.survey_type.toLowerCase()} Survey</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded uppercase tracking-wide border border-emerald-100">Submitted</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">{getEntityLabel(record.survey_type)}: </span>
                        <span className="font-mono text-gray-600">{record.entity_id}</span>
                      </div>
                      <span className="hidden sm:inline text-gray-300">•</span>
                      <div className="hidden sm:block">
                        Submitted: {new Date(record.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex flex-col sm:items-end gap-1">
                    <div className="flex items-center gap-2">
                      {record.sync_status === 'synced' ? (
                         <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                           <Cloud size={14} /> Synced
                         </span>
                      ) : (
                         <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                           <RefreshCw size={14} /> Pending Sync
                         </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-400 group-hover:text-[#093C22] flex items-center gap-1">
                      View <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
"""
    content = content[:start_idx] + new_ui + content[end_idx:]
    with open('frontend/src/app/dashboard/surveys/submitted/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Submitted page UI updated successfully")
else:
    print("Could not find start/end indices")
