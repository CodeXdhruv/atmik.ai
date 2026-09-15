"use client";

import { useState, useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";
import { 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X,
  Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, Infinity as InfinityIcon, Network, Layers, Boxes, Sparkles, Orbit, Asterisk, Focus, Zap, Hexagon, Triangle, Circle, Sun, Moon, Heart, Compass, Lightbulb, Book, BookOpen, Smile, Shield, Star, Flower, Leaf, Globe, Target, Sunrise
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { Category } from "@/services/mockData";

const ICON_MAP: Record<string, React.ElementType> = {
  Folder, Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, Infinity: InfinityIcon, InfinityIcon, Network, Layers, Boxes, Sparkles, Orbit, Asterisk, Focus, Zap, Hexagon, Triangle, Circle, Sun, Moon, Heart, Compass, Lightbulb, Book, BookOpen, Smile, Shield, Star, Flower, Leaf, Globe, Target, Sunrise
};
const AVAILABLE_ICONS = Object.keys(ICON_MAP).filter(k => k !== "Infinity");

export default function CategoriesPage() {
  const { categories, fetchCategories, addCategory, renameCategory, deleteCategory } = useAdminStore();
  const [newCatName, setNewCatName] = useState("");
  const [parentCatId, setParentCatId] = useState<string>("");
  const [newCatIcon, setNewCatIcon] = useState("Folder");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Folder");

  // Subcategory Add State
  const [addingSubToId, setAddingSubToId] = useState<string | null>(null);
  const [subCatName, setSubCatName] = useState("");
  const [subCatIcon, setSubCatIcon] = useState("Folder");

  const handleAddRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await addCategory(newCatName, parentCatId ? parentCatId : null, newCatIcon);
      setNewCatName("");
      setParentCatId("");
      setNewCatIcon("Folder");
      toast.success(`Category "${newCatName}" created successfully!`);
    } catch (err) {
      toast.error(`Failed to create category`);
    }
  };

  const handleAddSub = async (parentId: string) => {
    if (!subCatName.trim()) return;
    try {
      await addCategory(subCatName, parentId, subCatIcon);
      setSubCatName("");
      setSubCatIcon("Folder");
      setAddingSubToId(null);
      toast.success(`Sub-category created!`);
    } catch (err) {
      toast.error(`Failed to create sub-category`);
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await renameCategory(id, editName, editIcon);
      setEditingId(null);
      setEditName("");
      setEditIcon("Folder");
      toast.success("Category updated successfully!");
    } catch (err) {
      toast.error("Failed to update category");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? All sub-categories will be removed as well.")) {
      try {
        await deleteCategory(id);
        toast.success("Category removed!");
      } catch (err) {
        toast.error("Failed to remove category");
      }
    }
  };

  // Render a single category node recursively
  const renderCategoryNode = (cat: Category, depth = 0) => {
    const isEditing = editingId === cat.id;
    const isAddingSub = addingSubToId === cat.id;
    const hasChildren = cat.children && cat.children.length > 0;

    return (
      <div key={cat.id} className="space-y-1.5 font-ui">
        {/* Row Card */}
        <div 
          className="flex items-center justify-between p-3.5 bg-white border border-border-custom hover:border-accent-gold/25 rounded-xl transition-all duration-200"
          style={{ marginLeft: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {(() => {
              const IconComp = cat.icon && ICON_MAP[cat.icon] ? ICON_MAP[cat.icon] : Folder;
              return <IconComp size={16} className="text-accent-gold flex-shrink-0" />;
            })()}
            
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-2.5 py-1 bg-background border border-border-custom rounded text-xs text-primary-navy outline-none focus:border-accent-gold/40 flex-1 min-w-[120px]"
                  autoFocus
                />
                <select
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="px-2 py-1 bg-background border border-border-custom rounded text-xs text-primary-navy outline-none focus:border-accent-gold/40 cursor-pointer"
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleSaveRename(cat.id)}
                  className="p-1 rounded bg-success/10 text-success hover:bg-success hover:text-white cursor-pointer transition-colors"
                  title="Save"
                >
                  <Check size={12} />
                </button>
                <button 
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded bg-primary-navy/5 text-primary-navy/50 hover:bg-primary-navy/10 cursor-pointer transition-colors"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary-navy truncate">{cat.name}</p>
                <p className="text-[9px] text-primary-navy/35 font-light truncate">/{cat.slug || cat.id}</p>
              </div>
            )}
          </div>

          {/* Action Tools */}
          {!isEditing && (
            <div className="flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
              {/* Add sub */}
              <button
                onClick={() => {
                  setAddingSubToId(cat.id);
                  setSubCatName("");
                  setSubCatIcon("Folder");
                }}
                className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/50 hover:text-accent-gold cursor-pointer transition-colors"
                title="Add Sub-category"
              >
                <Plus size={13} />
              </button>
              
              {/* Rename / Edit */}
              <button
                onClick={() => {
                  setEditingId(cat.id);
                  setEditName(cat.name);
                  setEditIcon(cat.icon || "Folder");
                }}
                className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/50 hover:text-primary-navy cursor-pointer transition-colors"
                title="Edit Category"
              >
                <Edit2 size={13} />
              </button>

              {/* Move up / down arrows simulating reordering */}
              <button
                className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/30 hover:text-primary-navy cursor-pointer transition-colors"
                title="Move Up"
              >
                <ArrowUp size={13} />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/30 hover:text-primary-navy cursor-pointer transition-colors"
                title="Move Down"
              >
                <ArrowDown size={13} />
              </button>

              <div className="w-[1px] h-3.5 bg-border-custom/80 mx-1" />

              {/* Delete */}
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 rounded-lg hover:bg-danger/5 text-danger/70 hover:text-danger cursor-pointer transition-colors"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Inline Add Sub-category Input Form */}
        {isAddingSub && (
          <div 
            className="p-3 bg-background border border-dashed border-accent-gold/30 rounded-xl flex items-center gap-2 flex-wrap"
            style={{ marginLeft: `${(depth + 1) * 28}px` }}
          >
            <input
              type="text"
              placeholder="Sub-category name..."
              value={subCatName}
              onChange={(e) => setSubCatName(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-border-custom rounded-lg text-xs text-primary-navy outline-none focus:border-accent-gold/40 min-w-[120px]"
            />
            <select
              value={subCatIcon}
              onChange={(e) => setSubCatIcon(e.target.value)}
              className="px-2 py-1.5 bg-white border border-border-custom rounded-lg text-xs text-primary-navy outline-none focus:border-accent-gold/40 cursor-pointer"
            >
              {AVAILABLE_ICONS.map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
            <button
              onClick={() => handleAddSub(cat.id)}
              className="px-3 py-1.5 bg-primary-navy text-white text-xs rounded-lg font-semibold cursor-pointer hover:bg-primary-navy/90"
            >
              Add
            </button>
            <button
              onClick={() => setAddingSubToId(null)}
              className="p-1.5 hover:bg-primary-navy/5 rounded-lg text-primary-navy/40"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Children Render recursion */}
        {hasChildren && cat.children?.map(child => renderCategoryNode(child, depth + 1))}
      </div>
    );
  };

  // Flat helper list of all categories for the parent selector dropdown
  const getFlatCategoriesList = (list: Category[], prefix = ""): { id: string; name: string }[] => {
    let result: { id: string; name: string }[] = [];
    list.forEach(cat => {
      result.push({ id: cat.id, name: `${prefix}${cat.name}` });
      if (cat.children && cat.children.length > 0) {
        result = [...result, ...getFlatCategoriesList(cat.children, `${prefix}${cat.name} > `)];
      }
    });
    return result;
  };

  const flatCategories = getFlatCategoriesList(categories);

  return (
    <div className="space-y-6 select-none font-ui relative">
      <Toaster position="top-right" />

      {/* Header Row */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Categories Tree</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Structure and arrange content categories in hierarchical orders.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Category Tree List - Spans 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Category Directory Tree
            </h3>

            <div className="space-y-3 pt-2">
              {categories.length > 0 ? (
                categories.map(cat => renderCategoryNode(cat, 0))
              ) : (
                <div className="py-12 text-center text-primary-navy/30 text-xs">
                  No categories found. Use the panel on the right to create one.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Creator Form */}
        <div className="space-y-6">
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Create Category
            </h3>

            <form onSubmit={handleAddRoot} className="space-y-4 pt-2">
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Mindfulness"
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
                />
              </div>

              {/* Icon Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Category Icon *
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-gold/10 text-accent-gold flex items-center justify-center border border-accent-gold/20 flex-shrink-0">
                    {(() => {
                      const SelectedIcon = ICON_MAP[newCatIcon] || Folder;
                      return <SelectedIcon size={18} />;
                    })()}
                  </div>
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy focus:border-accent-gold/40 outline-none cursor-pointer"
                  >
                    {AVAILABLE_ICONS.map(iconName => (
                      <option key={iconName} value={iconName}>
                        {iconName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parent Category Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Parent Category (Optional)
                </label>
                <select
                  value={parentCatId}
                  onChange={(e) => setParentCatId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy focus:border-accent-gold/40 outline-none cursor-pointer"
                >
                  <option value="">None (Make Root Category)</option>
                  {flatCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-primary-navy hover:bg-primary-navy/90 text-white rounded-button text-xs font-semibold shadow-soft hover:shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FolderPlus size={15} />
                <span>Create Category</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
