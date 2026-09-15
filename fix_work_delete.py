import re

with open('frontend/src/app/dashboard/work/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "Trash2" not in content:
    content = content.replace("ArrowRight, Clock", "ArrowRight, Clock, Trash2")

if "const handleDelete =" not in content:
    content = content.replace("const [loading, setLoading] = useState(true);", 
"""const [loading, setLoading] = useState(true);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete draft? This action cannot be undone.")) {
      try {
        await db.surveys.delete(id);
        setDrafts(drafts.filter(r => r.id !== id));
      } catch (err) {
        console.error("Failed to delete draft:", err);
      }
    }
  };
""")

content = content.replace("""                        <div className="shrink-0 flex items-center text-sm font-medium text-primary group-hover:underline">
                          Continue <ArrowRight size={16} className="ml-1" />
                        </div>""",
"""                        <div className="shrink-0 flex items-center gap-3 text-sm font-medium text-primary">
                          <button 
                            onClick={(e) => handleDelete(e, record.id as number)}
                            className="text-muted hover:text-status-error p-2 rounded-full hover:bg-status-error/10 transition-colors"
                            title="Delete draft"
                          >
                            <Trash2 size={16} />
                          </button>
                          <span className="group-hover:underline flex items-center">Continue <ArrowRight size={16} className="ml-1" /></span>
                        </div>""")

with open('frontend/src/app/dashboard/work/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Work workspace deletion added")
