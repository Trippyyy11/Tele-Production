import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Image as ImageIcon, Film, FileText, FileJson, Archive, File as FileIcon } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';

export function SortableMediaList({ mediaFiles, setMediaFiles }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = mediaFiles.findIndex(f => f.id === active.id);
            const newIndex = mediaFiles.findIndex(f => f.id === over.id);

            const newFiles = [...mediaFiles];
            const [moved] = newFiles.splice(oldIndex, 1);
            newFiles.splice(newIndex, 0, moved);

            setMediaFiles(newFiles);
        }
    };

    // Ensure mediaFiles have IDs. If they are raw files, we might wrap them?
    // Parent should pass array of { id, file, url } objects ideally.
    // If passed simple files, we can't key them easily for DnD unless we map them first.
    // Assuming mediaFiles is [{ id: '...', file: File, preview: 'blob:...' }, ...]

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-3 gap-2 mt-3">
                <SortableContext
                    items={mediaFiles.map(m => m.id)}
                    strategy={rectSortingStrategy}
                >
                    {mediaFiles.map((media) => (
                        <SortableMediaItem
                            key={media.id}
                            media={media}
                            onRemove={() => setMediaFiles(mediaFiles.filter(m => m.id !== media.id))}
                        />
                    ))}
                </SortableContext>
            </div>
        </DndContext>
    );
}

function SortableMediaItem({ media, onRemove }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: media.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isVideo = media.type === 'video';
    const isPhoto = media.type === 'photo';
    const isDocument = media.type === 'document';

    const getFileIcon = () => {
        const name = (media.name || '').toLowerCase();
        if (name.endsWith('.pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return <Archive className="w-8 h-8 text-amber-500" />;
        if (name.endsWith('.json')) return <FileJson className="w-8 h-8 text-blue-500" />;
        return <FileIcon className="w-8 h-8 text-gray-500" />;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
        >
            {/* Preview */}
            {isPhoto && media.preview ? (
                <img src={media.preview} alt="preview" className="w-full h-full object-cover" />
            ) : isVideo && media.preview ? (
                <video src={media.preview} className="w-full h-full object-cover" muted />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gray-100">
                    {getFileIcon()}
                    <span className="text-[10px] font-bold text-gray-500 truncate w-full mt-1 px-1">
                        {media.name || 'File'}
                    </span>
                    <span className="text-[8px] text-gray-400">
                        {media.size ? `${(media.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                <div {...attributes} {...listeners} className="p-1 bg-white/20 rounded hover:bg-white/40 cursor-grab active:cursor-grabbing text-white">
                    <GripVertical className="w-4 h-4" />
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="p-1 bg-red-500/80 rounded hover:bg-red-500 text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Type Icon Badge */}
            <div className="absolute bottom-1 right-1 p-1 bg-black/60 rounded text-white text-[10px] z-10">
                {isVideo ? <Film className="w-3 h-3" /> : isPhoto ? <ImageIcon className="w-3 h-3" /> : <FileIcon className="w-3 h-3" />}
            </div>
        </div>
    );
}
