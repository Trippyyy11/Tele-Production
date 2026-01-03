import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, Folder, MessageSquare, Search, X } from 'lucide-react';

export function FolderTreeSelector({ folders, selectedConfig, onSelectionChange, entitiesMap }) {
    const [expandedFolders, setExpandedFolders] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    // Filter logic
    const filteredFolders = useMemo(() => {
        if (!searchTerm.trim()) return folders;
        const lowerTerm = searchTerm.toLowerCase();

        return folders.map(folder => {
            const matchesFolder = folder.name.toLowerCase().includes(lowerTerm);

            // Filter entities inside
            const folderEntities = folder.entityIds || [];
            const matchingEntities = folderEntities.filter(ent => {
                // Resolve name
                const entityId = typeof ent === 'object' ? ent._id : ent;
                let name = 'Unknown Channel';
                if (entitiesMap && entitiesMap.has(entityId)) {
                    name = entitiesMap.get(entityId).name || entitiesMap.get(entityId).username || '';
                } else if (typeof ent === 'object') {
                    name = ent.name || ent.username || '';
                }
                return name.toLowerCase().includes(lowerTerm);
            });

            if (matchesFolder || matchingEntities.length > 0) {
                return {
                    ...folder,
                    // If folder matches, show all? Or just matching? 
                    // Usually if folder matches, show all is good, but for precise search, let's keep all if folder matches, 
                    // ONLY matching entities if folder doesn't match but entities do.
                    // Let's stick to: If folder matches, keep original entities. If folder doesn't match, keep ONLY matching entities.
                    entityIds: matchesFolder ? folder.entityIds : matchingEntities
                };
            }
            return null;
        }).filter(Boolean);
    }, [folders, searchTerm, entitiesMap]);

    // Auto-expand if searching
    useMemo(() => {
        if (searchTerm.trim()) {
            const expandAll = {};
            filteredFolders.forEach(f => {
                expandAll[f._id] = true;
            });
            setExpandedFolders(expandAll);
        }
    }, [filteredFolders, searchTerm]);

    const toggleFolderExpand = (folderId) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const handleFolderCheck = (folder, isChecked) => {
        const folderEntityIds = folder.entityIds || [];
        const newSelected = new Set(selectedConfig);
        folderEntityIds.forEach(ent => {
            const id = typeof ent === 'object' ? ent._id : ent;
            if (isChecked) newSelected.add(id);
            else newSelected.delete(id);
        });
        onSelectionChange(Array.from(newSelected));
    };

    const handleChannelCheck = (entityId, isChecked) => {
        const newSelected = new Set(selectedConfig);
        if (isChecked) newSelected.add(entityId);
        else newSelected.delete(entityId);
        onSelectionChange(Array.from(newSelected));
    };

    const handleSelectAll = () => {
        const allIds = new Set();
        filteredFolders.forEach(folder => {
            (folder.entityIds || []).forEach(ent => {
                const id = typeof ent === 'object' ? ent._id : ent;
                if (id) allIds.add(id);
            });
        });
        // Merge with existing selection if desired, or replace? 
        // "Select All" usually implies selecting everything visible.
        // Let's add visible to existing.
        const current = new Set(selectedConfig);
        allIds.forEach(id => current.add(id));
        onSelectionChange(Array.from(current));
    };

    const handleClearAll = () => {
        onSelectionChange([]);
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col h-full max-h-[500px]">
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Select Channels</h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[10px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded border border-primary-100 transition-colors"
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[10px] font-bold text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search folders or channels..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full text-gray-400"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-2 overflow-y-auto flex-1 space-y-1 custom-scrollbar">
                {filteredFolders.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No matches found
                    </div>
                ) : (
                    filteredFolders.map(folder => {
                        const entities = folder.entityIds || [];
                        const validEntities = entities.filter(e => e && (typeof e === 'object' ? e._id : e));
                        const selectedCount = validEntities.filter(e => selectedConfig.includes(typeof e === 'object' ? e._id : e)).length;

                        const isAllSelected = validEntities.length > 0 && selectedCount === validEntities.length;
                        const isIndeterminate = selectedCount > 0 && selectedCount < validEntities.length;

                        return (
                            <div key={folder._id} className="space-y-1">
                                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                                    <button
                                        type="button"
                                        onClick={() => toggleFolderExpand(folder._id)}
                                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                                    >
                                        {expandedFolders[folder._id] ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </button>

                                    <div className="flex items-center gap-2 flex-1 cursor-pointer select-none" onClick={() => !validEntities.length ? null : handleFolderCheck(folder, !isAllSelected)}>
                                        <div className={`flex-shrink-0 w-5 h-5 border rounded flex items-center justify-center transition-colors ${isAllSelected || isIndeterminate ? 'bg-primary-500 border-primary-500' : 'border-gray-300 bg-white group-hover:border-primary-300'
                                            }`}>
                                            {isAllSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                            {isIndeterminate && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                        </div>
                                        <Folder className={`w-4 h-4 ${isAllSelected || isIndeterminate ? 'text-primary-500' : 'text-primary-300'}`} />
                                        <span className={`text-sm font-medium ${isAllSelected ? 'text-primary-700' : 'text-gray-700'}`}>{folder.name}</span>
                                        <span className="text-xs text-gray-400">({validEntities.length})</span>
                                    </div>
                                </div>

                                {expandedFolders[folder._id] && (
                                    <div className="pl-9 space-y-1 border-l-2 border-gray-100 ml-4 mb-2 animate-in slide-in-from-top-2 duration-200">
                                        {validEntities.map(entity => {
                                            const entityId = typeof entity === 'object' ? entity._id : entity;

                                            // Resolve Name using Map if available, else embedded, else placeholder
                                            let entityName = 'Unknown Channel';
                                            if (entitiesMap && entitiesMap.has(entityId)) {
                                                const mapEnt = entitiesMap.get(entityId);
                                                entityName = mapEnt.name || mapEnt.username || 'Unknown Channel';
                                            } else if (typeof entity === 'object') {
                                                entityName = entity.name || entity.username || 'Unknown Channel';
                                            } else {
                                                entityName = `Channel ID: ${entity.substr(0, 8)}...`;
                                            }

                                            const isChecked = selectedConfig.includes(entityId);

                                            return (
                                                <div key={entityId} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer group/item" onClick={() => handleChannelCheck(entityId, !isChecked)}>
                                                    <div className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-primary-500 border-primary-500' : 'border-gray-300 bg-white group-hover/item:border-primary-300'
                                                        }`}>
                                                        {isChecked && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <MessageSquare className={`w-3.5 h-3.5 ${isChecked ? 'text-primary-500' : 'text-gray-300'}`} />
                                                    <span className={`text-sm truncate select-none ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{entityName}</span>
                                                </div>
                                            );
                                        })}
                                        {validEntities.length === 0 && (
                                            <p className="text-xs text-gray-400 italic px-2">No channels in folder</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
