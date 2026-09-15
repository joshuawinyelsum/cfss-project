with open('frontend/src/app/dashboard/surveys/drafts/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('        {/* List Layout */}')
end_idx = content.find('          {loading && (')

if start_idx != -1 and end_idx != -1:
    new_ui = """        {/* Flat List UI */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {records.length === 0 && !loading ? (
            <div className="py-12 text-center bg-gray-50">
              <p className="text-gray-500 mb-2">No drafts found.</p>
              <Link href="/surveys" className="text-[#093C22] hover:underline text-sm font-medium">Start a new survey</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map(record => (
                <Link 
                  key={record.id}
                  href={`/surveys/${record.survey_type.toLowerCase()}/fill/${record.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors group cursor-pointer gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 capitalize text-base">{record.survey_type.toLowerCase()} Survey</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded uppercase tracking-wide border border-amber-100">Draft</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium text-gray-900">{getEntityLabel(record.survey_type)}: </span>
                        <span className="font-mono text-gray-600">{record.entity_id}</span>
                      </div>
                      <span className="hidden sm:inline text-gray-300">•</span>
                      <div className="hidden sm:block">
                        Updated: {new Date(record.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-full sm:w-48 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#093C22] h-1.5 rounded-full transition-all" style={{ width: `${record.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{record.progress}%</span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center sm:justify-end">
                    <div className="text-sm font-medium text-[#093C22] flex items-center gap-1 group-hover:underline">
                      Continue <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
"""
    content = content[:start_idx] + new_ui + content[end_idx:]
    with open('frontend/src/app/dashboard/surveys/drafts/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Drafts page UI updated successfully")
else:
    print("Could not find start/end indices")
