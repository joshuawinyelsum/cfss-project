import re

with open('frontend/src/app/dashboard/surveys/drafts/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "Trash2" not in content:
    content = content.replace("ArrowRight } from 'lucide-react'", "ArrowRight, Trash2 } from 'lucide-react'")

if "const [deletingId, setDeletingId]" not in content:
    content = content.replace("const [loading, setLoading] = useState(true);", 
"""const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete draft? This action cannot be undone.")) {
      try {
        await db.surveys.delete(id);
        setRecords(records.filter(r => r.id !== id));
        setTotal(total - 1);
      } catch (err) {
        console.error("Failed to delete draft:", err);
      }
    }
  };
""")

content = content.replace("""                  <div className="shrink-0 flex items-center sm:justify-end">
                    <div className="text-sm font-medium text-primary flex items-center gap-1 group-hover:underline">
                      Continue <ArrowRight size={16} />
                    </div>
                  </div>""",
"""                  <div className="shrink-0 flex items-center sm:justify-end gap-3">
                    <button 
                      onClick={(e) => handleDelete(e, record.id as number)}
                      className="text-muted hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="text-sm font-medium text-primary flex items-center gap-1 group-hover:underline">
                      Continue <ArrowRight size={16} />
                    </div>
                  </div>""")

with open('frontend/src/app/dashboard/surveys/drafts/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Drafts deletion added")
