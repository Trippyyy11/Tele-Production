import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableChannelItem } from './SortableChannelItem';

export function ChannelPriorityList({ channels, setOrderedChannels }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setOrderedChannels((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Channel Priority Sequence</h3>
                <span className="text-xs text-gray-500">Drag to reorder sending priority</span>
            </div>

            <div className="max-h-64 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={channels.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2 p-2">
                            {channels.map((channel, index) => (
                                <SortableChannelItem
                                    key={channel.id}
                                    id={channel.id}
                                    name={channel.name}
                                    index={index}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                {channels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <p className="text-sm">No channels selected</p>
                        <p className="text-xs">Select channels from the folders above</p>
                    </div>
                )}
            </div>
        </div>
    );
}
