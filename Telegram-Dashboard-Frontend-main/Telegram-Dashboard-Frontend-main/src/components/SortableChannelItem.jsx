import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export function SortableChannelItem({ id, name, index }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab hover:text-primary-600 text-gray-400 p-1 rounded"
            >
                <GripVertical className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold text-gray-500">#{index + 1}</span>
            <span className="font-medium text-sm text-gray-700 truncate">{name}</span>
        </div>
    );
}
