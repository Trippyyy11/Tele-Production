import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { SortableMediaList } from './SortableMediaList';
import { useState, useEffect } from 'react';
import { getCounterColor } from '../utils/uiUtils';

export function SortableMessageItem({ message, index, updateMessage, removeMessage }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: message.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Use local state for immediate feedback during DnD, but sync with parent
    const [mediaFiles, setMediaFiles] = useState([]);

    useEffect(() => {
        // Sync from props
        if (Array.isArray(message.media)) {
            setMediaFiles(message.media);
        } else if (message.media) {
            // Legacy or single file
            // We can't easily auto-generate an ID for a raw File object without mutating it or wrapping it.
            // Best to wrap it.
            const file = message.media;
            if (!file.id) { // If raw file
                setMediaFiles([{
                    id: `media-legacy-${index}`,
                    file: file,
                    preview: URL.createObjectURL(file)
                }]);
            } else {
                setMediaFiles([message.media]);
            }
        } else {
            setMediaFiles([]);
        }
    }, [message.media, index]);

    const handleContentChange = (e) => {
        updateMessage(message.id, 'content', e.target.value);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newMedia = files.map(f => {
            let mediaType = 'document';
            if (f.type.startsWith('image/')) mediaType = 'photo';
            else if (f.type.startsWith('video/')) mediaType = 'video';

            return {
                id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file: f,
                preview: mediaType === 'photo' ? URL.createObjectURL(f) : null,
                type: mediaType,
                name: f.name,
                size: f.size
            };
        });

        const updatedList = [...mediaFiles, ...newMedia];
        setMediaFiles(updatedList);
        updateMessage(message.id, 'media', updatedList);

        // Reset input
        e.target.value = '';
    };

    const handleMediaReorder = (newFiles) => {
        setMediaFiles(newFiles);
        updateMessage(message.id, 'media', newFiles);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-4 group relative hover:shadow-md transition-all"
        >
            {/* Header / Drag Handle */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:text-primary-600 text-gray-400 p-1 rounded transition-colors"
                >
                    <GripVertical className="w-5 h-5" />
                </button>
                <span className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                    Message #{index + 1}
                </span>
                <div className="flex-1" />
                <button
                    type="button"
                    onClick={() => removeMessage(message.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Text Content */}
            <div className="space-y-1">
                <textarea
                    placeholder={`Type content for message #${index + 1}...`}
                    value={message.content}
                    onChange={handleContentChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-transparent border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none transition-all resize-none text-sm"
                    maxLength={4096}
                />
                <div className={`text-[10px] text-right ${getCounterColor(message.content.length, 4096)}`}>
                    {message.content.length.toLocaleString()}/4,096
                </div>
            </div>

            {/* Media Section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors border border-gray-200">
                        <ImageIcon className="w-4 h-4 text-primary-500" />
                        <span>Add Images/Video</span>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,video/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
                        />
                    </label>

                    {mediaFiles.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            {mediaFiles.length} file(s) • Drag to reorder
                        </span>
                    )}
                </div>

                {/* Draggable Media List */}
                {mediaFiles.length > 0 && (
                    <SortableMediaList
                        mediaFiles={mediaFiles}
                        setMediaFiles={handleMediaReorder}
                    />
                )}
            </div>
        </div>
    );
}
