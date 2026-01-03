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
import { SortableMessageItem } from './SortableMessageItem';
import { Plus } from 'lucide-react';

export function MessageList({ messages, setMessages }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setMessages((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addMessage = () => {
        setMessages([
            ...messages,
            { id: Date.now().toString(), content: '', media: null }
        ]);
    };

    const updateMessage = (id, field, value) => {
        setMessages(messages.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const deleteMessage = (id) => {
        if (messages.length === 1) return; // Prevent deleting last message
        setMessages(messages.filter(m => m.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Messages Sequence</h3>
                <span className="text-xs text-gray-500">Drag to reorder priority</span>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={messages.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {messages.map((msg, index) => (
                            <SortableMessageItem
                                key={msg.id}
                                id={msg.id}
                                index={index}
                                message={msg}
                                updateMessage={updateMessage}
                                removeMessage={deleteMessage}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <button
                type="button"
                onClick={addMessage}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-medium"
            >
                <Plus className="w-5 h-5" />
                Add Another Message
            </button>
        </div>
    );
}
